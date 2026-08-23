'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import { CEREMONY_TYPE_LABELS, type Admin, type AdminStatus } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

function StatusBadge({ status }: { status: AdminStatus }) {
  const map: Record<AdminStatus, string> = { ACTIVE: 'badge-active', PENDING: 'badge-pending', EXPIRED: 'badge-expired', SUSPENDED: 'badge-suspended' };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}

export default function AdminsListPage() {
  const searchParams = useSearchParams();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const limit = 20;

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const { data } = await api.get(`/superadmin/admins?${params}`);
      setAdmins(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Admin Accounts</h1>
          <p className="page-subtitle">{total} total clients</p>
        </div>
        <Link href="/superadmin/admins/new" className="btn btn-primary"><Plus size={16} /> New Admin</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input id="admin-search" className="input" style={{ paddingLeft: '36px' }} placeholder="Search by name or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="tab-bar" style={{ flex: 'none' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} className={`tab-btn ${status === f.value ? 'active' : ''}`} onClick={() => { setStatus(f.value); setPage(1); }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Status</th>
              <th>Subscription End</th>
              <th>Wedding</th>
              <th>Ceremony</th>
              <th>Guests</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: '16px', width: j === 6 ? '40px' : '100%' }} /></td>
                  ))}
                </tr>
              ))
            ) : admins.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>No admins found</td></tr>
            ) : admins.map(admin => (
              <tr key={admin.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{admin.displayName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{admin.email}</div>
                </td>
                <td><StatusBadge status={admin.status} /></td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  {admin.subscriptionEnd ? format(new Date(admin.subscriptionEnd), 'MMM d, yyyy') : '—'}
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  {admin.wedding ? `${admin.wedding.brideName} & ${admin.wedding.groomName}` : <span style={{ color: 'var(--color-text-muted)' }}>Not set up</span>}
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  {CEREMONY_TYPE_LABELS[admin.ceremonyType] ?? CEREMONY_TYPE_LABELS.WEDDING}
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  {admin.wedding?._count?.guests ?? '—'}
                </td>
                <td>
                  <Link href={`/superadmin/admins/${admin.id}`} className="btn btn-ghost btn-sm btn-icon" title="Edit"><Pencil size={14} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Page {page} of {pages}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
