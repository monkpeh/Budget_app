import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../lib/utils';

interface BudgetHealthItem {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  status: 'ok' | 'warning' | 'critical' | 'over';
}

interface BudgetHealthProps {
  data?: BudgetHealthItem[];
  loading?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'ok') return <CheckCircle size={13} className="text-positive" />;
  if (status === 'warning') return <AlertTriangle size={13} className="text-warning" />;
  return <XCircle size={13} className="text-negative" />;
};

export function BudgetHealth({ data, loading }: BudgetHealthProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Budget Health</CardTitle></CardHeader>
        <p className="text-white/30 text-sm">No budgets configured yet</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Budget Health</CardTitle></CardHeader>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.category}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <StatusIcon status={item.status} />
                <span className="text-sm text-white/80">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/50">{formatCurrency(item.spent)}</span>
                <span className="text-white/25">/</span>
                <span className="text-white/50">{formatCurrency(item.limit)}</span>
                <span className={`font-semibold w-10 text-right ${
                  item.status === 'over' ? 'text-negative' :
                  item.status === 'critical' ? 'text-negative/80' :
                  item.status === 'warning' ? 'text-warning' : 'text-white/60'
                }`}>
                  {item.percentage}%
                </span>
              </div>
            </div>
            <ProgressBar
              value={item.percentage}
              color={
                item.status === 'over' || item.status === 'critical' ? 'negative' :
                item.status === 'warning' ? 'warning' : 'accent'
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
