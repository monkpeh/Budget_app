import { TransactionRow } from './TransactionRow';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  name: string;
  merchantName?: string | null;
  amount: string;
  date: string;
  category?: string[] | null;
  userCategory?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  accountId: string;
  pending: boolean;
}

interface TransactionTableProps {
  transactions?: Transaction[];
  loading?: boolean;
  pagination?: { page: number; pages: number; total: number; limit: number };
  onPageChange?: (page: number) => void;
  accountMap?: Map<string, string>;
}

export function TransactionTable({
  transactions,
  loading,
  pagination,
  onPageChange,
  accountMap,
}: TransactionTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-white/30">No transactions found</p>
        <p className="text-white/20 text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-surface-2/40">
              <th className="py-3 px-4 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider">Date</th>
              <th className="py-3 px-4 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider">Description</th>
              <th className="py-3 px-4 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider">Category</th>
              <th className="py-3 px-4 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider">Account</th>
              <th className="py-3 px-4 text-right text-[10px] font-semibold text-white/30 uppercase tracking-wider">Amount</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                accountName={accountMap?.get(txn.accountId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/30">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              icon={<ChevronLeft size={14} />}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              icon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
