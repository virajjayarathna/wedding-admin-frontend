'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, LogOut, Crown, ChevronRight, KeyRound } from 'lucide-react';
import { getAuthUser, clearAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

const NAV = [
  { href: '/superadmin',        label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/admins', label: 'Manage Admins', icon: Users },
  { href: '/superadmin/account', label: 'Account', icon: KeyRound },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const u = getAuthUser();
    if (!u || u.role !== 'SUPER_ADMIN') {
      router.replace('/superadmin/login');
      return;
    }
    setUser(u);
  }, [router]);

  function handleLogout() {
    clearAuth();
    toast.success('Signed out');
    router.push('/superadmin/login');
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', flexShrink: 0, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', position: 'sticky', top: 0, height: '100vh' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '28px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crown size={18} color="#000" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--color-text-primary)' }}>Super Admin</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/superadmin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`sidebar-item ${active ? 'active' : ''}`}>
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <div style={{ padding: '10px 12px', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Signed in as</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
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
