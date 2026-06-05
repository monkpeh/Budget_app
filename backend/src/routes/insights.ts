import { Router, Response } from 'express';
import { db } from '../db/connection';
import { transactions, accounts, budgets } from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ── helpers ────────────────────────────────────────────────────────────────

function monthRange(monthsAgo: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return {
    start: d.toISOString().split('T')[0],
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

// ── Financial health score ─────────────────────────────────────────────────

router.get('/health-score', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { start: m0start, end: m0end } = monthRange(0);
    const { start: m1start, end: m1end } = monthRange(1);

    const [userAccounts, userBudgets, currentTxns, lastTxns] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(budgets).where(eq(budgets.userId, userId)),
      db.select().from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, m0start), lte(transactions.date, m0end))),
      db.select().from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, m1start), lte(transactions.date, m1end))),
    ]);

    const income = currentTxns.filter(t => parseFloat(String(t.amount)) < 0)
      .reduce((s, t) => s + Math.abs(parseFloat(String(t.amount))), 0);
    const expenses = currentTxns.filter(t => parseFloat(String(t.amount)) > 0)
      .reduce((s, t) => s + parseFloat(String(t.amount)), 0);
    const lastExpenses = lastTxns.filter(t => parseFloat(String(t.amount)) > 0)
      .reduce((s, t) => s + parseFloat(String(t.amount)), 0);

    const savingsRate = income > 0 ? (income - expenses) / income : 0;
    const assets = userAccounts.filter(a => ['checking', 'savings', 'investment'].includes(a.type))
      .reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);
    const liabilities = userAccounts.filter(a => ['credit', 'loan'].includes(a.type))
      .reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);
    const netWorth = assets - liabilities;
    const debtToAsset = assets > 0 ? liabilities / assets : 1;

    const budgetsWithSpend = userBudgets.map(b => {
      const spent = currentTxns
        .filter(t => (t.userCategory ?? t.category?.[0] ?? '') === b.category && parseFloat(String(t.amount)) > 0)
        .reduce((s, t) => s + parseFloat(String(t.amount)), 0);
      return { limit: parseFloat(String(b.monthlyLimit)), spent };
    });
    const overBudgetRatio = budgetsWithSpend.length > 0
      ? budgetsWithSpend.filter(b => b.spent > b.limit).length / budgetsWithSpend.length : 0;

    const spendingTrend = lastExpenses > 0 ? (expenses - lastExpenses) / lastExpenses : 0;

    // Score components (each 0-100)
    const savingsScore = Math.min(Math.round(savingsRate * 250), 100); // 40%+ = 100
    const debtScore = Math.max(Math.round((1 - debtToAsset) * 100), 0);
    const budgetScore = Math.round((1 - overBudgetRatio) * 100);
    const spendingTrendScore = spendingTrend <= 0 ? 100 : Math.max(Math.round(100 - spendingTrend * 200), 0);
    const diversityScore = userAccounts.length >= 2 ? 100 : userAccounts.length * 50;

    const overall = Math.round(
      savingsScore * 0.30 +
      debtScore * 0.25 +
      budgetScore * 0.20 +
      spendingTrendScore * 0.15 +
      diversityScore * 0.10
    );

    const components = [
      { name: 'Savings Rate', score: savingsScore, weight: 30, detail: `${Math.round(savingsRate * 100)}% of income saved` },
      { name: 'Debt Health', score: debtScore, weight: 25, detail: debtToAsset > 0 ? `${Math.round(debtToAsset * 100)}% debt-to-asset ratio` : 'No liabilities' },
      { name: 'Budget Adherence', score: budgetScore, weight: 20, detail: budgetsWithSpend.length ? `${budgetsWithSpend.filter(b => b.spent <= b.limit).length}/${budgetsWithSpend.length} budgets on track` : 'No budgets set' },
      { name: 'Spending Trend', score: spendingTrendScore, weight: 15, detail: spendingTrend <= 0 ? 'Spending decreased vs last month' : `Spending up ${Math.round(spendingTrend * 100)}% vs last month` },
      { name: 'Account Diversity', score: diversityScore, weight: 10, detail: `${userAccounts.length} account${userAccounts.length !== 1 ? 's' : ''} connected` },
    ];

    const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F';

    res.json({ score: overall, grade, components });
  } catch (error) {
    console.error('Health score error:', error);
    res.status(500).json({ error: 'Failed to calculate health score' });
  }
});

// ── AI-style spending insights ─────────────────────────────────────────────

router.get('/spending-insights', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { start: m0start, end: m0end } = monthRange(0);
    const { start: m1start, end: m1end } = monthRange(1);
    const { start: m2start, end: m2end } = monthRange(2);

    const [currentTxns, lastTxns, prevTxns] = await Promise.all([
      db.select().from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, m0start), lte(transactions.date, m0end))),
      db.select().from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, m1start), lte(transactions.date, m1end))),
      db.select().from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, m2start), lte(transactions.date, m2end))),
    ]);

    const insights: Array<{ type: 'positive' | 'warning' | 'info'; title: string; body: string; amount?: number }> = [];

    const sumExpenses = (txns: typeof currentTxns) =>
      txns.filter(t => parseFloat(String(t.amount)) > 0).reduce((s, t) => s + parseFloat(String(t.amount)), 0);

    const currentTotal = sumExpenses(currentTxns);
    const lastTotal = sumExpenses(lastTxns);
    const prevTotal = sumExpenses(prevTxns);

    // Good month
    if (lastTotal > 0 && currentTotal < lastTotal * 0.9) {
      insights.push({
        type: 'positive',
        title: 'Great spending month',
        body: `You're spending ${Math.round((1 - currentTotal / lastTotal) * 100)}% less than last month. Keep it up!`,
        amount: lastTotal - currentTotal,
      });
    }

    // Spending spike
    if (lastTotal > 0 && currentTotal > lastTotal * 1.2) {
      insights.push({
        type: 'warning',
        title: 'Spending spike detected',
        body: `Your spending is up ${Math.round((currentTotal / lastTotal - 1) * 100)}% compared to last month.`,
        amount: currentTotal - lastTotal,
      });
    }

    // Category spikes
    const catTotal = (txns: typeof currentTxns) => {
      const m = new Map<string, number>();
      txns.filter(t => parseFloat(String(t.amount)) > 0).forEach(t => {
        const c = t.userCategory ?? t.category?.[0] ?? 'Other';
        m.set(c, (m.get(c) ?? 0) + parseFloat(String(t.amount)));
      });
      return m;
    };
    const curr = catTotal(currentTxns);
    const last = catTotal(lastTxns);

    for (const [cat, amt] of curr) {
      const lastAmt = last.get(cat) ?? 0;
      if (lastAmt > 50 && amt > lastAmt * 1.5) {
        insights.push({
          type: 'warning',
          title: `${cat} spending up`,
          body: `You've spent ${Math.round((amt / lastAmt - 1) * 100)}% more on ${cat} than last month.`,
          amount: amt - lastAmt,
        });
        if (insights.filter(i => i.type === 'warning').length >= 2) break;
      }
    }

    // Large individual transaction
    const largeThreshold = Math.max(lastTotal * 0.15, 200);
    const largeTxns = currentTxns.filter(t => parseFloat(String(t.amount)) > largeThreshold);
    if (largeTxns.length > 0) {
      const largest = largeTxns.sort((a, b) => parseFloat(String(b.amount)) - parseFloat(String(a.amount)))[0];
      insights.push({
        type: 'info',
        title: 'Large transaction flagged',
        body: `"${largest.merchantName ?? largest.name}" was your biggest charge this month.`,
        amount: parseFloat(String(largest.amount)),
      });
    }

    // Positive savings rate
    const income = currentTxns.filter(t => parseFloat(String(t.amount)) < 0)
      .reduce((s, t) => s + Math.abs(parseFloat(String(t.amount))), 0);
    if (income > 0) {
      const rate = Math.round(((income - currentTotal) / income) * 100);
      if (rate >= 20) {
        insights.push({
          type: 'positive',
          title: 'Strong savings rate',
          body: `You're saving ${rate}% of your income this month — well above the recommended 20%.`,
        });
      }
    }

    // Three-month downward trend
    if (prevTotal > 0 && lastTotal < prevTotal * 0.95 && currentTotal < lastTotal * 0.95) {
      insights.push({
        type: 'positive',
        title: '3-month spending decline',
        body: 'Your spending has decreased for three consecutive months. Excellent discipline!',
      });
    }

    res.json({ insights: insights.slice(0, 5) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// ── Net worth projection ───────────────────────────────────────────────────

router.get('/net-worth-projection', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));

    const assets = userAccounts.filter(a => ['checking', 'savings', 'investment'].includes(a.type))
      .reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);
    const liabilities = userAccounts.filter(a => ['credit', 'loan'].includes(a.type))
      .reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);
    const currentNetWorth = assets - liabilities;

    // Compute avg monthly savings over last 3 months
    const monthlySavings: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const { start, end } = monthRange(i);
      const txns = await db.select().from(transactions).where(
        and(eq(transactions.userId, userId), gte(transactions.date, start), lte(transactions.date, end))
      );
      const inc = txns.filter(t => parseFloat(String(t.amount)) < 0).reduce((s, t) => s + Math.abs(parseFloat(String(t.amount))), 0);
      const exp = txns.filter(t => parseFloat(String(t.amount)) > 0).reduce((s, t) => s + parseFloat(String(t.amount)), 0);
      monthlySavings.push(inc - exp);
    }
    const avgMonthlySavings = monthlySavings.reduce((a, b) => a + b, 0) / monthlySavings.length;

    const projection = [];
    const now = new Date();
    for (let i = 0; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      // Base + linear savings + 5% annual investment return on assets
      const monthlyReturn = assets > 0 ? (assets * 0.05) / 12 : 0;
      projection.push({
        label,
        netWorth: Math.round((currentNetWorth + avgMonthlySavings * i + monthlyReturn * i) * 100) / 100,
      });
    }

    res.json({
      currentNetWorth: Math.round(currentNetWorth * 100) / 100,
      avgMonthlySavings: Math.round(avgMonthlySavings * 100) / 100,
      projection,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate projection' });
  }
});

// ── Cash flow forecast ─────────────────────────────────────────────────────

router.get('/cash-flow-forecast', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    const currentMonthTxns = await db.select().from(transactions).where(
      and(eq(transactions.userId, userId), gte(transactions.date, startOfMonth), lte(transactions.date, endOfMonth))
    );

    const spentSoFar = currentMonthTxns.filter(t => parseFloat(String(t.amount)) > 0)
      .reduce((s, t) => s + parseFloat(String(t.amount)), 0);
    const incomeSoFar = currentMonthTxns.filter(t => parseFloat(String(t.amount)) < 0)
      .reduce((s, t) => s + Math.abs(parseFloat(String(t.amount))), 0);

    // Daily burn rate so far
    const daysPassed = Math.max(now.getDate() - 1, 1);
    const dailyBurn = spentSoFar / daysPassed;
    const projectedAdditionalSpend = dailyBurn * daysRemaining;
    const projectedMonthTotal = spentSoFar + projectedAdditionalSpend;

    // Checking account balance
    const checkingAccounts = await db.select().from(accounts).where(
      and(eq(accounts.userId, userId), eq(accounts.type, 'checking'))
    );
    const checkingBalance = checkingAccounts.reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);
    const projectedEndBalance = checkingBalance - projectedAdditionalSpend;

    const dailyForecast = [];
    for (let i = 0; i <= daysRemaining; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dailyForecast.push({
        label: d.toLocaleString('default', { month: 'short', day: 'numeric' }),
        projectedBalance: Math.round((checkingBalance - dailyBurn * i) * 100) / 100,
      });
    }

    res.json({
      spentSoFar: Math.round(spentSoFar * 100) / 100,
      incomeSoFar: Math.round(incomeSoFar * 100) / 100,
      projectedMonthTotal: Math.round(projectedMonthTotal * 100) / 100,
      checkingBalance: Math.round(checkingBalance * 100) / 100,
      projectedEndBalance: Math.round(projectedEndBalance * 100) / 100,
      dailyBurn: Math.round(dailyBurn * 100) / 100,
      daysRemaining,
      dailyForecast,
      riskLevel: projectedEndBalance < 0 ? 'high' : projectedEndBalance < checkingBalance * 0.1 ? 'medium' : 'low',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to forecast cash flow' });
  }
});

export default router;
