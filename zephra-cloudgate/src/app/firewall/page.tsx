'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getFirewallPolicies, deleteFirewallPolicy } from '@/lib/api';
import { Plus, Trash2, Activity, Globe, Shield, RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle, ShieldOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FirewallPolicy } from '@shared/types';

const TYPE_COLORS: Record<string, string> = {
  NETWORK: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  DNS: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  HTTP: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const ACTION_COLORS: Record<string, string> = {
  BLOCK: 'text-red-400 bg-red-500/10 border-red-500/30',
  ALLOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  AUDIT: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  ISOLATE: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
};

const FIREWALL_TABS = [
  { id: 'NETWORK', name: 'Network', icon: Activity },
  { id: 'DNS', name: 'DNS', icon: Globe },
  { id: 'HTTP', name: 'HTTP', icon: Shield },
];

export default function FirewallPage() {
  const router = useRouter();
  const [rules, setRules] = useState<FirewallPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'NETWORK' | 'DNS' | 'HTTP'>('NETWORK');

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const policiesRes = await getFirewallPolicies();
      setRules(policiesRes.data.result || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await deleteFirewallPolicy(id);
      fetchPolicies();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete policy');
    }
  }

  const filteredRules = rules.filter(r => r.type === activeTab);

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Firewall</h1>
          <p className="text-slate-400 text-sm mt-1">Configure advanced Network, DNS, and HTTP Gateway policies</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchPolicies} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => router.push('/firewall/create')} className="btn-orange">
            <Plus className="w-4 h-4" /> Add Policy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-8">
        {FIREWALL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all duration-200 text-sm font-semibold tracking-wide ${
              activeTab === tab.id
                ? 'border-[#f38020] text-white bg-white/5 shadow-[inset_0_-10px_10px_-10px_rgba(243,128,32,0.1)]'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#f38020]' : 'text-slate-500'}`} />
            {tab.name}
            {rules.filter(r => r.type === tab.id).length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === tab.id ? 'bg-[#f38020] text-white' : 'bg-white/10 text-slate-400'
              }`}>
                {rules.filter(r => r.type === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm animate-pulse">Syncing with Cloudflare...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="glass-panel p-20 text-center border-dashed border-white/5">
          <div className="w-20 h-20 bg-orange-500/5 border border-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldOff className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No {activeTab} Policies</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">Start securing your {activeTab.toLowerCase()} team traffic by adding your first rule.</p>
          <button onClick={() => router.push('/firewall/create')} className="btn-orange px-8">
            <Plus className="w-4 h-4" /> Add Policy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRules.sort((a, b) => (a.precedence || 0) - (b.precedence || 0)).map((rule) => (
            <div 
              key={rule.id} 
              onClick={() => router.push(`/firewall/${rule.id}`)}
              className="glass-panel p-6 border-white/5 hover:border-[#f38020]/20 transition-all group cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-white group-hover:text-[#f38020] transition-colors truncate max-w-[280px]">{rule.name}</h3>
                    {rule.enabled ? (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 font-bold uppercase tracking-wider">
                        <XCircle className="w-2.5 h-2.5" />
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed min-h-[40px]">
                    {rule.description || "No description provided."}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={(e) => handleDelete(e, rule.id)}
                    className="p-2.5 rounded-xl bg-red-500/5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border tracking-wide uppercase ${TYPE_COLORS[rule.type] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                    {rule.type}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border tracking-wide uppercase ${ACTION_COLORS[rule.action] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                    {rule.action}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Edited {rule.updated_at ? new Date(rule.updated_at).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Deployment Error"
        maxWidth="sm"
        footer={<button onClick={() => setErrorModalOpen(false)} className="btn-orange w-full">Got it</button>}
      >
        <div className="flex flex-col items-center text-center space-y-4 p-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Failed to update Cloudflare</p>
            <p className="text-slate-300 text-sm mt-1">{errorMessage}</p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
