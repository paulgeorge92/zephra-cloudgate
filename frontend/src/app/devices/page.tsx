'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getDevices } from '@/lib/api';
import { Smartphone, Laptop, HardDrive, Search, ShieldCheck } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { Device } from '@/lib/types';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await getDevices();
      setDevices(response.data.result || []);
    } catch (error) {
      setDevices([]);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <AppLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Devices</h1>
          <p className="text-slate-400 text-sm">Managed end-user devices and their associated profiles.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search devices..." className="input-glass pl-10 w-64" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <HardDrive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No devices found</h3>
          <p className="text-slate-500 text-sm mb-6">Install <a href="https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/download/" target="_blank" rel="noopener noreferrer" className="text-[#f38020]">Cloudflare One Agent</a> in your devices to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((d) => {
            const Icon = d.device_type === 'windows' || d.device_type === 'mac' || d.device_type === 'linux' ? Laptop : Smartphone;
            const isOnline = !!d.last_seen_at && (new Date().getTime() - new Date(d.last_seen_at).getTime() < 1000 * 60 * 10); // 10 minutes threshold for "Online"
            return (
              <div key={d.id} className="glass-panel p-6 hover:border-[#f38020]/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f38020]/10 border border-[#f38020]/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#f38020]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1 truncate">{d.name || d.device_type || 'Unknown Device'}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mb-4 truncate">{d.id}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${d.last_seen_at ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                    }`}>
                    <ShieldCheck className={`w-3 h-3 ${isOnline ? 'animate-pulse' : ''}`} /> {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>



                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Model</span>
                    <span className="text-slate-300 transition-colors group-hover:text-white">{`${(d.manufacturer || '').charAt(0)?.toUpperCase() + (d.manufacturer || '').slice(1)} ${d.model}`.trim()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Assigned User</span>
                    <span className="text-slate-300 transition-colors group-hover:text-white">{d.user?.email || ''}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Last Seen</span>
                    <span className="text-slate-300 transition-colors group-hover:text-white">{d.last_seen_at ? `${new Date(d.last_seen_at).toLocaleString()}` : 'Never'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Operating System</span>
                    <span className="text-slate-300 transition-colors group-hover:text-white">{`${(d.device_type || '').charAt(0)?.toUpperCase() + (d.device_type || '')?.slice(1)} ${d.os_version || ''}`.trim()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
