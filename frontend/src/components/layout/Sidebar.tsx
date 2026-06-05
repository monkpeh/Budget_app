import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, Wallet, BarChart3, Settings,
  LogOut, TrendingUp, Lock, ChevronRight, RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: CreditCard, label: 'Transactions', to: '/transactions' },
  { icon: Wallet, label: 'Accounts', to: '/accounts', locked: true },
  { icon: TrendingUp, label: 'Budgets', to: '/budgets', locked: true },
  { icon: BarChart3, label: 'Analytics', to: '/analytics', locked: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data.accounts),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 flex-shrink-0 h-screen bg-[#0b0e18] border-r border-white/[0.06] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingUp size={14} className="text-accent" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Budget Tracker</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, to, locked }) => (
          locked ? (
            <div
              key={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/25 cursor-not-allowed"
            >
              <Icon size={16} />
              <span className="text-sm">{label}</span>
              <Lock size={10} className="ml-auto" />
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
                isActive
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={12} className="ml-auto" />}
                </>
              )}
            </NavLink>
          )
        ))}

        {/* Accounts section */}
        {accountsData && accountsData.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Accounts
            </p>
            {accountsData.slice(0, 4).map((acc: any) => (
              <div key={acc.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-default">
                <div className="w-6 h-6 rounded-md bg-surface-2 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={11} className="text-white/40" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/60 truncate">{acc.name}</p>
                  <p className="text-xs font-mono text-white/40">
                    {formatCurrency(acc.currentBalance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all text-sm">
          <Settings size={15} />
          <span>Settings</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/40 hover:text-negative/80 hover:bg-negative/5 transition-all text-sm"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
        <div className="px-3 py-2">
          <p className="text-xs text-white/25 truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
