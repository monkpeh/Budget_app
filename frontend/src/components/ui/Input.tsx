import { cn } from '../../lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30',
              'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-negative/50 focus:border-negative/70',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
