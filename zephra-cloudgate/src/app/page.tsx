'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSetupStatus } from '@/lib/api';
import SetupWizard from '@/components/setup/SetupWizard';
import LoginPage from '@/components/auth/LoginPage';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  const initialize = async () => {
    const token = localStorage.getItem('auth_token');
    setAuthed(!!token);
    try {
      const res = await getSetupStatus();
      setSetupComplete(!!(res.data.result?.setupComplete));
      if (res.data.result?.setupComplete && token) {
        router.replace('/dashboard');
      }
      else if (!!(res.data.result?.setupComplete)) {
        router.replace('/login');
      }
    } catch (error) {

    }
    finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initialize();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!setupComplete) return <SetupWizard />;

  /*  if (!authed) {
     router.replace('/login');
     return null;
   } */

  return null;
}
