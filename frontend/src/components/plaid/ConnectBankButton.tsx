import { Plus, Link } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePlaidLink } from '../../hooks/usePlaidLink';

interface ConnectBankButtonProps {
  size?: 'sm' | 'md' | 'lg';
}

export function ConnectBankButton({ size = 'md' }: ConnectBankButtonProps) {
  const { openLink, loading } = usePlaidLink();

  return (
    <Button
      onClick={openLink}
      loading={loading}
      size={size}
      variant="secondary"
      icon={size === 'sm' ? <Plus size={12} /> : <Link size={14} />}
    >
      {size === 'sm' ? 'Connect' : 'Connect Bank'}
    </Button>
  );
}
