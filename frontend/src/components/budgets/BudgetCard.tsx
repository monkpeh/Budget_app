import { Pencil, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';

interface BudgetCardProps {
  budget: {
    id: string;
    category: string;
    monthlyLimit: string;
    rollover: boolean;
    spent: number;
    remaining: number;
    percentage: number;
    status: 'ok' | 'warning' | 'critical' | 'over';
  };
  onEdit: (budget: BudgetCardProps['budget']) => void;
  onDelete: (id: string) => void;
}

const StatusIndicator = ({ status }: { status: string }) => {
  if (status === 'ok') return <CheckCircle size={14} className="text-positive" />;
  if (status === 'warning') return <AlertTriangle size={14} className="text-warning" />;
  return <XCircle size={14} className="text-negative" />;
};

const statusColors = {
  ok: 'accent' as const,
  warning: 'warning' as const,
  critical: 'negative' as const,
  over: 'negative' as const,
};

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const limit = parseFloat(String(budget.monthlyLimit));

  return (
    <div className="bg-surface border border-white/[0.08] rounded-xl p-5 space-y-4 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <StatusIndicator status={budget.status} />
          <div>
            <p className="text-sm font-medium text-white">{budget.category}</p>
            {budget.rollover && (
              <span className="text-[10px] text-accent/60 font-medium">Rollover enabled</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="p-1.5 rounded-lg text-white/30 hover:text-negative hover:bg-negative/5 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Spent</p>
            <p className="font-mono text-lg font-semibold text-white">{formatCurrency(budget.spent)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Budget</p>
            <p className="font-mono text-sm text-white/60">{formatCurrency(limit)}</p>
          </div>
        </div>
        <ProgressBar value={budget.percentage} color={statusColors[budget.status]} />
        <div className="flex justify-between mt-1.5">
          <span className={`text-xs font-mono font-semibold ${
            budget.status === 'over' ? 'text-negative' :
            budget.status === 'critical' ? 'text-negative/80' :
            budget.status === 'warning' ? 'text-warning' : 'text-white/40'
          }`}>
            {budget.percentage}%
          </span>
          <span className="text-xs text-white/40">
            {budget.status === 'over'
              ? `${formatCurrency(budget.spent - limit)} over`
              : `${formatCurrency(budget.remaining)} left`
            }
          </span>
        </div>
      </div>
    </div>
  );
}
