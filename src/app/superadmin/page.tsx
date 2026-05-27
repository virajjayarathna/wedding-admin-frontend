'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, ContactRound } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import type { SuperAdminDashboard } from '@/lib/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href?: string;
}

function StatCard({ label, value, icon, color, href }: StatCardProps) {
  const inner = (
    <div className="stat-card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
        {icon}
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link> : inner;
}

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/superadmin/dashboard')
      .then(r => setData(r.data.data))
      .catch(e => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Platform Overview</h1>
        <p className="page-subtitle">System-wide metrics at a glance</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '96px', borderRadius: '16px' }} />)}
        </div>
      ) : data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Admins" value={data.totalAdmins}     icon={<Users size={22} />}       color="var(--color-gold)"    href="/superadmin/admins" />
          <StatCard label="Active"       value={data.activeAdmins}    icon={<UserCheck size={22} />}   color="var(--color-success)" href="/superadmin/admins?status=ACTIVE" />
          <StatCard label="Expired"      value={data.expiredAdmins}   icon={<Clock size={22} />}       color="var(--color-warning)" href="/superadmin/admins?status=EXPIRED" />
          <StatCard label="Suspended"    value={data.suspendedAdmins} icon={<UserX size={22} />}       color="var(--color-error)"   href="/superadmin/admins?status=SUSPENDED" />
          <StatCard label="Total Guests" value={data.totalGuests}     icon={<ContactRound size={22} />} color="var(--color-info)" />
        </div>
      ) : null}

      <div className="card" style={{ marginTop: '28px', padding: '20px 24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/superadmin/admins/new" className="btn btn-primary">+ Create New Admin</Link>
          <Link href="/superadmin/admins" className="btn btn-secondary">View All Admins</Link>
        </div>
      </div>
    </div>
  );
}
