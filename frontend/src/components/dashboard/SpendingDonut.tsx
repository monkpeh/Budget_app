import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, getCategoryColor } from '../../lib/utils';

interface SpendingDonutProps {
  data?: Array<{ category: string; amount: number; percentage: number }>;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-white font-medium">{d.category}</p>
        <p className="text-white/60">{formatCurrency(d.amount)} · {d.percentage}%</p>
      </div>
    );
  }
  return null;
};

export function SpendingDonut({ data, loading }: SpendingDonutProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-40 w-40 rounded-full mx-auto" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
        <p className="text-center text-white/30 text-sm py-8">No spending data this month</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
      <div className="flex gap-4 items-center">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
              dataKey="amount" paddingAngle={2} strokeWidth={0}>
              {data.map((entry) => (
                <Cell key={entry.category} fill={getCategoryColor(entry.category)} opacity={0.9} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2 min-w-0">
          {data.slice(0, 5).map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getCategoryColor(item.category) }}
              />
              <span className="text-xs text-white/60 truncate flex-1">{item.category}</span>
              <span className="text-xs font-mono text-white/80 flex-shrink-0">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
