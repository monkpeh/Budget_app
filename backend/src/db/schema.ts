import {
  pgTable, uuid, varchar, text, boolean, timestamp, decimal, date, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const plaidItems = pgTable('plaid_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull().unique(),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  institutionId: varchar('institution_id', { length: 100 }),
  institutionName: varchar('institution_name', { length: 255 }),
  institutionLogo: text('institution_logo'),
  cursor: text('cursor'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plaidItemId: uuid('plaid_item_id').references(() => plaidItems.id, { onDelete: 'cascade' }),
  plaidAccountId: varchar('plaid_account_id', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  officialName: varchar('official_name', { length: 255 }),
  type: varchar('type', { length: 50 }).notNull(),
  subtype: varchar('subtype', { length: 50 }),
  currentBalance: decimal('current_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  availableBalance: decimal('available_balance', { precision: 12, scale: 2 }),
  currencyCode: varchar('currency_code', { length: 10 }).notNull().default('USD'),
  mask: varchar('mask', { length: 10 }),
  isManual: boolean('is_manual').notNull().default(false),
  institutionName: varchar('institution_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  plaidTransactionId: varchar('plaid_transaction_id', { length: 255 }).unique(),
  name: varchar('name', { length: 500 }).notNull(),
  merchantName: varchar('merchant_name', { length: 255 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar('currency_code', { length: 10 }).notNull().default('USD'),
  date: date('date').notNull(),
  category: text('category').array().default(sql`'{}'::text[]`),
  plaidCategoryId: varchar('plaid_category_id', { length: 100 }),
  userCategory: varchar('user_category', { length: 100 }),
  tags: text('tags').array().default(sql`'{}'::text[]`),
  notes: text('notes'),
  pending: boolean('pending').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userDateIdx: index('transactions_user_date_idx').on(t.userId, t.date),
  accountIdx: index('transactions_account_idx').on(t.accountId),
}));

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(),
  monthlyLimit: decimal('monthly_limit', { precision: 10, scale: 2 }).notNull(),
  rollover: boolean('rollover').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const categoryRules = pgTable('category_rules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  merchantPattern: varchar('merchant_pattern', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type PlaidItem = typeof plaidItems.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
