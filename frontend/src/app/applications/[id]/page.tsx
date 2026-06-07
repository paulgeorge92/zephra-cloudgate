'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { getApplication } from '@/lib/api';
import { Application, ApplicationExposureTypeEnum, Tunnel } from '@/lib/types';

type ApplicationDetail = Application & {
  publicUrls?: string[];
  tunnel?: Tunnel;
  policy?: Application['policy'] & {
    policyId?: string;
    name?: string;
    decision?: string;
  };
};

type HealthStatus = {
  status: 'CHECKING' | 'ONLINE' | 'OFFLINE' | 'UNSUPPORTED' | 'UNKNOWN';
  statusCode?: number;
  message?: string;
  checkedAt?: string;
};

const exposureConfig: Record<string, { label: string; icon: typeof Globe; className: string }> = {
  [ApplicationExposureTypeEnum.PUBLIC]: {
    label: 'Public',
    icon: Globe,
    className: 'border-green-500/30 bg-green-500/10 text-green-400',
  },
  [ApplicationExposureTypeEnum.PUBLIC_WITH_ACCESS]: {
    label: 'Protected',
    icon: ShieldCheck,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  [ApplicationExposureTypeEnum.WARP]: {
    label: 'Private (WARP)',
    icon: Lock,
    className: 'border-[#f38020]/30 bg-[#f38020]/10 text-[#f38020]',
  },
};

const healthConfig: Record<HealthStatus['status'], { label: string; className: string; dot: string }> = {
  CHECKING: {
    label: 'Checking',
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    dot: 'bg-slate-300 animate-pulse',
  },
  ONLINE: {
    label: 'Online',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  OFFLINE: {
    label: 'Offline',
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
    dot: 'bg-red-400',
  },
  UNSUPPORTED: {
    label: 'Unsupported',
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    dot: 'bg-yellow-300',
  },
  UNKNOWN: {
    label: 'Unknown',
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    dot: 'bg-slate-400',
  },
};

function normalizePublicUrls(app?: ApplicationDetail | null) {
  if (!app) return [];

  const rawUrls = [
    ...(((app as any).publicUrls || []) as string[]),
    ...(Array.isArray(app.publicUrl) ? app.publicUrl : app.publicUrl ? [app.publicUrl] : []),
  ];

  return Array.from(new Set(rawUrls.map(url => String(url).trim()).filter(Boolean)));
}

function formatPolicy(app: ApplicationDetail) {
  const policy = app.policy;

  if (!policy) {
    return {
      title: 'No policy configured',
      detail: 'Traffic is not linked to an application policy.',
      tone: 'text-slate-400',
    };
  }

  if (policy.type === 'OPEN') {
    return {
      title: 'Open Team Access',
      detail: 'Every authenticated user can access this application.',
      tone: 'text-emerald-300',
    };
  }

  return {
    title: policy.name || 'Restricted Access',
    detail: policy.policyId ? `Policy ID: ${policy.policyId}` : 'Restricted policy is enabled for this application.',
    tone: 'text-blue-300',
  };
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<HealthStatus>({ status: 'CHECKING' });

  const publicUrls = useMemo(() => normalizePublicUrls(app), [app]);
  const policy = app ? formatPolicy(app) : null;
  const exposure = app ? exposureConfig[app.exposureType] || exposureConfig.PUBLIC : exposureConfig.PUBLIC;
  const ExposureIcon = exposure.icon;
  const healthStyle = healthConfig[health.status];

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getApplication(params.id);
      setApp((response.data.result || null) as ApplicationDetail | null);
    } catch (err) {
      console.error('Failed to load application', err);
      setError('Application could not be loaded');
      setApp(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const checkHealth = useCallback(async (destinationUrl?: string) => {
    if (!destinationUrl) {
      setHealth({ status: 'UNKNOWN', message: 'No destination URL configured' });
      return;
    }

    setHealth({ status: 'CHECKING' });

    try {
      const response = await fetch('/api/application-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: destinationUrl }),
      });
      const result = await response.json();
      setHealth(result);
    } catch (err) {
      console.error('Failed to check application health', err);
      setHealth({ status: 'UNKNOWN', message: 'Health check failed' });
    }
  }, []);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  useEffect(() => {
    if (app) {
      checkHealth(app.destinationUrl);
    }
  }, [app, checkHealth]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/applications" className="btn-ghost flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          {app && (
            <button onClick={() => checkHealth(app.destinationUrl)} className="btn-ghost flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${health.status === 'CHECKING' ? 'animate-spin' : ''}`} /> Refresh Status
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 w-full">
            <div className="w-10 h-10 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
          </div>
        ) : error || !app ? (
          <div className="glass-panel p-12 text-center">
            <h1 className="text-xl font-bold text-white mb-2">Application unavailable</h1>
            <p className="text-sm text-slate-400">{error || 'No application was found for this ID.'}</p>
          </div>
        ) : (
          <>
            <div className="glass-panel p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  {app.logoUrl ? (
                    <img src={app.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                      <Server className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-white truncate">{app.name}</h1>
                    <p className="text-sm text-slate-400 mt-1 font-mono truncate">{app.destinationUrl || 'No destination configured'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${exposure.className}`}>
                    <ExposureIcon className="w-4 h-4" /> {exposure.label}
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${healthStyle.className}`}>
                    <span className={`w-2 h-2 rounded-full ${healthStyle.dot}`} /> {healthStyle.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <section className="xl:col-span-2 glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-[#f38020]" />
                  <h2 className="text-lg font-semibold text-white">Public URLs</h2>
                </div>
                {publicUrls.length > 0 ? (
                  <div className="space-y-2">
                    {publicUrls.map(url => (
                      <a
                        key={url}
                        href={`https://${url}`}
                        target="_blank"
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-200 hover:border-[#f38020]/30 hover:text-[#f38020] transition-all"
                      >
                        <span className="font-mono truncate">{url}</span>
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No public URLs are configured for this application.</p>
                )}
              </section>

              <section className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Route className="w-5 h-5 text-[#f38020]" />
                  <h2 className="text-lg font-semibold text-white">Destination</h2>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase font-semibold text-slate-500 mb-2">{app.destinationType}</p>
                  <p className="text-sm text-slate-200 font-mono break-all">{app.destinationUrl || '-'}</p>
                  <p className="text-xs text-slate-500 mt-3">{health.message || 'Health status will update automatically.'}</p>
                  {health.statusCode && <p className="text-xs text-slate-500 mt-1">HTTP {health.statusCode}</p>}
                </div>
              </section>

              <section className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-[#f38020]" />
                  <h2 className="text-lg font-semibold text-white">Policy</h2>
                </div>
                {policy && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <p className={`text-sm font-semibold ${policy.tone}`}>{policy.title}</p>
                    <p className="text-xs text-slate-500 mt-2">{policy.detail}</p>
                  </div>
                )}
              </section>

              <section className="xl:col-span-2 glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Waypoints className="w-5 h-5 text-[#f38020]" />
                  <h2 className="text-lg font-semibold text-white">Tunnel</h2>
                </div>
                {app.tunnel ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{app.tunnel.name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1">{app.tunnel.cfTunnelId || app.tunnel.id}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${app.tunnel.status === 'CONNECTED' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'}`}>
                        <span className={`w-2 h-2 rounded-full ${app.tunnel.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-yellow-300'}`} />
                        {app.tunnel.status}
                      </span>
                    </div>
                  </div>
                ) : app.tunnelId ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-sm font-semibold text-white">Registered tunnel</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{app.tunnelId}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No tunnel is registered for this application.</p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
