'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getAccessPolicies, deleteAccessPolicy } from '@/lib/api';
import {
  Shield,
  Trash2,
  Plus,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { AccessPolicy } from '@shared/types';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const perPage = 10; // You can adjust this as needed

  const fetchPolicies = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAccessPolicies(page, perPage);
      if (res.data?.success === false) {
        throw new Error(res.data.message || 'Failed to fetch policies');
      }
      setPolicies(res.data.result || []);
      if (res.data.result_info) {
        setPagination({
          total: res.data.result_info.total_count,
          pages: res.data.result_info.total_pages
        });
      }
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Could not load policies. Please check your Cloudflare configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies(1);
  }, []);

  const handlePageChange = (page: number) => {
    fetchPolicies(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRowClick = (policy: AccessPolicy) => {
    router.push(`/policies/${policy.id}`);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      await deleteAccessPolicy(deletingId);
      setPolicies(policies.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete policy: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    const configs: Record<string, { bg: string, text: string, icon: any }> = {
      allow: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
      deny: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: XCircle },
      bypass: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', icon: RefreshCw },
      non_identity: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400', icon: Shield },
    };

    const cfg = configs[decision?.toLowerCase()] || { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', icon: Info };
    const Icon = cfg.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <Icon className="w-3 h-3" />
        {(decision || 'unknown').toUpperCase()}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Policies</h1>
          <p className="text-slate-400 text-sm">Control inbound traffic to your Access applications. Only users who match your policies will have access to your configured applications</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { fetchPolicies() }} disabled={loading} className="btn-ghost flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button onClick={() => router.push('/policies/create')} className="btn-orange">
            <Plus className="w-4 h-4" /> New Policy
          </button>
        </div>
      </div>

      {error ? (
        <div className="glass-panel p-8 text-center bg-red-500/5 border-red-500/20">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Sync Failed</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">{error}</p>
          <button onClick={() => { fetchPolicies() }} className="btn-orange mx-auto">Try Again</button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-10 h-10 text-[#f38020] animate-spin mb-4" />
          <p className="text-slate-500 animate-pulse">Fetching global access policies...</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">Policy Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Policy ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Apps Used</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {policies.length > 0 ? (
                  policies.map((policy) => (
                    <tr
                      key={policy.id}
                      onClick={() => handleRowClick(policy)}
                      className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#f38020] transition-colors">{policy.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getDecisionBadge(policy.decision)}
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-white/5 px-2 py-1 rounded text-slate-400 font-mono">
                          {policy.id.split('-')[0]}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <span className={`text-sm font-bold ${policy.app_count ? 'text-white' : 'text-slate-600'}`}>
                            {policy.app_count || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(policy.id);
                            }}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4 cursor-pointer" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-600 opacity-60 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-medium">
                      No access policies found in your Cloudflare account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              onPageChange={handlePageChange}
              itemsPerPage={perPage}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Policy"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setDeletingId(null)} className="btn-ghost">Cancel</button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Policy
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300 mb-2 font-medium">Are you sure you want to delete this policy?</p>
          <p className="text-sm text-slate-500">This action is permanent and will remove the policy from Cloudflare. Applications relying on this policy may lose protection.</p>
        </div>
      </Modal>
    </AppLayout>
  );
}
