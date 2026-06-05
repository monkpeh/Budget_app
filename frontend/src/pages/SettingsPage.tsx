import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Trash2, Lock, User, Shield, FileJson, FileText } from 'lucide-react';
import api from '../lib/api';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-white/40" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const changePwMutation = useMutation({
    mutationFn: (d: { currentPassword: string; newPassword: string }) =>
      api.post('/user/change-password', d),
    onSuccess: () => {
      setPwSuccess('Password updated successfully');
      setPwError('');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(''), 3000);
    },
    onError: (e: any) => {
      setPwError(e.response?.data?.error ?? 'Failed to update password');
      setPwSuccess('');
    },
  });

  const handleChangePw = () => {
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    changePwMutation.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  // Export
  const handleExport = async (format: 'json' | 'csv') => {
    const response = await api.get(`/user/export?format=${format}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-tracker-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/user/account'),
    onSuccess: async () => {
      await logout();
      navigate('/login');
    },
    onError: (e: any) => setDeleteError(e.response?.data?.error ?? 'Failed to delete account'),
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-white/40 mt-0.5">Account and data preferences</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={User}>
        <div className="space-y-2">
          <div className="bg-surface-2 rounded-xl px-4 py-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Email</p>
            <p className="text-sm text-white/80 mt-0.5">{user?.email}</p>
          </div>
          <div className="bg-surface-2 rounded-xl px-4 py-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Account ID</p>
            <p className="text-xs font-mono text-white/50 mt-0.5">{user?.id}</p>
          </div>
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" icon={Lock}>
        <div className="space-y-3">
          <Input
            label="Current Password"
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="New Password"
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="••••••••"
          />
          {pwError && <p className="text-xs text-negative">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-positive">{pwSuccess}</p>}
          <Button
            onClick={handleChangePw}
            loading={changePwMutation.isPending}
            disabled={!currentPw || !newPw || !confirmPw}
          >
            Update Password
          </Button>
        </div>
      </Section>

      {/* Data Export */}
      <Section title="Export Your Data" icon={Download}>
        <p className="text-sm text-white/50 mb-4">
          Download all your accounts, transactions, and budgets. Your data, your control.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => handleExport('json')}
            icon={<FileJson size={14} />}
          >
            Export JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('csv')}
            icon={<FileText size={14} />}
          >
            Export CSV
          </Button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={Shield}>
        <div className="space-y-3">
          {[
            { label: 'Access token lifetime', value: '15 minutes' },
            { label: 'Session lifetime', value: '7 days' },
            { label: 'Plaid token storage', value: 'AES-256-GCM encrypted at rest' },
            { label: 'Password hashing', value: 'bcrypt (12 rounds)' },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-white/50">{item.label}</span>
              <span className="text-xs font-mono text-white/35">{item.value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger Zone */}
      <Card className="border-negative/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-negative/60" />
            <CardTitle className="text-negative/70">Delete Account</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm text-white/50 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <div className="space-y-3">
          <Input
            label={`Type "delete my account" to confirm`}
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="delete my account"
          />
          {deleteError && <p className="text-xs text-negative">{deleteError}</p>}
          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            disabled={deleteConfirm !== 'delete my account'}
            icon={<Trash2 size={14} />}
          >
            Permanently Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
