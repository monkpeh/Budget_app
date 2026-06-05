import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  Transaction as PlaidTransaction,
  RemovedTransaction,
} from 'plaid';
import { env } from '../config/env';
import { db } from '../db/connection';
import { plaidItems, accounts, transactions } from '../db/schema';
import { encrypt, decrypt } from './encryption';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const configuration = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export async function createLinkToken(userId: string): Promise<string> {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Budget Tracker',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: env.PLAID_WEBHOOK_URL,
  });
  return response.data.link_token;
}

export async function exchangePublicToken(
  publicToken: string,
  userId: string,
  metadata: { institution: { institution_id: string; name: string } | null }
) {
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const { access_token, item_id } = exchangeResponse.data;
  const accessTokenEncrypted = encrypt(access_token);

  let institutionLogo: string | null = null;
  if (metadata.institution?.institution_id) {
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id: metadata.institution.institution_id,
        country_codes: [CountryCode.Us],
        options: { include_optional_metadata: true },
      });
      institutionLogo = instResponse.data.institution.logo ?? null;
    } catch {
      // logo is optional
    }
  }

  const [plaidItem] = await db.insert(plaidItems).values({
    userId,
    itemId: item_id,
    accessTokenEncrypted,
    institutionId: metadata.institution?.institution_id,
    institutionName: metadata.institution?.name,
    institutionLogo,
  }).returning();

  const accountsResponse = await plaidClient.accountsGet({ access_token });

  for (const acc of accountsResponse.data.accounts) {
    await db.insert(accounts).values({
      userId,
      plaidItemId: plaidItem.id,
      plaidAccountId: acc.account_id,
      name: acc.name,
      officialName: acc.official_name ?? undefined,
      type: acc.type,
      subtype: acc.subtype ?? undefined,
      currentBalance: String(acc.balances.current ?? 0),
      availableBalance: acc.balances.available != null ? String(acc.balances.available) : undefined,
      currencyCode: acc.balances.iso_currency_code ?? 'USD',
      mask: acc.mask ?? undefined,
      institutionName: metadata.institution?.name,
    }).onConflictDoNothing();
  }

  syncTransactions(plaidItem.id).catch(console.error);

  return plaidItem;
}

export async function syncTransactions(plaidItemId: string) {
  const [item] = await db.select().from(plaidItems).where(eq(plaidItems.id, plaidItemId));
  if (!item) throw new Error('Plaid item not found');

  const accessToken = decrypt(item.accessTokenEncrypted);
  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  const added: PlaidTransaction[] = [];
  const modified: PlaidTransaction[] = [];
  const removed: RemovedTransaction[] = [];

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      options: { include_personal_finance_category: true },
    });
    const data = response.data;
    added.push(...data.added);
    modified.push(...data.modified);
    removed.push(...data.removed);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  const itemAccounts = await db.select().from(accounts)
    .where(eq(accounts.plaidItemId, plaidItemId));
  const accountMap = new Map(itemAccounts.map(a => [a.plaidAccountId, a.id]));

  for (const txn of added) {
    const accountId = accountMap.get(txn.account_id);
    if (!accountId) continue;
    await db.insert(transactions).values({
      userId: item.userId,
      accountId,
      plaidTransactionId: txn.transaction_id,
      name: txn.name,
      merchantName: txn.merchant_name ?? undefined,
      amount: String(txn.amount),
      currencyCode: txn.iso_currency_code ?? 'USD',
      date: txn.date,
      category: txn.category ?? [],
      plaidCategoryId: txn.category_id ?? undefined,
      pending: txn.pending,
    }).onConflictDoNothing();
  }

  for (const txn of modified) {
    const accountId = accountMap.get(txn.account_id);
    if (!accountId) continue;
    await db.update(transactions)
      .set({
        name: txn.name,
        merchantName: txn.merchant_name ?? undefined,
        amount: String(txn.amount),
        date: txn.date,
        category: txn.category ?? [],
        pending: txn.pending,
        updatedAt: new Date(),
      })
      .where(eq(transactions.plaidTransactionId, txn.transaction_id));
  }

  for (const txn of removed) {
    if (txn.transaction_id) {
      await db.delete(transactions)
        .where(eq(transactions.plaidTransactionId, txn.transaction_id));
    }
  }

  await db.update(plaidItems).set({
    cursor,
    lastSyncedAt: new Date(),
  }).where(eq(plaidItems.id, plaidItemId));

  await refreshBalances(plaidItemId);
}

export async function refreshBalances(plaidItemId: string) {
  const [item] = await db.select().from(plaidItems).where(eq(plaidItems.id, plaidItemId));
  if (!item) return;

  const accessToken = decrypt(item.accessTokenEncrypted);
  const response = await plaidClient.accountsGet({ access_token: accessToken });

  for (const acc of response.data.accounts) {
    await db.update(accounts)
      .set({
        currentBalance: String(acc.balances.current ?? 0),
        availableBalance: acc.balances.available != null ? String(acc.balances.available) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(accounts.plaidAccountId, acc.account_id));
  }
}

export function verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
  const signedJwt = headers['plaid-verification'];
  if (!signedJwt) return false;

  try {
    if (env.PLAID_ENV === 'sandbox') return true;

    const parts = signedJwt.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    return payload.request_body_sha256 === bodyHash;
  } catch {
    return false;
  }
}
