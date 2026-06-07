'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getTunnelDetail, updateTunnel, manageTunnelRoutes } from '@/lib/api';
import {
  Plus, Trash2, RefreshCw, Server, AlertTriangle, X,
  Shield, Info, Lock, Eye, EyeOff, Copy, ExternalLink,
  ChevronRight, Globe, Settings, Map
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TunnelDetail } from '@/lib/types';

const TABS = [
  { id: 'overview', name: 'Overview', icon: Info },
  { id: 'routes', name: 'CIDR Routes', icon: Map },
  { id: 'apps', name: 'Published Apps', icon: Globe },
];

export default function TunnelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tunnel, setTunnel] = useState<TunnelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showToken, setShowToken] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modals
  const [errorModal, setErrorModal] = useState({ open: false, msg: '' });
  const [addRouteModal, setAddRouteModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);

  // Form States
  const [newCidr, setNewCidr] = useState('');
  const [newName, setNewName] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getTunnelDetail(id);
      setTunnel(res.data.result || null);
      setNewName(res.data.result?.name || '');
    } catch (e: any) {
      setErrorModal({ open: true, msg: e?.response?.data?.message || 'Failed to fetch tunnel details' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRename = async () => {
    setProcessing(true);
    try {
      await updateTunnel(id, newName);
      setRenameModal(false);
      fetchDetail();
    } catch (e: any) {
      setErrorModal({ open: true, msg: e?.response?.data?.message || 'Failed to rename tunnel' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddRoute = async () => {
    setProcessing(true);
    try {
      await manageTunnelRoutes(id, 'ADD', newCidr);
      setAddRouteModal(false);
      setNewCidr('');
      fetchDetail();
    } catch (e: any) {
      setErrorModal({ open: true, msg: e?.response?.data?.message || 'Failed to add route' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    setProcessing(true);
    try {
      await manageTunnelRoutes(id, 'DELETE', undefined, routeId);
      fetchDetail();
    } catch (e: any) {
      setErrorModal({ open: true, msg: e?.response?.data?.message || 'Failed to delete route' });
    } finally {
      setProcessing(false);
    }
  };

  // Ingress Rules State
  /* 
  const [ingressModal, setIngressModal] = useState<{
    open: boolean;
    idx: number;
    rule: IngressRule;
  }>({ open: false, idx: -1, rule: { hostname: '', service: '' } });

  const handleUpdateConfig = async (newRules: IngressRule[]) => {
    setProcessing(true);
    try {
      await manageTunnelConfig(id, newRules);
      fetchDetail();
    } catch (e: any) {
      setErrorModal({ open: true, msg: e?.response?.data?.message || 'Failed to update configuration' });
    } finally {
      setProcessing(false);
    }
  };

  const saveIngressRule = async () => {
    if (!tunnel) return;
    let newRules = [...(tunnel.config?.ingress || [])];
    if (ingressModal.idx === -1) {
      // Add new rule before the last (default) rule
      const defaultRuleIdx = newRules.findIndex(r => !r.hostname);
      if (defaultRuleIdx !== -1) {
        newRules.splice(defaultRuleIdx, 0, ingressModal.rule);
      } else {
        newRules.push(ingressModal.rule);
      }
    } else {
      newRules[ingressModal.idx] = ingressModal.rule;
    }
    await handleUpdateConfig(newRules);
    setIngressModal({ open: false, idx: -1, rule: { hostname: '', service: '' } });
  };

  const deleteIngressRule = async (idx: number) => {
    if (!tunnel) return;
    if (!confirm('Are you sure you want to remove this ingress rule?')) return;
    let newRules = [...(tunnel.config?.ingress || [])];
    newRules.splice(idx, 1);
    await handleUpdateConfig(newRules);
  }; */

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  if (!tunnel) return (
    <AppLayout>
      <div className="glass-panel p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Tunnel not found</h2>
        <button onClick={() => window.history.back()} className="text-[#f38020] hover:underline">Go Back</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
          <button onClick={() => window.history.back()} className="hover:text-white transition-colors">Tunnels</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-300">{tunnel.name}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent border border-white/10 ${tunnel.status === 'CONNECTED' ? 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' : ''}`}>
              <Server className={`w-6 h-6 ${tunnel.status === 'CONNECTED' ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                {tunnel.name}
                <button onClick={() => setRenameModal(true)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                  <Settings className="w-4 h-4" />
                </button>
              </h1>
              <p className="text-slate-500 font-mono text-sm">{tunnel.cfTunnelId}</p>
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 text-sm font-bold ${tunnel.status === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
            <div className={`w-2 h-2 rounded-full ${tunnel.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-500'}`} />
            {tunnel.status === 'CONNECTED' ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-max border border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-[#f38020] text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#f38020]" />
                  Tunnel Overview
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Created At</label>
                    <p className="text-white font-medium">{tunnel.createdAt ? new Date(tunnel.createdAt).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Last seen</label>
                    <p className="text-white font-medium">
                      {tunnel.conns_active_at ? new Date(tunnel.conns_active_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Account ID</label>
                    <p className="text-white font-mono text-sm">{tunnel.cfOverview?.account_id || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Architecture</label>
                    <p className="text-white font-medium">cloudflared</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 border-orange-500/10">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#f38020]" />
                  Tunnel Token
                </h3>
                <p className="text-slate-400 text-sm mb-4">Use this token to authenticate your local cloudflared connector.</p>

                <div className="relative group/token">
                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-4 overflow-hidden">
                    <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                    <div className="flex-1 font-mono text-xs break-all text-slate-300 pr-10">
                      {showToken ? tunnel.token : '•'.repeat(64)}
                    </div>
                    <div className="absolute right-4 flex items-center gap-2 opacity-0 group-hover/token:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        title={showToken ? "Hide Token" : "Show Token"}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => tunnel.token && copyToClipboard(tunnel.token)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        title="Copy Token"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400 text-sm">Applications</span>
                    <span className="text-white font-bold">{tunnel.config?.ingress?.filter((i) => i.hostname).length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400 text-sm">CIDR Routes</span>
                    <span className="text-white font-bold">{tunnel.routes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400 text-sm">Active Connections</span>
                    <span className="text-white font-bold">{tunnel.cfOverview?.connections?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="glass-panel overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-white">CIDR Routes</h3>
                <p className="text-sm text-slate-500 mt-1">Manage private network routes for this tunnel</p>
              </div>
              <button onClick={() => setAddRouteModal(true)} className="btn-orange text-sm px-4 py-2">
                <Plus className="w-4 h-4" /> Add Route
              </button>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                  <th className="px-6 py-4">Network Route</th>
                  <th className="px-6 py-4">Tunnel</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tunnel.routes?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">No network routes configured</td>
                  </tr>
                ) : tunnel.routes.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.01] transition-colors group/row">
                    <td className="px-6 py-4">
                      <code className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">{r.network}</code>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{tunnel.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRoute(r.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover/row:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="glass-panel overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-white">Published Applications</h3>
                <p className="text-sm text-slate-500 mt-1">Ingress rules from Cloudflare Tunnel configuration</p>
              </div>
              <button
                onClick={() => router.push(`/applications?add=true&tunnelId=${id}`)}
                className="btn-orange text-sm px-4 py-2"
              >
                <Plus className="w-4 h-4" /> Add Application
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {!tunnel.config?.ingress?.length ? (
                <div className="p-12 text-center text-slate-500 italic">No published applications found</div>
              ) : tunnel?.config?.ingress?.map((rule, idx) => (
                <div key={idx} className={`p-6 flex justify-between items-center hover:bg-white/[0.01] transition-colors group/rule ${!rule.hostname ? 'bg-black/20 opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {rule.hostname ? <Globe className="w-5 h-5 text-blue-400" /> : <AlertTriangle className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{rule.hostname || 'Default (Fallback)'}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">{rule.service}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rule.hostname && (
                      <>
                        <a href={`https://${rule.hostname}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {/*  <button
                          onClick={() => setIngressModal({ open: true, idx: idx, rule: { ...rule } })}
                          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[#f38020] transition-all opacity-0 group-hover/rule:opacity-100"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteIngressRule(idx)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover/rule:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button> */}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={renameModal} onClose={() => setRenameModal(false)} title="Rename Tunnel" maxWidth="sm">
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Tunnel Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="input-glass"
              placeholder="Primary Tunnel"
            />
          </div>
          <button onClick={handleRename} disabled={processing} className="btn-orange w-full py-3">
            {processing ? <span className="animate-spin" /> : 'Update Tunnel'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={addRouteModal} onClose={() => setAddRouteModal(false)} title="Add CIDR Route" maxWidth="sm">
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">IP Range (CIDR)</label>
            <input
              type="text"
              value={newCidr}
              onChange={e => setNewCidr(e.target.value)}
              className="input-glass"
              placeholder="192.168.1.0/24"
            />
            <p className="text-[10px] text-slate-500">The IP destination range for this route.</p>
          </div>
          <button onClick={handleAddRoute} disabled={processing} className="btn-orange w-full py-3">
            {processing ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Create Route'}
          </button>
        </div>
      </Modal>

      {/* <Modal
        isOpen={ingressModal.open}
        onClose={() => setIngressModal({ ...ingressModal, open: false })}
        title={ingressModal.idx === -1 ? "Add Application" : "Edit Ingress Rule"}
        maxWidth="sm"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Hostname</label>
            <input
              type="text"
              value={ingressModal.rule.hostname || ''}
              onChange={e => setIngressModal({ ...ingressModal, rule: { ...ingressModal.rule, hostname: e.target.value } })}
              className="input-glass"
              placeholder="app.example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Service (Internal Destination)</label>
            <input
              type="text"
              value={ingressModal.rule.service}
              onChange={e => setIngressModal({ ...ingressModal, rule: { ...ingressModal.rule, service: e.target.value } })}
              className="input-glass"
              placeholder="http://localhost:8080"
            />
          </div>
          <button onClick={saveIngressRule} disabled={processing} className="btn-orange w-full py-3">
            {processing ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Save Application'}
          </button>
        </div>
      </Modal> */}

      <Modal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false, msg: '' })}
        title="Error"
        maxWidth="sm"
        footer={<button onClick={() => setErrorModal({ open: false, msg: '' })} className="btn-orange w-full">Understand</button>}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300">{errorModal.msg}</p>
        </div>
      </Modal>
    </AppLayout>
  );
}
