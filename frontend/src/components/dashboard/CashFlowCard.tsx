import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, getChangePercent } from '../../lib/utils';

interface CashFlowCardProps {
  data?: {
    income: number;
    expenses: number;
    lastMonth: { income: number; expenses: number };
  };
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-white/60 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function CashFlowCard({ data, loading }: CashFlowCardProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const chartData = [
    { name: 'Last Month', Income: data?.lastMonth.income ?? 0, Expenses: data?.lastMonth.expenses ?? 0 },
    { name: 'This Month', Income: data?.income ?? 0, Expenses: data?.expenses ?? 0 },
  ];

  const expenseChange = getChangePercent(data?.expenses ?? 0, data?.lastMonth.expenses ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow</CardTitle>
        <span className={`text-xs font-mono ${expenseChange > 0 ? 'text-negative' : 'text-positive'}`}>
          {expenseChange > 0 ? '+' : ''}{expenseChange}% vs last month
        </span>
      </CardHeader>
      <div className="flex gap-4 mb-4">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Income</p>
          <p className="font-mono text-lg font-semibold text-positive">{formatCurrency(data?.income ?? 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Expenses</p>
          <p className="font-mono text-lg font-semibold text-negative">{formatCurrency(data?.expenses ?? 0)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={chartData} barSize={20} barGap={4}>
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
