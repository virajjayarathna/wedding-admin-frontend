'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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
      <aside style={{ width: '240px', flexShrink: 0, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', position: 'sticky', top: 0, height: '100vh' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '28px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Heart size={18} color="#000" fill="#000" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{user.displayName || 'Wedding Portal'}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Admin Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`sidebar-item ${active ? 'active' : ''}`}>
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}

          {/* Preview link */}
          <a href={`${guestBaseUrl}`} target="_blank" rel="noopener noreferrer" className="sidebar-item" style={{ marginTop: '8px' }}>
            <ExternalLink size={17} />
            Preview Page
          </a>
        </nav>

        {/* Subscription badge */}
        {user.subscriptionEnd && (
          <div style={{ margin: '0 4px 8px', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Subscription ends</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {new Date(user.subscriptionEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}

        {/* User */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <div style={{ padding: '10px 12px', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Signed in as</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          <button className="sidebar-item" style={{ width: '100%', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }} onClick={handleLogout}>
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
