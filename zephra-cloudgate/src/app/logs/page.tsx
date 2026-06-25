'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Activity, Shield, Key, AlertTriangle, Search, Filter, Download } from 'lucide-react';

export default function LogsPage() {
  const logs = [
    { id: 1, type: 'AUTH', user: 'admin@zephra.cloud', action: 'Successful Login', status: 'SUCCESS', time: '2 mins ago', ip: '192.168.1.5' },
    { id: 2, type: 'FIREWALL', user: 'System', action: 'Blocked Domain: malware.ru', status: 'BLOCKED', time: '5 mins ago', ip: '10.0.0.12' },
    { id: 3, type: 'TUNNEL', user: 'External', action: 'Connected to SSH Gateway', status: 'SUCCESS', time: '12 mins ago', ip: '45.12.3.99' },
    { id: 4, type: 'POLICY', user: 'admin@zephra.cloud', action: 'Updated Global DNS Policy', status: 'UPDATED', time: '1 hour ago', ip: '192.168.1.5' },
  ];

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
          <p className="text-slate-400 text-sm">Comprehensive activity and security event monitoring.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-ghost !border-white/10 text-xs px-3 py-2 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="btn-orange text-xs px-3 py-2 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter Events
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Type</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actor / User</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {log.type === 'AUTH' ? <Key className="w-3.5 h-3.5 text-blue-400" /> : log.type === 'FIREWALL' ? <Shield className="w-3.5 h-3.5 text-[#f38020]" /> : <Activity className="w-3.5 h-3.5 text-purple-400" />}
                    <span className="text-xs font-bold text-white">{log.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-300">{log.user}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{log.action}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                    log.status === 'BLOCKED' ? 'text-red-400 bg-red-500/10 border-red-500/30' : 
                    'text-blue-400 bg-blue-500/10 border-blue-500/30'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{log.ip}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center text-[10px] text-slate-600 font-medium">
          Showing latest security events • Zephra CloudGate Internal Audit System
        </div>
      </div>
    </AppLayout>
  );
}
