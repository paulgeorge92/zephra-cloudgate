'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { getTunnels, createTunnel, deleteTunnel, getCloudflareConfig } from '@/lib/api';
import { Plus, Network, Trash2, RefreshCw, Activity, ExternalLink, Clock, Server, AlertTriangle, X, Layers } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { Tunnel } from '@/lib/types';

export default function TunnelsPage() {
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [accountId, setAccountId] = useState('');
  
  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tunnelToDelete, setTunnelToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Error modal state
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchTunnels = (page = 1) => {
    setLoading(true);
    Promise.all([
      getTunnels(page, 10),
      getCloudflareConfig()
    ])
      .then(([tunnelsRes, cfRes]) => {
        setTunnels(tunnelsRes.data.result || []);
        if (tunnelsRes.data.result_info) {
          setPagination({
            total: tunnelsRes.data.result_info.total_count,
            pages: tunnelsRes.data.result_info.total_pages
          });
        }
        if (cfRes.data?.result?.accountId) {
          setAccountId(cfRes.data.result.accountId);
        }
        setCurrentPage(page);
      })
      .catch((e) => {
        console.error('Failed to fetch data', e);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTunnels(1);
  }, []);

  const handlePageChange = (page: number) => {
    fetchTunnels(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleCreate() {
    if (!newName) return;
    setCreating(true);
    try {
      await createTunnel(newName);
      setNewName('');
      setShowCreate(false);
      fetchTunnels(1);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Failed to create tunnel');
      setErrorModalOpen(true);
    } finally {
      setCreating(false);
    }
  }

  function handleDeleteClick(id: string, name: string) {
    setTunnelToDelete({ id, name });
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!tunnelToDelete) return;
    setDeleting(true);
    try {
      await deleteTunnel(tunnelToDelete.id);
      setDeleteModalOpen(false);
      setTunnelToDelete(null);
      fetchTunnels(1);
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Failed to delete tunnel');
      setErrorModalOpen(true);
    } finally {
      setDeleting(false);
    }
  }

  function formatUptime(activeAt: string | null) {
    if (!activeAt) return 'N/A';
    const start = new Date(activeAt).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, now - start);

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Cloudflare Tunnels</h1>
          <p className="text-slate-400 text-sm mt-1">Manage secure connections between your server and Cloudflare network</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-orange">
          <Plus className="w-4 h-4" /> Create Tunnel
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Create New Tunnel</h3>
          <div className="flex gap-3 max-w-md">
            <input type="text" placeholder="tunnel-name" value={newName} onChange={e => setNewName(e.target.value)}
              className="input-glass flex-1" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <button onClick={handleCreate} disabled={creating} className="btn-orange">
              {creating ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-[#f38020] animate-spin" />
        </div>
      ) : tunnels.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <Network className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No tunnels found</h3>
          <p className="text-slate-500 text-sm mb-6">Create a tunnel to securely connect your applications.</p>
          <button onClick={() => setShowCreate(true)} className="btn-orange"><Plus className="w-4 h-4" /> Create Tunnel</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {tunnels.map((t) => (
              <div key={t.id} className="glass-panel p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <Link href={`/tunnels/${t.id}`} className="flex items-center gap-4 group/identity">
                      <div className={`p-3 rounded-2xl transition-all group-hover/identity:scale-105 ${t.status === 'CONNECTED' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                        <Server className={`w-6 h-6 ${t.status === 'CONNECTED' ? 'text-emerald-400' : 'text-yellow-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg group-hover/identity:text-[#f38020] transition-colors">{t.name}</h3>
                        <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          ID: {t.cfTunnelId}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${t.status === 'CONNECTED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
                        {t.status}
                      </span>
                      <button onClick={() => handleDeleteClick(t.id, t.name)} className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-4 gap-x-6 mb-6 py-4 border-y border-white/5">
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
                      </div>
                      <p className={`text-xs font-bold ${t.status === 'CONNECTED' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {t.status === 'CONNECTED' ? 'Active' : 'Offline'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3 h-3 text-[#f38020]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Uptime</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {t.status === 'CONNECTED' ? formatUptime(t.conns_active_at || null) : '—'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Layers className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Apps</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {t.applicationCount || 0}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[80px] relative group/routes">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Network className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Routes</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {t.routes?.length || 0}
                      </p>
                      {t.routes && t.routes.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-2 invisible group-hover/routes:visible bg-black/95 border border-white/10 rounded-lg p-3 z-20 w-max max-w-[200px] shadow-2xl backdrop-blur-xl">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Network Routes</p>
                          <ul className="space-y-1">
                            {t.routes.map((r: string) => (
                              <li key={r} className="text-xs font-mono text-emerald-400">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center px-1">
                  <a
                    href={`https://dash.cloudflare.com/${accountId || '0'}/one/networks/connectors/cloudflare-tunnels/cfd_tunnel/${t.cfTunnelId}/edit?tab=overview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-slate-400 hover:text-[#f38020] transition-all flex items-center gap-1.5 group/guide"
                  >
                    <Server className="w-3.5 h-3.5 transition-transform group-hover/guide:scale-110" />
                    Connector Installation Guide
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/guide:opacity-100 transition-all" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mb-8">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete Tunnel"
        maxWidth="sm"
        footer={(
          <div className="flex gap-3 justify-end">
            <button 
              onClick={() => setDeleteModalOpen(false)} 
              disabled={deleting}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete} 
              disabled={deleting}
              className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(239,68,68,0.35)]"
            >
              {deleting ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        )}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Are you sure?</p>
            <p className="text-slate-400 text-sm mt-1">
              You are about to delete <span className="text-white font-medium">"{tunnelToDelete?.name}"</span>. 
              This action cannot be undone and will disconnect any applications linked to this tunnel.
            </p>
          </div>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Action Failed"
        maxWidth="sm"
        footer={(
          <div className="flex justify-end">
            <button 
              onClick={() => setErrorModalOpen(false)} 
              className="btn-orange w-full"
            >
              Understand
            </button>
          </div>
        )}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Error Occurred</p>
            <p className="text-slate-400 text-sm mt-1">{errorMessage}</p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
