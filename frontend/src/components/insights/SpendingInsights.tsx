import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Info, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface Insight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  body: string;
  amount?: number;
}

const InsightIcon = ({ type }: { type: string }) => {
  if (type === 'positive') return <TrendingUp size={14} className="text-positive" />;
  if (type === 'warning') return <TrendingDown size={14} className="text-warning" />;
  return <Info size={14} className="text-accent-2" />;
};

const insightStyles = {
  positive: 'bg-positive/8 border-positive/20',
  warning: 'bg-warning/8 border-warning/20',
  info: 'bg-accent-2/8 border-accent-2/20',
};

const insightTitle = {
  positive: 'text-positive',
  warning: 'text-warning',
  info: 'text-accent-2',
};

export function SpendingInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ['spending-insights'],
    queryFn: () => api.get('/insights/spending-insights').then(r => r.data.insights as Insight[]),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Insights</CardTitle>
        <Sparkles size={14} className="text-accent/60" />
      </CardHeader>
      {!data || data.length === 0 ? (
        <p className="text-white/30 text-sm py-3">Connect accounts and spend a bit to see insights.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((insight, i) => (
            <div
              key={i}
              className={cn('flex gap-3 p-3 rounded-xl border', insightStyles[insight.type])}
            >
              <div className="mt-0.5 flex-shrink-0">
                <InsightIcon type={insight.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs font-semibold', insightTitle[insight.type])}>
                    {insight.title}
                  </p>
                  {insight.amount != null && (
                    <span className="font-mono text-xs text-white/50 flex-shrink-0">
                      {formatCurrency(insight.amount)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{insight.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
