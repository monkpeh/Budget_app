import { Router, Response } from 'express';
import { db } from '../db/connection';
import { transactions, accounts } from '../db/schema';
import { eq, and, gte, lte, desc, sql, lt } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Spending trends: monthly totals per category over N months
router.get('/spending-trends', async (req: AuthRequest, res: Response) => {
  try {
    const months = parseInt(String(req.query.months ?? '6'), 10);
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const txns = await db.select().from(transactions).where(
        and(eq(transactions.userId, req.userId!), gte(transactions.date, start), lte(transactions.date, end))
      );

      const byCategory: Record<string, number> = {};
      let totalIncome = 0;
      let totalExpenses = 0;

      for (const t of txns) {
        const amt = parseFloat(String(t.amount));
        if (amt < 0) {
          totalIncome += Math.abs(amt);
        } else {
          totalExpenses += amt;
          const cat = t.userCategory ?? (t.category?.[0] ?? 'Other');
          byCategory[cat] = (byCategory[cat] ?? 0) + amt;
        }
      }

      result.push({
        label,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        byCategory: Object.fromEntries(
          Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
      });
    }

    res.json({ trends: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Top merchants by spend
router.get('/top-merchants', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const txns = await db.select().from(transactions).where(
      and(
        eq(transactions.userId, req.userId!),
        gte(transactions.date, startOfMonth),
        sql`${transactions.amount} > 0`
      )
    );

    const merchantTotals = new Map<string, { amount: number; count: number }>();
    for (const t of txns) {
      const name = t.merchantName ?? t.name;
      const existing = merchantTotals.get(name) ?? { amount: 0, count: 0 };
      merchantTotals.set(name, {
        amount: existing.amount + parseFloat(String(t.amount)),
        count: existing.count + 1,
      });
    }

    const sorted = Array.from(merchantTotals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 10)
      .map(([name, data]) => ({
        name,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }));

    res.json({ merchants: sorted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch merchant data' });
  }
});

// Subscription detector: recurring charges within ±3 days each month
router.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const txns = await db.select().from(transactions).where(
      and(
        eq(transactions.userId, req.userId!),
        gte(transactions.date, threeMonthsAgo.toISOString().split('T')[0]),
        sql`${transactions.amount} > 0`
      )
    ).orderBy(desc(transactions.date));

    // Group by merchant name, find those appearing ~monthly with similar amounts
    const byMerchant = new Map<string, typeof txns>();
    for (const t of txns) {
      const key = t.merchantName ?? t.name;
      const group = byMerchant.get(key) ?? [];
      group.push(t);
      byMerchant.set(key, group);
    }

    const subscriptions: Array<{
      name: string;
      amount: number;
      frequency: string;
      lastCharge: string;
      nextExpected: string;
    }> = [];

    for (const [name, group] of byMerchant) {
      if (group.length < 2) continue;

      const amounts = group.map(t => parseFloat(String(t.amount)));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const allSimilarAmount = amounts.every(a => Math.abs(a - avgAmount) < avgAmount * 0.05);

      if (!allSimilarAmount) continue;

      const dates = group.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
      if (dates.length < 2) continue;

      const gaps: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

      let frequency = '';
      if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
      else if (avgGap >= 6 && avgGap <= 8) frequency = 'weekly';
      else if (avgGap >= 13 && avgGap <= 16) frequency = 'biweekly';
      else if (avgGap >= 88 && avgGap <= 95) frequency = 'quarterly';
      else if (avgGap >= 360 && avgGap <= 370) frequency = 'annual';

      if (!frequency) continue;

      const lastDate = dates[dates.length - 1];
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + Math.round(avgGap));

      subscriptions.push({
        name,
        amount: Math.round(avgAmount * 100) / 100,
        frequency,
        lastCharge: lastDate.toISOString().split('T')[0],
        nextExpected: nextDate.toISOString().split('T')[0],
      });
    }

    subscriptions.sort((a, b) => b.amount - a.amount);
    res.json({ subscriptions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect subscriptions' });
  }
});

// Savings rate: (income - expenses) / income over last N months
router.get('/savings-rate', async (req: AuthRequest, res: Response) => {
  try {
    const months = 6;
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const txns = await db.select().from(transactions).where(
        and(eq(transactions.userId, req.userId!), gte(transactions.date, start), lte(transactions.date, end))
      );

      const income = txns.filter(t => parseFloat(String(t.amount)) < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount))), 0);
      const expenses = txns.filter(t => parseFloat(String(t.amount)) > 0)
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

      const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
      result.push({ label, income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100, savingsRate });
    }

    res.json({ savingsRate: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch savings rate' });
  }
});

export default router;
