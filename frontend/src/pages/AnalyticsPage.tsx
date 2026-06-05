import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { formatCurrency, formatDate, getCategoryColor } from '../lib/utils';
import { RefreshCw, TrendingUp, TrendingDown, Repeat, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

const PERIOD_OPTIONS = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs max-w-xs">
        <p className="text-white/60 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color ?? p.stroke }}>
            {p.name}: {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsPage() {
  const [period, setPeriod] = useState(6);

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends', period],
    queryFn: () => api.get(`/analytics/spending-trends?months=${period}`).then(r => r.data.trends),
  });

  const { data: merchantsData, isLoading: merchantsLoading } = useQuery({
    queryKey: ['analytics-merchants'],
    queryFn: () => api.get('/analytics/top-merchants').then(r => r.data.merchants),
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['analytics-subscriptions'],
    queryFn: () => api.get('/analytics/subscriptions').then(r => r.data.subscriptions),
  });

  const { data: savingsData, isLoading: savingsLoading } = useQuery({
    queryKey: ['analytics-savings'],
    queryFn: () => api.get('/analytics/savings-rate').then(r => r.data.savingsRate),
  });

  // Flatten category trends for stacked area chart
  const allCategories = Array.from(new Set(
    (trendsData ?? []).flatMap((m: any) => Object.keys(m.byCategory ?? {}))
  )).slice(0, 7);

  const cashFlowChartData = (trendsData ?? []).map((m: any) => ({
    label: m.label,
    Income: m.totalIncome,
    Expenses: m.totalExpenses,
  }));

  const categoryChartData = (trendsData ?? []).map((m: any) => {
    const point: Record<string, any> = { label: m.label };
    for (const cat of allCategories) {
      point[cat] = m.byCategory?.[cat] ?? 0;
    }
    return point;
  });

  const totalSubscriptionCost = (subsData ?? [])
    .filter((s: any) => s.frequency === 'monthly')
    .reduce((sum: number, s: any) => sum + s.amount, 0);

  const avgSavingsRate = savingsData
    ? Math.round((savingsData as any[]).reduce((s: number, m: any) => s + Math.max(m.savingsRate, 0), 0) / savingsData.length)
    : 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-white/40 mt-0.5">Spending patterns & insights</p>
        </div>
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setPeriod(opt.months)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                period === opt.months ? 'bg-accent/20 text-accent' : 'text-white/40 hover:text-white/70'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Avg Savings Rate',
            value: `${avgSavingsRate}%`,
            icon: TrendingUp,
            color: avgSavingsRate >= 20 ? 'text-positive' : avgSavingsRate >= 10 ? 'text-warning' : 'text-negative',
          },
          {
            label: 'Monthly Subscriptions',
            value: formatCurrency(totalSubscriptionCost),
            icon: Repeat,
            color: 'text-white',
          },
          {
            label: 'Avg Monthly Spend',
            value: trendsData
              ? formatCurrency((trendsData as any[]).reduce((s: number, m: any) => s + m.totalExpenses, 0) / trendsData.length)
              : '—',
            icon: BarChart3,
            color: 'text-white',
          },
          {
            label: 'Top Merchant',
            value: merchantsData?.[0]?.name ?? '—',
            icon: TrendingDown,
            color: 'text-white',
          },
        ].map(item => (
          <div key={item.label} className="bg-surface border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={13} className="text-white/30" />
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
            </div>
            <p className={cn('font-mono text-lg font-semibold truncate', item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Cash Flow trend */}
      <Card>
        <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
        {trendsLoading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cashFlowChartData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }} />
              <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Category trends + Savings rate side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          {trendsLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={categoryChartData} barSize={10} barGap={2}>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {allCategories.map(cat => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={getCategoryColor(cat)} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Savings Rate %</CardTitle></CardHeader>
          {savingsLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={savingsData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
                          <p className="text-white/60">{label}</p>
                          <p className="text-accent">{payload[0].value}% savings</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="savingsRate" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top merchants + Subscriptions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Top Merchants This Month</CardTitle></CardHeader>
          {merchantsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !merchantsData || merchantsData.length === 0 ? (
            <p className="text-white/30 text-sm py-4">No merchant data yet</p>
          ) : (
            <div className="space-y-2">
              {(merchantsData as any[]).map((m: any, i: number) => {
                const maxAmt = merchantsData[0].amount;
                return (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-xs text-white/25 w-4 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white/70 truncate">{m.name}</span>
                        <span className="font-mono text-sm text-white/70 ml-2 flex-shrink-0">{formatCurrency(m.amount)}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent/50"
                          style={{ width: `${(m.amount / maxAmt) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-white/25 w-12 text-right">{m.count}x</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detected Subscriptions</CardTitle>
            {totalSubscriptionCost > 0 && (
              <span className="text-xs font-mono text-white/50">{formatCurrency(totalSubscriptionCost)}/mo</span>
            )}
          </CardHeader>
          {subsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !subsData || subsData.length === 0 ? (
            <p className="text-white/30 text-sm py-4">No recurring charges detected yet</p>
          ) : (
            <div className="space-y-2">
              {(subsData as any[]).map((s: any) => (
                <div key={s.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-2/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Repeat size={11} className="text-accent/70" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate">{s.name}</p>
                      <p className="text-[11px] text-white/35">
                        {s.frequency} · next {formatDate(s.nextExpected, 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-white/70 ml-3 flex-shrink-0">{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
