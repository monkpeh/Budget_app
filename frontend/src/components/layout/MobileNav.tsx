import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, TrendingUp, Lightbulb, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Home', to: '/' },
  { icon: CreditCard, label: 'Txns', to: '/transactions' },
  { icon: TrendingUp, label: 'Budgets', to: '/budgets' },
  { icon: Lightbulb, label: 'Insights', to: '/insights' },
  { icon: Settings, label: 'Settings', to: '/settings' },
];

export function MobileNav() {
  return (
    <nav className="flex items-center justify-around bg-[#0b0e18] border-t border-white/[0.06] px-4 py-2 safe-area-inset-bottom">
      {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => cn(
            'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
            isActive ? 'text-accent' : 'text-white/40'
          )}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
