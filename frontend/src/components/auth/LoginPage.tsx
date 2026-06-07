import { useState, useEffect } from 'react';
import { login, getServerProfile } from '@/lib/api';
import { Lock, Mail, Cloud, Eye, EyeOff } from 'lucide-react';
import { ServerProfile } from '@/lib/types';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<ServerProfile | null>(null);

  useEffect(() => {
    getServerProfile()
      .then((res) => setBranding(res.data.result || null))
      .catch(() => { });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      setLoading(true);
      const res = await login(email, password);
      if (res.data.result?.access_token) {
        localStorage.setItem('auth_token', res.data.result.access_token);
      }
      onLogin();
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shrink-0 ${!branding?.logoUrl ? 'bg-[#f38020] shadow-[0_0_30px_rgba(243,128,32,0.4)]' : ''
            }`}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Cloud className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white text-center">{branding?.name || 'Zephra CloudGate'}</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your control plane</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-0.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="input-glass pl-12"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-0.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPass ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-glass pl-12 pr-10"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-orange w-full justify-center mt-2">
            {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
