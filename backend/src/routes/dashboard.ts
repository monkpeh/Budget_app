import { Router, Response } from 'express';
import { db } from '../db/connection';
import { accounts, transactions, budgets } from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [userAccounts, currentMonthTxns, lastMonthTxns, userBudgets, recentTxns] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(transactions).where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, startOfMonth),
        lte(transactions.date, endOfMonth)
      )),
      db.select().from(transactions).where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, startOfLastMonth),
        lte(transactions.date, endOfLastMonth)
      )),
      db.select().from(budgets).where(eq(budgets.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.date)).limit(10),
    ]);

    const assets = userAccounts
      .filter(a => ['checking', 'savings', 'investment'].includes(a.type))
      .reduce((sum, a) => sum + parseFloat(String(a.currentBalance)), 0);
    const liabilities = userAccounts
      .filter(a => ['credit', 'loan'].includes(a.type))
      .reduce((sum, a) => sum + parseFloat(String(a.currentBalance)), 0);

    const currentIncome = currentMonthTxns
      .filter(t => parseFloat(String(t.amount)) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount))), 0);
    const currentExpenses = currentMonthTxns
      .filter(t => parseFloat(String(t.amount)) > 0)
      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

    const lastIncome = lastMonthTxns
      .filter(t => parseFloat(String(t.amount)) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount))), 0);
    const lastExpenses = lastMonthTxns
      .filter(t => parseFloat(String(t.amount)) > 0)
      .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

    const categoryTotals = new Map<string, number>();
    for (const txn of currentMonthTxns.filter(t => parseFloat(String(t.amount)) > 0)) {
      const cat = txn.userCategory ?? (txn.category?.[0] ?? 'Other');
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + parseFloat(String(txn.amount)));
    }
    const totalSpend = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);
    const spendingByCategory = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
      }));

    const budgetHealth = userBudgets.map(budget => {
      const spent = currentMonthTxns
        .filter(t => {
          const cat = t.userCategory ?? (t.category?.[0] ?? '');
          return cat === budget.category && parseFloat(String(t.amount)) > 0;
        })
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      const limit = parseFloat(String(budget.monthlyLimit));
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        category: budget.category,
        spent: Math.round(spent * 100) / 100,
        limit,
        percentage: Math.round(percentage),
        status: percentage >= 100 ? 'over' : percentage >= 90 ? 'critical' : percentage >= 75 ? 'warning' : 'ok',
      };
    });

    res.json({
      netWorth: {
        total: Math.round((assets - liabilities) * 100) / 100,
        assets: Math.round(assets * 100) / 100,
        liabilities: Math.round(liabilities * 100) / 100,
      },
      cashFlow: {
        income: Math.round(currentIncome * 100) / 100,
        expenses: Math.round(currentExpenses * 100) / 100,
        lastMonth: {
          income: Math.round(lastIncome * 100) / 100,
          expenses: Math.round(lastExpenses * 100) / 100,
        },
      },
      spendingByCategory,
      recentTransactions: recentTxns,
      accounts: userAccounts,
      budgetHealth,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
