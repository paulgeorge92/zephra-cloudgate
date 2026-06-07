'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Grid, Network, Users, Shield, Activity, Settings, Cloud, LogOut, HardDrive, Flame, List } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', order: 1 },
  { href: '/users', icon: Users, label: 'Users', order: 2 },
  { href: '/tunnels', icon: Network, label: 'Tunnels', order: 3 },
  { href: '/applications', icon: Grid, label: 'Applications', order: 4 },
  { href: '/devices', icon: HardDrive, label: 'Devices', order: 5 },
  { href: '/firewall', icon: Flame, label: 'Firewall', order: 6 },
  { href: '/policies', icon: Shield, label: 'Policies', order: 7 },
  { href: '/lists', icon: List, label: 'Reusable Lists', order: 8 },
  { href: '/logs', icon: Activity, label: 'Logs', order: 9 },
];

export default function Sidebar({ serverName, logoUrl }: { serverName?: string; logoUrl?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem('auth_token');
    router.replace('/');
  }

  return (
    <aside className="w-64 glass-panel m-4 flex flex-col justify-between shrink-0">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
            !logoUrl ? 'bg-[#f38020] shadow-[0_0_15px_rgba(243,128,32,0.4)]' : ''
          }`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover"/>
            ) : (
              <Cloud className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base text-white block leading-tight truncate">{serverName || 'CloudGate'}</span>
            <span className="text-[10px] text-slate-500">Zero Trust Panel</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {navItems.sort((a, b) => a.order - b.order).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#f38020]/10 text-[#f38020] border border-[#f38020]/20 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 space-y-1">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all w-full text-left">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
}
