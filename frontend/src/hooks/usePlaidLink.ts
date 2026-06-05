import { useState, useCallback } from 'react';
import { usePlaidLink as usePlaidLinkBase } from 'react-plaid-link';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function usePlaidLink() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/plaid/create-link-token');
      setLinkToken(data.linkToken);
    } finally {
      setLoading(false);
    }
  }, []);

  const { open, ready } = usePlaidLinkBase({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      await api.post('/plaid/exchange-token', {
        publicToken,
        metadata: { institution: metadata.institution },
      });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const openLink = useCallback(async () => {
    if (!linkToken) {
      await fetchLinkToken();
    }
    if (ready) open();
  }, [linkToken, ready, open, fetchLinkToken]);

  return { openLink, loading, ready: ready && !!linkToken };
}
