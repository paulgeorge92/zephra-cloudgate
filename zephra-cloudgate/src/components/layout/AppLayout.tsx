'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { getMe, getServerProfile } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [serverName, setServerName] = useState('CloudGate');
  const [serverLogo, setServerLogo] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { router.replace('/login'); return; }

    const fetchBranding = async () => {
      try {
        const res = await getServerProfile();
        if (res.data) {
          setServerName(res.data.result?.name || '');
          setServerLogo(res.data.result?.logoUrl || '');
        }
      } catch (err) {
        console.error('Failed to fetch branding:', err);
      }
    };
    getMe()
      .then(() => {
        fetchBranding(); // Initial fetch
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        router.replace('/login');
      });

    // Add event listener for branding updates
    window.addEventListener('server-branding-updated', fetchBranding);

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('server-branding-updated', fetchBranding);
    };
  }, [router]); // router is a dependency because it's used in the effect

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen antialiased">
      <Sidebar serverName={serverName} logoUrl={serverLogo} />
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
