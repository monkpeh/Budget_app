import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { transactions, categoryRules } from '../db/schema';
import { eq, and, gte, lte, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateQuery, validateBody } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  accountId: z.string().uuid().optional(),
  minAmount: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
  maxAmount: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
  search: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
  sortBy: z.enum(['date', 'amount', 'name']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateSchema = z.object({
  userCategory: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  rememberCategory: z.boolean().optional(),
});

router.get('/', validateQuery(querySchema), async (req: AuthRequest, res: Response) => {
  try {
    const q = (req as any).validatedQuery;
    const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, req.userId!)];

    if (q.startDate) conditions.push(gte(transactions.date, q.startDate) as any);
    if (q.endDate) conditions.push(lte(transactions.date, q.endDate) as any);
    if (q.accountId) conditions.push(eq(transactions.accountId, q.accountId) as any);
    if (q.search) {
      conditions.push(or(
        ilike(transactions.name, `%${q.search}%`),
        ilike(transactions.merchantName, `%${q.search}%`)
      ) as any);
    }
    if (q.minAmount !== undefined) conditions.push(gte(transactions.amount, String(q.minAmount)) as any);
    if (q.maxAmount !== undefined) conditions.push(lte(transactions.amount, String(q.maxAmount)) as any);

    const colMap = {
      amount: transactions.amount,
      name: transactions.name,
      date: transactions.date,
    } as const;
    const col = colMap[q.sortBy as keyof typeof colMap];
    const orderBy = q.sortOrder === 'asc' ? asc(col) : desc(col);
    const offset = (q.page - 1) * q.limit;

    const [rows, countResult] = await Promise.all([
      db.select().from(transactions)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(q.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(transactions)
        .where(and(...conditions)),
    ]);

    res.json({
      transactions: rows,
      pagination: {
        page: q.page,
        limit: q.limit,
        total: Number(countResult[0].count),
        pages: Math.ceil(Number(countResult[0].count) / q.limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.patch('/:id', validateBody(updateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userCategory, notes, tags, rememberCategory } = req.body;

    const [existing] = await db.select().from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, req.userId!)));
    if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (userCategory !== undefined) updateData.userCategory = userCategory;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;

    const [updated] = await db.update(transactions).set(updateData)
      .where(eq(transactions.id, id)).returning();

    if (rememberCategory && userCategory && existing.merchantName) {
      await db.insert(categoryRules).values({
        userId: req.userId!,
        merchantPattern: existing.merchantName,
        category: userCategory,
      }).onConflictDoNothing();
    }

    res.json({ transaction: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.post('/export', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(transactions)
      .where(eq(transactions.userId, req.userId!))
      .orderBy(desc(transactions.date));

    const headers = ['Date', 'Name', 'Merchant', 'Amount', 'Currency', 'Category', 'Notes', 'Tags'];
    const csv = [
      headers.join(','),
      ...rows.map(t => [
        t.date,
        `"${t.name.replace(/"/g, '""')}"`,
        `"${(t.merchantName ?? '').replace(/"/g, '""')}"`,
        t.amount,
        t.currencyCode,
        `"${(t.userCategory ?? (t.category ?? []).join('/')).replace(/"/g, '""')}"`,
        `"${(t.notes ?? '').replace(/"/g, '""')}"`,
        `"${(t.tags ?? []).join(';')}"`,
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
