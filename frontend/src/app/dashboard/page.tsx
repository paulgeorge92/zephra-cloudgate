'use client';

import { useEffect, useState, useRef } from 'react';
import { Calendar, Grid, Network, Smartphone, Cloud, HardDrive, Usb, Globe2, Server, Wifi, EthernetPort } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { DonutChart, MiniCalendar, NetworkSparkline, StorageBar } from '@/components/dashboard/Charts';
import { getDashboard, getSystemStats, getWeather, getMe, getStorageStats } from '@/lib/api';
import LoadingScreen from '@/components/common/LoadingScreen';
import { DashboardSummary, SystemStats, WeatherStats, User as AppUser, DiskStats } from '@/lib/types';
import Link from 'next/link';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getWeatherIcon(code: number) {
  if (code === 0) return '☀️'; // Clear
  if (code < 4) return '⛅';  // Cloudy
  if (code < 50) return '🌫️'; // Fog
  if (code < 70) return '🌧️'; // Rain
  return '⛈️'; // Storm
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [system, setSystem] = useState<SystemStats | null>(null);
  const [weather, setWeather] = useState<WeatherStats | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [storage, setStorage] = useState<DiskStats[]>([]);
  const [now, setNow] = useState(new Date());
  const [networkHistory, setNetworkHistory] = useState<{ upload: number; download: number }[]>(
    Array(20).fill({ upload: 0, download: 0 })
  );
  const tickRef = useRef(0);


  useEffect(() => {
    // Initial data fetch
    setLoading(true);
    Promise.all([
      getDashboard(),
      getSystemStats(),
      getStorageStats(),
      getWeather(),
      getMe()
    ]).then(([statsRes, systemRes, storageRes, weatherRes, userRes]) => {
      setStats(statsRes.data?.result || null);
      setSystem(systemRes.data?.result || null);
      setStorage(storageRes.data?.result || []);
      setWeather(weatherRes.data?.result || null);
      setUser(userRes.data?.result || null);
    }).catch(err => {
      console.error('Initial fetch failed:', err);
    }).finally(() => {
      setLoading(false);
    });

    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const metricsInterval = setInterval(async () => {
      tickRef.current++;
      let res = await getSystemStats()
      let data = res.data.result
      setNetworkHistory(prev => [...prev.slice(1), {
        upload: data?.network?.uploadBps || 0,
        download: data?.network?.downloadBps || 0
      }]);
      if (tickRef.current % 3 === 0) {
        setSystem(data || null);
      } else {
        setSystem(prev => prev ? { ...prev, network: data?.network || prev.network } : data || null);
      }
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const statCards = [
    { label: 'Total Applications', value: stats?.applications ?? '-', icon: Grid, color: 'text-blue-400', glow: 'bg-blue-500/10', link: '/applications' },
    { label: 'Active Users', value: stats?.users ?? '-', icon: Cloud, color: 'text-green-400', glow: 'bg-green-500/10', link: '/users' },
    { label: 'Total Tunnels', value: stats?.tunnels ?? '-', icon: Network, color: 'text-[#f38020]', glow: 'bg-[#f38020]/10', link: '/tunnels' },
    { label: 'Registered Devices', value: stats?.devices ?? '-', icon: Smartphone, color: 'text-slate-300', glow: 'bg-slate-500/10', link: '/devices' },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <AppLayout>
      {/* Header */}
      <header className="flex flex-wrap gap-6 justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1.5">{getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'Admin'}</h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {formatDate(now)}
            <span className="mx-1">•</span>
            <span className="font-mono">{formatTime(now)}</span>
          </p>
        </div>

        {/* Weather Widget */}
        <div className="glass-panel px-6 py-4 flex items-center gap-6">
          {weather && !weather.error ? (
            <>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getWeatherIcon(weather.weatherCode)}</div>
                <div>
                  <div className="text-2xl font-bold text-white">{weather.temperature?.toFixed(0)}°C</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight truncate max-w-[80px]">
                    {weather.city || 'Loading...'}
                  </div>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex gap-5 text-sm">
                <div><div className="text-slate-400 text-[10px] mb-0.5 uppercase tracking-wide font-bold">Feels</div><div className="font-medium text-white text-xs">{weather.feelsLike?.toFixed(0)}°C</div></div>
                <div><div className="text-slate-400 text-[10px] mb-0.5 uppercase tracking-wide font-bold">UV</div><div className="font-medium text-white text-xs">{weather.uvIndex?.toFixed(1)}</div></div>
                <div><div className="text-slate-400 text-[10px] mb-0.5 uppercase tracking-wide font-bold">Humid</div><div className="font-medium text-white text-xs">{weather.humidity}%</div></div>
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm">Weather unavailable</div>
          )}
        </div>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, glow, link }) => (
          <Link key={label} href={link} className="glass-panel p-6 flex items-center justify-between relative overflow-hidden group">
            <div className={`absolute right-0 top-0 w-32 h-32 ${glow} rounded-full blur-3xl group-hover:opacity-200 transition-all`} />
            <div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">{label}</h3>
              <div className="text-4xl font-bold text-white">{value}</div>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </Link>
        ))}
      </section>

      {/* Main charts row */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-6">
        {/* Calendar */}
        <div className="glass-panel p-5 xl:col-span-2">
          <MiniCalendar />
        </div>

        {/* System Status */}
        <div className="glass-panel p-6 xl:col-span-3">
          <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-5">System Status</h3>
          <div className="flex justify-between items-center h-32">
            <DonutChart value={system?.cpu?.usage ?? 0} color="#f38020" label="CPU" sublabel={`${system?.cpu?.cores ?? 0} cores`} />
            <DonutChart value={system?.memory?.usagePercent ?? 0} color="#3b82f6" label="RAM"
              sublabel={`${((system?.memory?.used ?? 0) / 1e9).toFixed(1)} / ${((system?.memory?.total ?? 0) / 1e9).toFixed(1)} GB`} />
          </div>
        </div>

        {/* Storage */}
        <div className="glass-panel p-6 xl:col-span-3">
          <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-5 flex justify-between">
            Storage <span className="text-pink-400">💾</span>
          </h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {storage.length === 0 ? (
              <div className="text-center text-slate-500 text-xs">Loading storage data...</div>
            ) : (
              storage.map((disk, idx) => {
                let DiskIcon = <HardDrive className="w-4 h-4" />;
                if (disk.description === 'USB Storage') DiskIcon = <Usb className="w-4 h-4" />;
                else if (disk.description === 'Network Drive') DiskIcon = <Server className="w-4 h-4" />;
                return (
                  <StorageBar
                    key={disk.label}
                    label={`${disk.label} (${disk.description})`}
                    used={disk.used}
                    total={disk.total}
                    color={idx % 3 === 0 ? "linear-gradient(to right, #f38020, #f59648)" : (idx % 3 === 1 ? "#3b82f6" : "#10b981")}
                    icon={DiskIcon}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Network */}
        <div className="glass-panel p-6 xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">Network IP: {system?.network?.interfaceAddress.ipv4}</h3>
            <span className="text-[10px] font-bold text-orange-300 bg-[#f38020]/20 border border-[#f38020]/30 flex item-center gap-1 px-3 py-1 rounded-full uppercase tracking-wider">
              {
                system?.network?.interfaceName == "Wi-Fi" ? <Wifi className="w-4 h-4" /> : <EthernetPort className="w-4 h-4" />
              }
              {system?.network?.interfaceName || 'LIVE'}
            </span>
          </div>
          {/* <div className="mb-2">
            <span className="text-xs font-bold text-slate-500 tracking-widest">
              {system?.network?.interfaceAddress.ipv4}
            </span>
          </div> */}

          <NetworkSparkline
            upload={system?.network?.upload ?? "0 B/s"}
            download={system?.network?.download ?? "0 B/s"}
            history={networkHistory}
          />
        </div>
      </section>

      {/* Quick App Launcher */}
      <section className="glass-panel p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase">Quick Launcher</h3>
          <Link href="/applications" className="text-xs text-[#f38020] hover:underline">Manage Apps →</Link>
        </div>
        <div className="flex gap-4 flex-wrap">
          {[
            { name: 'Applications', icon: '📦', href: '/applications' },
            { name: 'Tunnels', icon: '🔗', href: '/tunnels' },
            { name: 'Users', icon: '👥', href: '/users' },
            { name: 'Firewall', icon: '🛡️', href: '/firewall' },
          ].map(app => (
            <a key={app.name} href={app.href}
              className="group w-24 h-24 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-[#f38020]/50 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(243,128,32,0.15)] hover:-translate-y-1">
              <div className="text-2xl">{app.icon}</div>
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">{app.name}</span>
            </a>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
