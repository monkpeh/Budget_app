import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingDown } from 'lucide-react';
import api from '../lib/api';
import { BudgetCard } from '../components/budgets/BudgetCard';
import { BudgetModal } from '../components/budgets/BudgetModal';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';

interface Budget {
  id: string;
  category: string;
  monthlyLimit: string;
  rollover: boolean;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'critical' | 'over';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-white/60 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

export function BudgetsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets').then(r => r.data.budgets as Budget[]),
  });

  const { data: historyData } = useQuery({
    queryKey: ['budget-history'],
    queryFn: () => api.get('/budgets/history').then(r => r.data.history),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/budgets', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/budgets/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleSave = async (formData: any) => {
    if (editingBudget) {
      await updateMutation.mutateAsync({ id: editingBudget.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingBudget(null);
    setModalOpen(true);
  };

  // Build chart data from history
  const chartData = historyData?.[0]?.history?.map((_: any, monthIdx: number) => {
    const point: Record<string, any> = { label: historyData[0].history[monthIdx].label };
    for (const b of (historyData ?? [])) {
      point[b.category] = b.history[monthIdx].spent;
    }
    return point;
  }) ?? [];

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  const totalBudgeted = (data ?? []).reduce((sum, b) => sum + parseFloat(String(b.monthlyLimit)), 0);
  const totalSpent = (data ?? []).reduce((sum, b) => sum + b.spent, 0);
  const overBudgetCount = (data ?? []).filter(b => b.status === 'over').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Budgets</h1>
          <p className="text-sm text-white/40 mt-0.5">Monthly spending limits</p>
        </div>
        <Button onClick={handleAdd} icon={<Plus size={14} />}>New Budget</Button>
      </div>

      {/* Summary row */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Budgeted', value: formatCurrency(totalBudgeted), sub: 'this month' },
            { label: 'Total Spent', value: formatCurrency(totalSpent), sub: `${Math.round((totalSpent / totalBudgeted) * 100)}% of budget` },
            { label: 'Over Budget', value: String(overBudgetCount), sub: `${(data ?? []).length - overBudgetCount} on track` },
          ].map(item => (
            <div key={item.label} className="bg-surface border border-white/[0.08] rounded-xl p-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
              <p className="font-mono text-xl font-semibold mt-1">{item.value}</p>
              <p className="text-xs text-white/35 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Budget cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : data && data.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <TrendingDown size={40} className="text-white/10 mx-auto" />
          <p className="text-white/40">No budgets yet</p>
          <p className="text-white/25 text-sm">Set monthly limits to track your spending</p>
          <Button onClick={handleAdd} icon={<Plus size={14} />}>Create your first budget</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Historical chart */}
      {chartData.length > 0 && data && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>6-Month Spending by Category</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={12} barGap={2}>
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', paddingTop: '12px' }}
              />
              {(data ?? []).map((b, i) => (
                <Bar key={b.category} dataKey={b.category} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editingBudget}
      />
    </div>
  );
}
