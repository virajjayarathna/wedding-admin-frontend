'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api, { getErrorMessage } from '@/lib/api';
import { CEREMONY_TYPE_LABELS, type Admin, type AdminStatus, type CeremonyType } from '@/lib/types';

const STATUS_OPTIONS: AdminStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED'];
const CEREMONY_OPTIONS: CeremonyType[] = ['WEDDING', 'HOME_COMING'];

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', phone: '', status: '' as AdminStatus, ceremonyType: 'WEDDING' as CeremonyType, subscriptionStart: '', subscriptionEnd: '' });

  useEffect(() => {
    api.get(`/superadmin/admins/${id}`)
      .then(r => {
        const a: Admin = r.data.data;
        setAdmin(a);
        setForm({
          displayName: a.displayName,
          email: a.email,
          phone: a.phone || '',
          status: a.status,
          ceremonyType: a.ceremonyType ?? 'WEDDING',
          subscriptionStart: a.subscriptionStart ? a.subscriptionStart.substring(0, 10) : '',
          subscriptionEnd: a.subscriptionEnd ? a.subscriptionEnd.substring(0, 10) : '',
        });
      })
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/superadmin/admins/${id}`, { displayName: form.displayName, email: form.email, phone: form.phone || undefined, ceremonyType: form.ceremonyType });
      await api.patch(`/superadmin/admins/${id}/subscription`, {
        status: form.status,
        subscriptionStart: form.subscriptionStart ? new Date(form.subscriptionStart).toISOString() : null,
        subscriptionEnd: form.subscriptionEnd ? new Date(form.subscriptionEnd).toISOString() : null,
      });
      toast.success('Admin updated successfully');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${admin?.displayName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/superadmin/admins/${id}`);
      toast.success('Admin deleted');
      router.push('/superadmin/admins');
    } catch (e) {
      toast.error(getErrorMessage(e));
      setDeleting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setResetLoading(true);
    try {
      await api.post(`/superadmin/admins/${id}/reset-password`, { newPassword });
      toast.success('Password reset successfully');
      setNewPassword('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setResetLoading(false);
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (!admin) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-error)' }}>Admin not found</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '680px' }}>
      <Link href="/superadmin/admins" className="btn btn-ghost btn-sm" style={{ marginBottom: '16px', paddingLeft: '0' }}><ArrowLeft size={16} /> Back</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">{admin.displayName}</h1>
          <p className="page-subtitle">Member since {format(new Date(admin.createdAt), 'MMMM d, yyyy')}</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}><Trash2 size={14} />{deleting ? 'Deleting…' : 'Delete'}</button>
      </div>

      <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'var(--color-gold)' }}>Profile</h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div><label className="input-label">Display Name</label><input className="input" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required /></div>
            <div><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div><label className="input-label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div>
              <label className="input-label">Ceremony Type</label>
              <select className="input" value={form.ceremonyType} onChange={e => setForm(f => ({ ...f, ceremonyType: e.target.value as CeremonyType }))}>
                {CEREMONY_OPTIONS.map(c => <option key={c} value={c}>{CEREMONY_TYPE_LABELS[c]}</option>)}
              </select>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                Changing this re-renders the couple&apos;s invitation and PDF straight away — home-coming reads groom first.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'var(--color-gold)' }}>Subscription</h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label className="input-label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AdminStatus }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label className="input-label">Start Date</label><input type="date" className="input" value={form.subscriptionStart} onChange={e => setForm(f => ({ ...f, subscriptionStart: e.target.value }))} /></div>
              <div><label className="input-label">End Date</label><input type="date" className="input" value={form.subscriptionEnd} onChange={e => setForm(f => ({ ...f, subscriptionEnd: e.target.value }))} /></div>
            </div>
          </div>
        </div>

        {admin.wedding && (
          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-gold)' }}>Wedding Info</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Couple: </span>{admin.wedding.brideName} & {admin.wedding.groomName}</div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Slug: </span>/{admin.wedding.weddingSlug}</div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Date: </span>{format(new Date(admin.wedding.weddingDate), 'MMM d, yyyy')}</div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Published: </span>{admin.wedding.isPublished ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>
        )}

        <button id="save-admin-btn" type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </form>

      {/* Password Reset */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-gold)' }}>Reset Password</h2>
        <form onSubmit={handleResetPassword} style={{ display: 'flex', gap: '12px' }}>
          <input className="input" type="text" placeholder="New password (min. 8 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-secondary" disabled={resetLoading}><RotateCcw size={14} />{resetLoading ? '…' : 'Reset'}</button>
        </form>
      </div>
    </div>
  );
}
