import { Router } from 'express';
import authRoutes from './auth';
import plaidRoutes from './plaid';
import transactionRoutes from './transactions';
import accountRoutes from './accounts';
import dashboardRoutes from './dashboard';

const router = Router();

router.use('/auth', authRoutes);
router.use('/plaid', plaidRoutes);
router.use('/transactions', transactionRoutes);
router.use('/accounts', accountRoutes);
router.use('/dashboard', dashboardRoutes);

router.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default router;
