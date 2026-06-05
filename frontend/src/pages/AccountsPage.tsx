import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, CreditCard, TrendingUp, Trash2, Plus, RefreshCw,
  Wifi, WifiOff, Landmark,
} from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ConnectBankButton } from '../components/plaid/ConnectBankButton';
import { formatCurrency, formatDate } from '../lib/utils';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';

interface Account {
  id: string;
  name: string;
  officialName?: string | null;
  type: string;
  subtype?: string | null;
  currentBalance: string;
  availableBalance?: string | null;
  currencyCode: string;
  mask?: string | null;
  isManual: boolean;
  institutionName?: string | null;
  updatedAt: string;
  plaidItemId?: string | null;
}

const AccountIcon = ({ type, size = 16 }: { type: string; size?: number }) => {
  if (type === 'investment') return <TrendingUp size={size} className="text-accent-2" />;
  if (type === 'credit') return <CreditCard size={size} className="text-warning" />;
  if (type === 'loan') return <Landmark size={size} className="text-negative/70" />;
  return <Building size={size} className="text-accent" />;
};

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
};

function ManualAccountModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Enter an account name'); return; }
    const b = parseFloat(balance);
    if (isNaN(b)) { setError('Enter a valid balance'); return; }
    setSaving(true);
    try {
      await onSave({ name, type, currentBalance: b });
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
        <h2 className="text-base font-semibold mb-5">Add Manual Account</h2>
        <div className="space-y-4">
          <Input label="Account Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cash Wallet" />
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Input label="Current Balance" type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" />
          {error && <p className="text-xs text-negative">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>Add Account</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountsPage() {
  const [manualOpen, setManualOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data.accounts as Account[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/plaid/sync'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const createManualMutation = useMutation({
    mutationFn: (d: any) => api.post('/accounts/manual', d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const connected = (data ?? []).filter(a => !a.isManual);
  const manual = (data ?? []).filter(a => a.isManual);

  const totalAssets = (data ?? [])
    .filter(a => ['checking', 'savings', 'investment'].includes(a.type))
    .reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);
  const totalLiabilities = (data ?? [])
    .filter(a => ['credit', 'loan'].includes(a.type))
    .reduce((s, a) => s + parseFloat(String(a.currentBalance)), 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Accounts</h1>
          <p className="text-sm text-white/40 mt-0.5">{(data ?? []).length} connected</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            icon={<RefreshCw size={13} />}
          >
            Sync All
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setManualOpen(true)} icon={<Plus size={13} />}>
            Manual
          </Button>
          <ConnectBankButton />
        </div>
      </div>

      {/* Net worth summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Net Worth', value: totalAssets - totalLiabilities, color: 'text-white' },
          { label: 'Total Assets', value: totalAssets, color: 'text-positive' },
          { label: 'Total Liabilities', value: totalLiabilities, color: 'text-negative' },
        ].map(item => (
          <div key={item.label} className="bg-surface border border-white/[0.08] rounded-xl p-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
            <p className={cn('font-mono text-xl font-semibold mt-1', item.color)}>
              {formatCurrency(Math.abs(item.value))}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {connected.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Wifi size={13} className="text-accent" />
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Connected via Plaid</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {connected.map(acc => (
                  <AccountCard key={acc.id} account={acc} onDelete={deleteMutation.mutate} />
                ))}
              </div>
            </section>
          )}

          {manual.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <WifiOff size={13} className="text-white/30" />
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Manual Accounts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {manual.map(acc => (
                  <AccountCard key={acc.id} account={acc} onDelete={deleteMutation.mutate} />
                ))}
              </div>
            </section>
          )}

          {(data ?? []).length === 0 && (
            <div className="py-20 text-center space-y-4">
              <Building size={40} className="text-white/10 mx-auto" />
              <p className="text-white/40">No accounts connected</p>
              <ConnectBankButton />
            </div>
          )}
        </>
      )}

      {manualOpen && (
        <ManualAccountModal
          onClose={() => setManualOpen(false)}
          onSave={(d) => createManualMutation.mutateAsync(d)}
        />
      )}
    </div>
  );
}

function AccountCard({ account: acc, onDelete }: { account: Account; onDelete: (id: string) => void }) {
  const balance = parseFloat(String(acc.currentBalance));
  const isCredit = acc.type === 'credit' || acc.type === 'loan';

  return (
    <div className="bg-surface border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.14] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
            <AccountIcon type={acc.type} size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{acc.name}</p>
            <p className="text-xs text-white/35">
              {acc.institutionName ?? TYPE_LABELS[acc.type] ?? acc.type}
              {acc.mask && ` ••${acc.mask}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(acc.id)}
          className="p-1.5 text-white/20 hover:text-negative hover:bg-negative/5 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
          {isCredit ? 'Balance Owed' : 'Current Balance'}
        </p>
        <p className={cn('font-mono text-2xl font-semibold', isCredit ? 'text-negative' : 'text-white')}>
          {formatCurrency(Math.abs(balance))}
        </p>
        {acc.availableBalance != null && (
          <p className="text-xs text-white/35 mt-1">
            {formatCurrency(parseFloat(String(acc.availableBalance)))} available
          </p>
        )}
      </div>

      <div className="flex justify-between mt-4 pt-3 border-t border-white/[0.06]">
        <span className="text-[11px] text-white/30">{TYPE_LABELS[acc.type] ?? acc.type}</span>
        {acc.updatedAt && (
          <span className="text-[11px] text-white/25">Updated {formatDate(acc.updatedAt, 'MMM d')}</span>
        )}
      </div>
    </div>
  );
}
