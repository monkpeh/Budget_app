import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { plaidItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
  verifyWebhookSignature,
} from '../services/plaid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const exchangeSchema = z.object({
  publicToken: z.string(),
  metadata: z.object({
    institution: z.object({
      institution_id: z.string(),
      name: z.string(),
    }).nullable(),
  }),
});

router.post('/create-link-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const linkToken = await createLinkToken(req.userId!);
    res.json({ linkToken });
  } catch (error) {
    console.error('Create link token error:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

router.post('/exchange-token', authMiddleware, validateBody(exchangeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { publicToken, metadata } = req.body;
    const plaidItem = await exchangePublicToken(publicToken, req.userId!, metadata);
    res.json({ success: true, itemId: plaidItem.id });
  } catch (error) {
    console.error('Exchange token error:', error);
    res.status(500).json({ error: 'Failed to connect account' });
  }
});

router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await db.select().from(plaidItems).where(eq(plaidItems.userId, req.userId!));
    await Promise.all(items.map(item => syncTransactions(item.id)));
    res.json({ success: true, synced: items.length });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const headers = req.headers as Record<string, string>;

  if (!verifyWebhookSignature(rawBody, headers)) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  const { webhook_type, webhook_code, item_id } = req.body;

  try {
    if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
      const [item] = await db.select().from(plaidItems).where(eq(plaidItems.itemId, item_id));
      if (item) {
        syncTransactions(item.id).catch(console.error);
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
