'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Heart } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/login', { email, password });
      saveAuth(data.token, data.user);
      toast.success(`Welcome back, ${data.user.displayName}!`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(30,41,59,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)', boxShadow: '0 8px 32px rgba(236,72,153,0.25)' }}>
            <Heart size={28} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Wedding Portal</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '6px', fontSize: '14px' }}>Sign in to manage your wedding</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label" htmlFor="admin-email">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--color-text-muted)' }} />
                <input
                  id="admin-email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="couple@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="admin-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--color-text-muted)' }} />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '38px', paddingRight: '42px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="admin-login-btn" type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'var(--color-text-muted)' }}>
          Super Admin?{' '}
          <a href="/superadmin/login" style={{ color:'var(--color-accent)', textDecoration:'none', fontWeight: 500 }}>Sign in here</a>
        </p>
      </div>
    </div>
  );
}
