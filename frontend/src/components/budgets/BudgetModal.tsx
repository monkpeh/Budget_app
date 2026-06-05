import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

const CATEGORIES = [
  'Food and Drink', 'Travel', 'Shopping', 'Entertainment',
  'Healthcare', 'Transportation', 'Utilities', 'Housing',
  'Subscriptions', 'Personal Care', 'Education', 'Other',
];

interface BudgetFormData {
  id?: string;
  category: string;
  monthlyLimit: string;
  rollover: boolean;
}

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { category: string; monthlyLimit: number; rollover: boolean }) => Promise<void>;
  initial?: BudgetFormData | null;
}

export function BudgetModal({ open, onClose, onSave, initial }: BudgetModalProps) {
  const [category, setCategory] = useState('Food and Drink');
  const [limit, setLimit] = useState('');
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setCategory(initial.category);
      setLimit(String(parseFloat(String(initial.monthlyLimit))));
      setRollover(initial.rollover);
    } else {
      setCategory('Food and Drink');
      setLimit('');
      setRollover(false);
    }
    setError('');
  }, [initial, open]);

  if (!open) return null;

  const handleSave = async () => {
    const amt = parseFloat(limit);
    if (!limit || isNaN(amt) || amt <= 0) {
      setError('Enter a valid budget amount');
      return;
    }
    setSaving(true);
    try {
      await onSave({ category, monthlyLimit: amt, rollover });
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{initial ? 'Edit Budget' : 'New Budget'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60 transition-colors"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <Input
            label="Monthly Budget"
            type="number"
            placeholder="500"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min="0"
            step="0.01"
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setRollover(!rollover)}
              className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${rollover ? 'bg-accent' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${rollover ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <div>
              <p className="text-sm text-white/80">Rollover unspent budget</p>
              <p className="text-xs text-white/30">Carry leftover to next month</p>
            </div>
          </label>

          {error && <p className="text-xs text-negative">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>
              {initial ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
