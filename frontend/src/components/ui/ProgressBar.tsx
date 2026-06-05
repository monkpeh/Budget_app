import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: 'accent' | 'warning' | 'negative' | 'positive';
}

export function ProgressBar({ value, max = 100, className, color = 'accent' }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClasses = {
    accent: 'bg-accent',
    warning: 'bg-warning',
    negative: 'bg-negative',
    positive: 'bg-positive',
  };

  return (
    <div className={cn('h-1.5 w-full rounded-full bg-white/10 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
