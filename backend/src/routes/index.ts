import { Router } from 'express';
import authRoutes from './auth';
import plaidRoutes from './plaid';
import transactionRoutes from './transactions';
import accountRoutes from './accounts';
import dashboardRoutes from './dashboard';
import budgetRoutes from './budgets';
import analyticsRoutes from './analytics';
import insightsRoutes from './insights';
import userRoutes from './user';

const router = Router();

router.use('/auth', authRoutes);
router.use('/plaid', plaidRoutes);
router.use('/transactions', transactionRoutes);
router.use('/accounts', accountRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/budgets', budgetRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/insights', insightsRoutes);
router.use('/user', userRoutes);

router.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default router;
