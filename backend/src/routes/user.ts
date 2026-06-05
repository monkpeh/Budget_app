import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/connection';
import { users, accounts, transactions, budgets, plaidItems, refreshTokens, categoryRules } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, req.userId!));

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/change-password', validateBody(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

    const newHash = await bcrypt.hash(req.body.newPassword, 12);
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, req.userId!));

    res.json({ message: 'Password updated' });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Full data export as JSON
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const [userAccounts, userTransactions, userBudgets] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId)),
      db.select().from(budgets).where(eq(budgets.userId, userId)),
    ]);

    const [user] = await db.select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users).where(eq(users.id, userId));

    const format = req.query.format === 'csv' ? 'csv' : 'json';

    if (format === 'csv') {
      const headers = ['Date', 'Name', 'Merchant', 'Amount', 'Currency', 'Category', 'Account', 'Notes', 'Tags'];
      const csv = [
        headers.join(','),
        ...userTransactions.map(t => [
          t.date,
          `"${t.name.replace(/"/g, '""')}"`,
          `"${(t.merchantName ?? '').replace(/"/g, '""')}"`,
          t.amount,
          t.currencyCode,
          `"${(t.userCategory ?? (t.category ?? []).join('/')).replace(/"/g, '""')}"`,
          t.accountId,
          `"${(t.notes ?? '').replace(/"/g, '""')}"`,
          `"${(t.tags ?? []).join(';')}"`,
        ].join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="budget-tracker-export.csv"');
      res.send(csv);
    } else {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, email: user.email, memberSince: user.createdAt },
        accounts: userAccounts.map(a => ({
          id: a.id, name: a.name, type: a.type, subtype: a.subtype,
          balance: a.currentBalance, currency: a.currencyCode, isManual: a.isManual,
        })),
        transactions: userTransactions.map(t => ({
          id: t.id, date: t.date, name: t.name, merchant: t.merchantName,
          amount: t.amount, currency: t.currencyCode,
          category: t.userCategory ?? t.category?.[0] ?? 'Other',
          notes: t.notes, tags: t.tags, pending: t.pending,
        })),
        budgets: userBudgets.map(b => ({
          category: b.category, monthlyLimit: b.monthlyLimit, rollover: b.rollover,
        })),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="budget-tracker-export.json"');
      res.send(JSON.stringify(exportData, null, 2));
    }
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Delete account and all data (GDPR)
router.delete('/account', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Cascade deletes handle child rows due to ON DELETE CASCADE on all FK refs
    await db.delete(users).where(eq(users.id, userId));
    res.clearCookie('refreshToken');
    res.json({ message: 'Account and all data permanently deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
