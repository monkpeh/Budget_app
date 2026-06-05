import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { budgets, transactions } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const budgetSchema = z.object({
  category: z.string().min(1),
  monthlyLimit: z.number().positive(),
  rollover: z.boolean().default(false),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const userBudgets = await db.select().from(budgets).where(eq(budgets.userId, req.userId!));

    const currentTxns = await db.select().from(transactions).where(
      and(
        eq(transactions.userId, req.userId!),
        gte(transactions.date, startOfMonth),
        lte(transactions.date, endOfMonth)
      )
    );

    const budgetsWithSpend = userBudgets.map(budget => {
      const spent = currentTxns
        .filter(t => {
          const cat = t.userCategory ?? (t.category?.[0] ?? '');
          return cat === budget.category && parseFloat(String(t.amount)) > 0;
        })
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
      const limit = parseFloat(String(budget.monthlyLimit));
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const remaining = Math.max(limit - spent, 0);
      return {
        ...budget,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percentage,
        status: percentage >= 100 ? 'over' : percentage >= 90 ? 'critical' : percentage >= 75 ? 'warning' : 'ok',
      };
    });

    res.json({ budgets: budgetsWithSpend });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

router.post('/', validateBody(budgetSchema), async (req: AuthRequest, res: Response) => {
  try {
    const [budget] = await db.insert(budgets).values({
      userId: req.userId!,
      category: req.body.category,
      monthlyLimit: String(req.body.monthlyLimit),
      rollover: req.body.rollover,
    }).returning();
    res.status(201).json({ budget });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.put('/:id', validateBody(budgetSchema), async (req: AuthRequest, res: Response) => {
  try {
    const [updated] = await db.update(budgets)
      .set({
        category: req.body.category,
        monthlyLimit: String(req.body.monthlyLimit),
        rollover: req.body.rollover,
        updatedAt: new Date(),
      })
      .where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.userId!)))
      .returning();
    if (!updated) { res.status(404).json({ error: 'Budget not found' }); return; }
    res.json({ budget: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db.delete(budgets)
      .where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) { res.status(404).json({ error: 'Budget not found' }); return; }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// Budget vs actual history (last 6 months)
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userBudgets = await db.select().from(budgets).where(eq(budgets.userId, req.userId!));
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const txns = await db.select().from(transactions).where(
        and(eq(transactions.userId, req.userId!), gte(transactions.date, start), lte(transactions.date, end))
      );

      const byCategory: Record<string, number> = {};
      for (const t of txns.filter(t => parseFloat(String(t.amount)) > 0)) {
        const cat = t.userCategory ?? (t.category?.[0] ?? 'Other');
        byCategory[cat] = (byCategory[cat] ?? 0) + parseFloat(String(t.amount));
      }

      months.push({ label, start, end, byCategory });
    }

    const result = userBudgets.map(budget => ({
      category: budget.category,
      limit: parseFloat(String(budget.monthlyLimit)),
      history: months.map(m => ({
        label: m.label,
        spent: Math.round((m.byCategory[budget.category] ?? 0) * 100) / 100,
      })),
    }));

    res.json({ history: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budget history' });
  }
});

export default router;
