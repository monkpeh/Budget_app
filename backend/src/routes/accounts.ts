import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { accounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const manualAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan', 'other']),
  subtype: z.string().optional(),
  currentBalance: z.number(),
  currencyCode: z.string().default('USD'),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, req.userId!));
    res.json({ accounts: userAccounts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/manual', validateBody(manualAccountSchema), async (req: AuthRequest, res: Response) => {
  try {
    const [account] = await db.insert(accounts).values({
      userId: req.userId!,
      name: req.body.name,
      type: req.body.type,
      subtype: req.body.subtype,
      currentBalance: String(req.body.currentBalance),
      currencyCode: req.body.currencyCode,
      isManual: true,
    }).returning();
    res.status(201).json({ account });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db.delete(accounts)
      .where(and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) { res.status(404).json({ error: 'Account not found' }); return; }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
