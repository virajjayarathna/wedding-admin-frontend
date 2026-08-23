'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CEREMONY_TYPE_LABELS, type CeremonyType } from '@/lib/types';

const CEREMONY_OPTIONS: CeremonyType[] = ['WEDDING', 'HOME_COMING'];

export default function NewAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', displayName: '', phone: '', temporaryPassword: '',
    ceremonyType: 'WEDDING' as CeremonyType,
    subscriptionStart: '', subscriptionEnd: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        displayName: form.displayName,
        phone: form.phone || undefined,
        temporaryPassword: form.temporaryPassword,
        ceremonyType: form.ceremonyType,
        subscriptionStart: form.subscriptionStart ? new Date(form.subscriptionStart).toISOString() : undefined,
        subscriptionEnd: form.subscriptionEnd ? new Date(form.subscriptionEnd).toISOString() : undefined,
      };
      await api.post('/superadmin/admins', payload);
      toast.success('Admin account created!');
      router.push('/superadmin/admins');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/superadmin/admins" className="btn btn-ghost btn-sm" style={{ marginBottom: '16px', paddingLeft: '0' }}>
          <ArrowLeft size={16} /> Back to Admins
        </Link>
        <h1 className="page-title">Create New Admin</h1>
        <p className="page-subtitle">Provision a new wedding couple account</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'var(--color-gold)' }}>Account Details</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="input-label">Display Name *</label>
              <input id="new-admin-name" className="input" placeholder="e.g. Hiruni & Lakshitha" value={form.displayName} onChange={e => set('displayName', e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Email Address *</label>
              <input id="new-admin-email" type="email" className="input" placeholder="couple@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Phone Number</label>
              <input id="new-admin-phone" type="tel" className="input" placeholder="+94771234567" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="input-label">Temporary Password * (min. 8 characters)</label>
              <input id="new-admin-password" type="text" className="input" placeholder="SecurePass123!" value={form.temporaryPassword} onChange={e => set('temporaryPassword', e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="input-label">Ceremony Type *</label>
              <select id="new-admin-ceremony-type" className="input" value={form.ceremonyType} onChange={e => setForm(f => ({ ...f, ceremonyType: e.target.value as CeremonyType }))}>
                {CEREMONY_OPTIONS.map(c => <option key={c} value={c}>{CEREMONY_TYPE_LABELS[c]}</option>)}
              </select>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                Home-coming cards are sent from the groom&apos;s side — the invitation and PDF read groom first.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'var(--color-gold)' }}>Subscription</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="input-label">Start Date</label>
              <input id="new-admin-sub-start" type="date" className="input" value={form.subscriptionStart} onChange={e => set('subscriptionStart', e.target.value)} />
            </div>
            <div>
              <label className="input-label">End Date</label>
              <input id="new-admin-sub-end" type="date" className="input" value={form.subscriptionEnd} onChange={e => set('subscriptionEnd', e.target.value)} />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '10px' }}>Leave blank to set status as PENDING until dates are configured.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button id="create-admin-btn" type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Creating…' : 'Create Admin Account'}
          </button>
          <Link href="/superadmin/admins" className="btn btn-secondary btn-lg">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
