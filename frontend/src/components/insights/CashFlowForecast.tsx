import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

const riskConfig = {
  low: { icon: CheckCircle, color: 'text-positive', label: 'On track', bg: 'bg-positive/10 border-positive/20' },
  medium: { icon: AlertCircle, color: 'text-warning', label: 'Watch spending', bg: 'bg-warning/10 border-warning/20' },
  high: { icon: AlertTriangle, color: 'text-negative', label: 'Overdraft risk', bg: 'bg-negative/10 border-negative/20' },
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-white/60 mb-0.5">{label}</p>
        <p className={payload[0].value >= 0 ? 'text-positive font-mono' : 'text-negative font-mono'}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function CashFlowForecast() {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow-forecast'],
    queryFn: () => api.get('/insights/cash-flow-forecast').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Cash Flow Forecast</CardTitle></CardHeader>
        <Skeleton className="h-36 w-full rounded-lg" />
      </Card>
    );
  }

  const risk: 'low' | 'medium' | 'high' = (data?.riskLevel ?? 'low') as 'low' | 'medium' | 'high';
  const cfg = riskConfig[risk];
  const RiskIcon = cfg.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Forecast</CardTitle>
        <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium', cfg.bg, cfg.color)}>
          <RiskIcon size={11} />
          {cfg.label}
        </div>
      </CardHeader>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Spent so far', value: formatCurrency(data?.spentSoFar ?? 0) },
          { label: 'Projected total', value: formatCurrency(data?.projectedMonthTotal ?? 0) },
          { label: 'End-of-month balance', value: formatCurrency(Math.abs(data?.projectedEndBalance ?? 0)), negative: (data?.projectedEndBalance ?? 0) < 0 },
        ].map(item => (
          <div key={item.label}>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
            <p className={cn('font-mono text-sm font-semibold mt-0.5', item.negative ? 'text-negative' : 'text-white')}>
              {item.negative ? '-' : ''}{item.value}
            </p>
          </div>
        ))}
      </div>

      {data?.dailyForecast && data.dailyForecast.length > 1 && (
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={data.dailyForecast}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={risk === 'high' ? '#ef4444' : '#10b981'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={risk === 'high' ? '#ef4444' : '#10b981'} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.ceil(data.dailyForecast.length / 5)} />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
            <Area
              type="monotone" dataKey="projectedBalance"
              stroke={risk === 'high' ? '#ef4444' : '#10b981'}
              fill="url(#forecastGrad)" strokeWidth={2} dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] text-white/25 mt-2">
        {data?.daysRemaining ?? 0} days remaining · {formatCurrency(data?.dailyBurn ?? 0)}/day avg burn rate
      </p>
    </Card>
  );
}
