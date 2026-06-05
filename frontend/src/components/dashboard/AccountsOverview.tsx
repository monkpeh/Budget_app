import { CreditCard, Building, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../lib/utils';
import { ConnectBankButton } from '../plaid/ConnectBankButton';

interface Account {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  currentBalance: string;
  mask?: string;
  institutionName?: string;
}

interface AccountsOverviewProps {
  data?: Account[];
  loading?: boolean;
}

const AccountIcon = ({ type }: { type: string }) => {
  if (type === 'investment') return <TrendingUp size={14} className="text-accent-2" />;
  if (type === 'credit') return <CreditCard size={14} className="text-warning" />;
  return <Building size={14} className="text-accent" />;
};

export function AccountsOverview({ data, loading }: AccountsOverviewProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <ConnectBankButton size="sm" />
      </CardHeader>
      {!data || data.length === 0 ? (
        <div className="py-6 text-center space-y-3">
          <p className="text-white/30 text-sm">No accounts connected</p>
          <ConnectBankButton />
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((acc) => {
            const balance = parseFloat(String(acc.currentBalance));
            const isCredit = acc.type === 'credit';
            return (
              <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/50 hover:bg-surface-2 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                  <AccountIcon type={acc.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{acc.name}</p>
                  <p className="text-[11px] text-white/35">
                    {acc.institutionName ?? acc.type}
                    {acc.mask && ` ••${acc.mask}`}
                  </p>
                </div>
                <p className={`font-mono text-sm font-medium flex-shrink-0 ${isCredit ? 'text-negative' : 'text-white/80'}`}>
                  {isCredit && balance > 0 ? '-' : ''}{formatCurrency(Math.abs(balance))}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
