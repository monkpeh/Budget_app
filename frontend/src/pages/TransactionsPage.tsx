import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import api from '../lib/api';
import { TransactionFilters } from '../components/transactions/TransactionFilters';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { Button } from '../components/ui/Button';

interface Filters {
  search: string;
  startDate: string;
  endDate: string;
  category: string;
  accountId: string;
}

export function TransactionsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: '', startDate: '', endDate: '', category: '', accountId: '',
  });
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '50',
    ...(filters.search && { search: filters.search }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.category && { category: filters.category }),
    ...(filters.accountId && { accountId: filters.accountId }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => api.get(`/transactions?${queryParams}`).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data.accounts),
  });

  const accountMap = new Map<string, string>(
    (accountsData ?? []).map((a: any) => [a.id, a.name])
  );

  const handleExport = async () => {
    const response = await api.post('/transactions/export', {}, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          {data?.pagination && (
            <p className="text-sm text-white/40 mt-0.5">{data.pagination.total} total</p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          icon={<Download size={13} />}
        >
          Export CSV
        </Button>
      </div>

      <TransactionFilters
        filters={filters}
        onChange={handleFiltersChange}
        accounts={accountsData}
      />

      <TransactionTable
        transactions={data?.transactions}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        accountMap={accountMap}
      />
    </div>
  );
}
