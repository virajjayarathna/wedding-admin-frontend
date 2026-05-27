'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { LayoutDashboard, Settings, Users, LogOut, Heart, ChevronRight, ExternalLink } from 'lucide-react';
import { getAuthUser, clearAuth } from '@/lib/auth';
import type { AuthUser } from '@/lib/types';
import toast from 'react-hot-toast';

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/wedding/edit',  label: 'Wedding Editor', icon: Settings },
  { href: '/guests',        label: 'Guests & RSVP',  icon: Users },
];

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const u = getAuthUser();
    if (!u || u.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }
    setUser(u);
  }, [router]);

  function handleLogout() {
    clearAuth();
    toast.success('Signed out');
    router.push('/login');
  }

  if (!user) return null;

  const guestBaseUrl = process.env.NEXT_PUBLIC_GUEST_BASE_URL || 'http://localhost:3001';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 10px',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', marginBottom: '24px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f472b6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(236,72,153,0.4)',
          }}>
            <Heart size={15} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '13px',
              color: '#f1f5f9',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '140px',
            }}>{user.displayName || 'Wedding Portal'}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Admin Portal</div>
          </div>
        </div>

        {/* Section label */}
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px', marginBottom: '6px' }}>
          Main
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`sidebar-item ${active ? 'active' : ''}`}>
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </Link>
            );
          })}

          {/* Preview link */}
          <a href={`${guestBaseUrl}`} target="_blank" rel="noopener noreferrer" className="sidebar-item" style={{ marginTop: '8px' }}>
            <ExternalLink size={16} />
            Preview Page
          </a>
        </nav>

        {/* Subscription badge */}
        {user.subscriptionEnd && (
          <div style={{ margin: '0 4px 8px', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#475569' }}>Subscription ends</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              {format(new Date(user.subscriptionEnd), 'MMM d, yyyy')}
            </div>
          </div>
        )}

        {/* User */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
          <div style={{ padding: '8px 10px', marginBottom: '2px' }}>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>Signed in as</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          <button
            className="sidebar-item"
            style={{ width: '100%', border: 'none', cursor: 'pointer', color: '#ef4444', background: 'transparent' }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg)' }}>
        <div style={{ padding: '28px 32px', maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
