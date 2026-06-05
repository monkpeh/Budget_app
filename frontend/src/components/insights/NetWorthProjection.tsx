import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, formatCompact } from '../../lib/utils';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-white/60 mb-0.5">{label}</p>
        <p className="text-accent font-mono">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function NetWorthProjection() {
  const { data, isLoading } = useQuery({
    queryKey: ['net-worth-projection'],
    queryFn: () => api.get('/insights/net-worth-projection').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>12-Month Net Worth Projection</CardTitle></CardHeader>
        <Skeleton className="h-40 w-full rounded-lg" />
      </Card>
    );
  }

  const projection: Array<{ label: string; netWorth: number }> = data?.projection ?? [];
  const current: number = data?.currentNetWorth ?? 0;
  const monthlyDelta: number = data?.avgMonthlySavings ?? 0;
  const projected12: number = projection[12]?.netWorth ?? current;
  const change = projected12 - current;

  return (
    <Card>
      <CardHeader>
        <CardTitle>12-Month Net Worth Projection</CardTitle>
        <span className={`text-xs font-mono ${change >= 0 ? 'text-positive' : 'text-negative'}`}>
          {change >= 0 ? '+' : ''}{formatCompact(change)}
        </span>
      </CardHeader>
      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Today</p>
          <p className="font-mono text-base font-semibold">{formatCurrency(current)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">In 12 months</p>
          <p className="font-mono text-base font-semibold text-accent">{formatCurrency(projected12)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg monthly savings</p>
          <p className={`font-mono text-base font-semibold ${monthlyDelta >= 0 ? 'text-positive' : 'text-negative'}`}>
            {monthlyDelta >= 0 ? '+' : ''}{formatCurrency(monthlyDelta)}
          </p>
        </div>
      </div>
      {projection.length > 0 && (
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={projection}>
            <defs>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="netWorth" stroke="#10b981" fill="url(#projGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] text-white/25 mt-2">
        Based on avg monthly savings + 5% annual investment return. Not financial advice.
      </p>
    </Card>
  );
}
