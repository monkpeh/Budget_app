import { useState } from 'react';
import { ChevronDown, ChevronUp, Tag, FileText } from 'lucide-react';
import { CategoryBadge } from './CategoryBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

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

interface TransactionRowProps {
  transaction: Transaction;
  accountName?: string;
}

export function TransactionRow({ transaction: txn, accountName }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(txn.notes ?? '');
  const queryClient = useQueryClient();

  const amount = parseFloat(String(txn.amount));
  const isIncome = amount < 0;
  const category = txn.userCategory ?? txn.category?.[0] ?? 'Other';

  const updateMutation = useMutation({
    mutationFn: (data: { notes?: string; userCategory?: string }) =>
      api.patch(`/transactions/${txn.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const saveNotes = () => {
    if (notes !== txn.notes) {
      updateMutation.mutate({ notes });
    }
  };

  return (
    <>
      <tr
        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-4 text-sm font-mono text-white/40 whitespace-nowrap">
          {formatDate(txn.date, 'MMM d')}
        </td>
        <td className="py-3 px-4">
          <div>
            <p className="text-sm text-white/80">{txn.merchantName ?? txn.name}</p>
            {txn.merchantName && txn.name !== txn.merchantName && (
              <p className="text-[11px] text-white/30">{txn.name}</p>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <CategoryBadge category={category} />
        </td>
        <td className="py-3 px-4 text-xs text-white/30">{accountName ?? '—'}</td>
        <td className="py-3 px-4 text-right">
          <span className={`font-mono text-sm font-medium ${isIncome ? 'text-positive' : 'text-white/75'}`}>
            {isIncome ? '+' : ''}{formatCurrency(Math.abs(amount))}
          </span>
          {txn.pending && <span className="ml-1.5 text-[10px] text-warning/70">pending</span>}
        </td>
        <td className="py-3 px-4 text-right">
          {expanded ? <ChevronUp size={14} className="text-white/30 ml-auto" /> : <ChevronDown size={14} className="text-white/20 ml-auto" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-2/30 border-b border-white/[0.04]">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <FileText size={10} /> Notes
                </label>
                <input
                  className="w-full bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-accent/50"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Add a note..."
                />
              </div>
              {txn.tags && txn.tags.length > 0 && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Tag size={10} /> Tags
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {txn.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent/70 rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
