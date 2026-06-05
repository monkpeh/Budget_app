import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const paddingClass = { sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding];
  return (
    <div className={cn(
      'rounded-xl bg-surface border border-white/[0.08] backdrop-blur-sm',
      paddingClass,
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-semibold text-white/70 uppercase tracking-wider', className)}>
      {children}
    </h3>
  );
}
