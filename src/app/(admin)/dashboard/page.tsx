'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, Hash, CalendarDays } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api, { getErrorMessage } from '@/lib/api';
import type { RsvpSummary, WeddingDetails } from '@/lib/types';

// ─── Countdown — fully client-side to avoid hydration mismatch ────────────────
function Countdown({ date }: { date: string }) {
  // Start with null so server renders nothing, client fills in after mount
  const [parts, setParts] = useState<{ days: number; hrs: number; min: number; sec: number } | null>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    function tick() {
      const diff = new Date(date).getTime() - Date.now();
      if (diff <= 0) {
        setPast(true);
        return;
      }
      setParts({
        days: Math.floor(diff / 86400000),
        hrs:  Math.floor((diff % 86400000) / 3600000),
        min:  Math.floor((diff % 3600000) / 60000),
        sec:  Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [date]);

  // Don't render anything until client hydrates — avoids mismatch
  if (parts === null && !past) return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Calculating…</div>;
  if (past) return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Wedding day has passed — congratulations! 🎉</div>;

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {Object.entries(parts!).map(([label, val]) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700, color: 'var(--color-gold)', lineHeight: 1 }}>{String(val).padStart(2, '0')}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

const RSVP_COLORS = { attending: '#22c55e', declining: '#ef4444', pending: '#94a3b8', maybe: '#f59e0b' };

export default function AdminDashboardPage() {
  const [rsvp, setRsvp] = useState<RsvpSummary | null>(null);
  const [wedding, setWedding] = useState<WeddingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/wedding').then(r => setWedding(r.data.data)),
      api.get('/admin/guests/rsvp-summary').then(r => setRsvp(r.data.data)),
    ]).catch(e => {
      if (e?.response?.status !== 404) toast.error(getErrorMessage(e));
    }).finally(() => setLoading(false));
  }, []);

  const pieData = rsvp ? [
    { name: 'Attending', value: rsvp.attending, color: RSVP_COLORS.attending },
    { name: 'Declining', value: rsvp.declining, color: RSVP_COLORS.declining },
    { name: 'Pending',   value: rsvp.pending,   color: RSVP_COLORS.pending },
    { name: 'Maybe',     value: rsvp.maybe,     color: RSVP_COLORS.maybe },
  ].filter(d => d.value > 0) : [];

  // Use date-fns format (locale-independent) instead of toLocaleDateString
  const weddingDateFormatted = wedding?.weddingDate
    ? format(new Date(wedding.weddingDate), 'EEEE, MMMM d, yyyy')
    : null;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">
          {wedding ? `${wedding.brideName} & ${wedding.groomName}` : 'Your Dashboard'}
        </h1>
        <p className="page-subtitle">
          {weddingDateFormatted ? `Wedding on ${weddingDateFormatted}` : 'Set up your wedding page to get started'}
        </p>
      </div>

      {!wedding && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💍</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Set Up Your Wedding Page</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>Start by creating your wedding details to generate your invitation link.</p>
          <Link href="/wedding/edit" className="btn btn-primary btn-lg">Get Started →</Link>
        </div>
      )}

      {/* RSVP Stat Cards */}
      {rsvp && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Guests',      value: rsvp.totalGuests,             color: 'var(--color-gold)',   icon: <Users size={20} /> },
            { label: 'Attending',         value: rsvp.attending,               color: '#22c55e',             icon: <UserCheck size={20} /> },
            { label: 'Declining',         value: rsvp.declining,               color: '#ef4444',             icon: <UserX size={20} /> },
            { label: 'Pending',           value: rsvp.pending,                 color: '#94a3b8',             icon: <Clock size={20} /> },
            { label: 'Head Count',        value: rsvp.totalConfirmedHeadcount, color: 'var(--color-info)',   icon: <Hash size={20} /> },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Countdown */}
        {wedding?.weddingDate && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CalendarDays size={18} style={{ color: 'var(--color-gold)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Countdown</h2>
            </div>
            <Countdown date={wedding.weddingDate} />
          </div>
        )}

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>RSVP Breakdown</h2>
            <div style={{ height: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)', borderRadius: '8px', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="card" style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/wedding/edit" className="btn btn-secondary">✏️ Edit Wedding Page</Link>
        <Link href="/guests" className="btn btn-secondary">👥 Manage Guests</Link>
        <Link href="/guests?action=add" className="btn btn-primary">+ Add Guest</Link>
      </div>
    </div>
  );
}
