import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface Filters {
  search: string;
  startDate: string;
  endDate: string;
  category: string;
  accountId: string;
}

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  accounts?: Array<{ id: string; name: string }>;
}

const CATEGORIES = [
  'Food and Drink', 'Travel', 'Shopping', 'Entertainment',
  'Healthcare', 'Transportation', 'Utilities', 'Housing', 'Other',
];

export function TransactionFilters({ filters, onChange, accounts }: TransactionFiltersProps) {
  const hasActiveFilters = filters.search || filters.startDate || filters.endDate || filters.category || filters.accountId;

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  const clearAll = () => onChange({ search: '', startDate: '', endDate: '', category: '', accountId: '' });

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-48">
        <Input
          placeholder="Search transactions..."
          value={filters.search}
          onChange={set('search')}
          icon={<Search size={14} />}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">From</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={set('startDate')}
          className="bg-surface-2 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-accent/60 transition-colors"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">To</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={set('endDate')}
          className="bg-surface-2 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-accent/60 transition-colors"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Category</label>
        <select
          value={filters.category}
          onChange={set('category')}
          className="bg-surface-2 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-accent/60 transition-colors"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {accounts && accounts.length > 0 && (
        <div>
          <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Account</label>
          <select
            value={filters.accountId}
            onChange={set('accountId')}
            className="bg-surface-2 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-accent/60 transition-colors"
          >
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} icon={<X size={12} />}>
          Clear
        </Button>
      )}
    </div>
  );
}
