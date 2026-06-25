'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { getGatewayLists, deleteGatewayList } from '@/lib/api';
import {
  Trash2,
  Database,
  Plus,
  RefreshCw,
  ChevronRight,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  Mail,
  Globe,
  Network,
  HardDrive,
  Link as LinkIcon
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
} from '@/components/ui/select';

const FILTER_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'DOMAIN', label: 'Hostnames' },
  { value: 'EMAIL', label: 'User Emails' },
  { value: 'IP', label: 'IP addresses' },
  { value: 'URL', label: 'URLs' },
  { value: 'DEVICE', label: 'Device IDs' },
  { value: 'SERIAL', label: 'Serial numbers' },
];

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGatewayLists();
      if (res.data?.success === false) {
        throw new Error(res.data.message || 'Failed to fetch gateway lists');
      }
      setLists(res.data.result || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Could not load gateway lists. Please check your Cloudflare configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleRowClick = (listId: string) => {
    router.push(`/lists/${listId}`);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      await deleteGatewayList(deletingId);
      setLists(lists.filter(l => l.id !== deletingId));
      setDeletingId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete list: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatType = (type: string) => {
    if (!type) return 'Unknown';
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getListConfig = (type: string) => {
    const configs: Record<string, { icon: any, color: string, bg: string }> = {
      email: { icon: Mail, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
      domain: { icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
      ip: { icon: Network, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
      serial: { icon: HardDrive, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
      url: { icon: LinkIcon, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    };
    return configs[type?.toLowerCase()] || { icon: Database, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' };
  };

  const filteredLists = lists; // Filtering moved to server or simplified for now

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Reusable Lists</h1>
          <p className="text-slate-400 text-sm">Manage global Gateway lists that can be reused across multiple policies and rules.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchLists} disabled={loading} className="btn-ghost flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <Link href="/lists/create" className="btn-orange flex items-center gap-2">
            <Plus className="w-4 h-4" /> New List
          </Link>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search lists by name or type..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#f38020]/50 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-56">
          <Select
            value={selectedType}
            onValueChange={(val) => val && setSelectedType(val)}
            items={FILTER_TYPES}
          >
            <SelectTrigger className="w-full" placeholder="Filter by type" />
            <SelectPortal>
              <SelectContent>
                {FILTER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="glass-panel p-8 text-center bg-red-500/5 border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Sync Failed</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">{error}</p>
          <button onClick={fetchLists} className="btn-orange mx-auto">Try Again</button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-10 h-10 text-[#f38020] animate-spin mb-4" />
          <p className="text-slate-500 animate-pulse">Fetching gateway lists...</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">List Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Entries</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created On</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated On</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLists.length > 0 ? (
                  filteredLists.map((list) => (
                    <tr
                      key={list.id}
                      onClick={() => handleRowClick(list.id)}
                      className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const cfg = getListConfig(list.type);
                            const Icon = cfg.icon;
                            return (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfg.bg}`}>
                                <Icon className={`w-5 h-5 ${cfg.color}`} />
                              </div>
                            );
                          })()}
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#f38020] transition-colors">{list.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 max-w-[300px]">
                              {list.description || 'No description provided'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                          {formatType(list.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-bold text-white leading-tight">
                            {list.count || 0}
                          </span>
                          {/* <span className="text-[14px] text-slate-500">items</span> */}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <Clock className="w-3 h-3 opacity-50" />
                            <span>{formatDate(list.created_at)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <RefreshCw className="w-3 h-3 opacity-30" />
                            <span>{formatDate(list.updated_at)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(list.id);
                            }}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-600 opacity-60 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-medium italic">
                      {searchQuery ? `No lists found matching "${searchQuery}"` : 'No gateway lists found in your account.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Reusable List"
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
              Delete List
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300 mb-2 font-medium">Are you sure you want to delete this list?</p>
          <p className="text-sm text-slate-500">This action is permanent and will remove the list from your Zero Trust account. Any policies using this list will stop working correctly.</p>
        </div>
      </Modal>
    </AppLayout>
  );
}
