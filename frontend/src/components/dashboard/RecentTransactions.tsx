import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, formatDate, getCategoryColor } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  name: string;
  merchantName?: string;
  amount: string;
  date: string;
  category?: string[];
  userCategory?: string;
}

interface RecentTransactionsProps {
  data?: Transaction[];
  loading?: boolean;
}

export function RecentTransactions({ data, loading }: RecentTransactionsProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <button
          onClick={() => navigate('/transactions')}
          className="text-xs text-accent hover:text-accent/80 transition-colors"
        >
          View all
        </button>
      </CardHeader>
      {!data || data.length === 0 ? (
        <p className="text-white/30 text-sm py-4">No transactions yet</p>
      ) : (
        <div className="space-y-1">
          {data.map((txn) => {
            const amount = parseFloat(String(txn.amount));
            const isIncome = amount < 0;
            const category = txn.userCategory ?? txn.category?.[0] ?? 'Other';
            const color = getCategoryColor(category);

            return (
              <div
                key={txn.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                onClick={() => navigate('/transactions')}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {isIncome
                    ? <ArrowDownLeft size={14} style={{ color }} />
                    : <ArrowUpRight size={14} style={{ color }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">
                    {txn.merchantName ?? txn.name}
                  </p>
                  <p className="text-[11px] text-white/35">{formatDate(txn.date, 'MMM d')}</p>
                </div>
                <span className={`font-mono text-sm font-medium flex-shrink-0 ${isIncome ? 'text-positive' : 'text-white/70'}`}>
                  {isIncome ? '+' : ''}{formatCurrency(Math.abs(amount))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
