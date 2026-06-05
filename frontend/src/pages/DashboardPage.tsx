import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { NetWorthCard } from '../components/dashboard/NetWorthCard';
import { CashFlowCard } from '../components/dashboard/CashFlowCard';
import { SpendingDonut } from '../components/dashboard/SpendingDonut';
import { BudgetHealth } from '../components/dashboard/BudgetHealth';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AccountsOverview } from '../components/dashboard/AccountsOverview';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/plaid/sync'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">{format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
          icon={<RefreshCw size={13} />}
        >
          Sync
        </Button>
      </div>

      {/* Net Worth — full width */}
      <NetWorthCard data={data?.netWorth} loading={isLoading} />

      {/* Cash Flow + Spending Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashFlowCard data={data?.cashFlow} loading={isLoading} />
        <SpendingDonut data={data?.spendingByCategory} loading={isLoading} />
      </div>

      {/* Budget Health */}
      <BudgetHealth data={data?.budgetHealth} loading={isLoading} />

      {/* Recent Transactions + Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <RecentTransactions data={data?.recentTransactions} loading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <AccountsOverview data={data?.accounts} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
