import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, formatCompact } from '../../lib/utils';

interface NetWorthCardProps {
  data?: {
    total: number;
    assets: number;
    liabilities: number;
  };
  loading?: boolean;
}

export function NetWorthCard({ data, loading }: NetWorthCardProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-10 w-40 mb-2" />
        <Skeleton className="h-3 w-32" />
      </Card>
    );
  }

  const isPositive = (data?.total ?? 0) >= 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
      <CardHeader>
        <CardTitle>Net Worth</CardTitle>
        {isPositive
          ? <TrendingUp size={16} className="text-positive" />
          : <TrendingDown size={16} className="text-negative" />
        }
      </CardHeader>
      <div className="space-y-1">
        <p className={`font-mono text-4xl font-semibold tracking-tight ${isPositive ? 'text-white' : 'text-negative'}`}>
          {formatCompact(data?.total ?? 0)}
        </p>
        <p className="text-xs text-white/40">Total across all accounts</p>
      </div>
      <div className="flex gap-6 mt-5 pt-4 border-t border-white/[0.06]">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Assets</p>
          <p className="font-mono text-sm font-medium text-positive">{formatCurrency(data?.assets ?? 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Liabilities</p>
          <p className="font-mono text-sm font-medium text-negative">{formatCurrency(data?.liabilities ?? 0)}</p>
        </div>
      </div>
    </Card>
  );
}
