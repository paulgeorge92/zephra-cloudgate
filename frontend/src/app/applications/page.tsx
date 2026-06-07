'use client';

import { useEffect, useState, Suspense } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import AddApplicationModal from '@/components/applications/AddApplicationModal';
import { getApplications, deleteApplication } from '@/lib/api';
import { Plus, Globe, Lock, ShieldCheck, ExternalLink, Trash2, Layers, AlertTriangle, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Application, Tunnel } from '@/lib/types';

const exposureConfig: Record<string, { label: string; color: string; icon: any; glow: string }> = {
  PUBLIC: { label: 'Public', color: 'text-green-400', icon: Globe, glow: 'border-green-500/30 bg-green-500/10' },
  PUBLIC_WITH_ACCESS: { label: 'Protected', color: 'text-blue-400', icon: ShieldCheck, glow: 'border-blue-500/30 bg-blue-500/10' },
  WARP: { label: 'Private (WARP)', color: 'text-[#f38020]', icon: Lock, glow: 'border-[#f38020]/30 bg-[#f38020]/10' },
};

function ApplicationsContent() {
  const [apps, setApps] = useState<(Application & { tunnel?: Tunnel })[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTunnelId = searchParams.get('tunnelId') || undefined;

  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await getApplications();
      const apps = res.data.result || []
      setApps(apps);
    } catch (error) {
      console.log(error);
      setApps([]);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    if (searchParams.get('add') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);


  const handleDeleteClick = (id: string, name: string) => {
    setAppToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!appToDelete) return;
    setDeleting(true);
    try {
      await deleteApplication(appToDelete.id);
      setDeleteModalOpen(false);
      setAppToDelete(null);
      fetchApps();
    } catch (e) {
      console.error('Failed to delete application', e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your exposed applications and access policies</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-orange">
          <Plus className="w-4 h-4" /> Add Application
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 w-full">
          <div className="w-10 h-10 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        <div className="glass-panel p-16 text-center w-full">
          <Layers className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No applications yet</h3>
          <p className="text-slate-500 text-sm mb-6">Start by adding your first application to expose it through Cloudflare.</p>
          <button onClick={() => setShowModal(true)} className="btn-orange">
            <Plus className="w-4 h-4" /> Add First Application
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 w-full">
          {apps.map((app) => {
            const cfg = exposureConfig[app.exposureType] || exposureConfig.PUBLIC;
            const Icon = cfg.icon;
            return (
              <div
                key={app.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/applications/${app.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/applications/${app.id}`);
                  }
                }}
                className="glass-panel p-6 relative group cursor-pointer hover:border-[#f38020]/30 transition-all"
              >
                <div className={`absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.glow} ${cfg.color}`}>
                  <Icon className="w-3 h-3" /> {cfg.label}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {app.logoUrl ? (
                    <img src={app.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{app.name}</h3>
                    {app.publicUrl && app.publicUrl.length > 0 && (
                      <a href={`https://${app.publicUrl[0]}`} target="_blank"
                        className="text-xs text-slate-400 hover:text-[#f38020] flex items-center gap-1 mt-0.5 transition-colors truncate">
                        {app.publicUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-slate-500 font-mono truncate">{app.destinationUrl || '—'}</p>
                </div>

                {app.tunnel && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    via {app.tunnel.name}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteClick(app.id, app.name);
                    }}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddApplicationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchApps(); }}
          initialTunnelId={initialTunnelId || undefined}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete Application"
        maxWidth="sm"
        footer={(
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteModalOpen(false)} disabled={deleting} className="btn-ghost">Cancel</button>
            <button onClick={confirmDelete} disabled={deleting} className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(239,68,68,0.35)]">
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        )}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Are you sure?</p>
            <p className="text-slate-400 text-sm mt-1">You are about to delete <span className="text-white font-medium">&quot;{appToDelete?.name}&quot;</span>. This will stop external access immediately.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function ApplicationsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-10 h-10 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" /></div>}>
        <ApplicationsContent />
      </Suspense>
    </AppLayout>
  );
}
