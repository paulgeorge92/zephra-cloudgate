'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getGatewayList, updateGatewayList, updateGatewayListDetails, deleteGatewayList } from '@/lib/api';
import {
  Database,
  ChevronLeft,
  Calendar,
  Edit2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Plus,
  Search,
  X,
  Check,
  Save,
  Info,
  Mail,
  Globe,
  Network,
  HardDrive,
  Link as LinkIcon
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function ListDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [list, setList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing metadata
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Item management
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Deletion state
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [showDeleteListModal, setShowDeleteListModal] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGatewayList(id as string);
      if (res.data?.success === false) {
        throw new Error(res.data.message || 'Failed to fetch list details');
      }
      const data = res.data.result;
      setList(data);
      setEditName(data?.name || '');
      setEditDesc(data?.description || '');
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Could not load list details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleSaveMetadata = async () => {
    setIsSavingMetadata(true);
    try {
      await updateGatewayListDetails(id as string, {
        name: editName,
        description: editDesc,
      });
      setList({ ...list, name: editName, description: editDesc });
      setIsEditingMetadata(false);
    } catch (err: any) {
      alert('Failed to update list details: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemValue) return;
    setIsAddingItem(true);
    try {
      await updateGatewayList(id as string, {
        append: [{ value: newItemValue, description: newItemDesc }]
      });
      // Refresh to see the new item (Cloudflare processing might take a moment, but typically reflected quickly in UI)
      await fetchData();
      setShowAddModal(false);
      setNewItemValue('');
      setNewItemDesc('');
    } catch (err: any) {
      alert('Failed to add item: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (value: string) => {
    setIsDeletingItem(true);
    try {
      await updateGatewayList(id as string, {
        remove: [value]
      });
      setList({
        ...list,
        items: list.items.filter((i: any) => i.value !== value),
        count: list.count - 1
      });
    } catch (err: any) {
      alert('Failed to remove item: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeletingItem(false);
      setDeletingItemId(null);
    }
  };

  const handleDeleteList = async () => {
    setIsDeletingList(true);
    try {
      await deleteGatewayList(id as string);
      router.push('/lists');
    } catch (err: any) {
      alert('Failed to delete list: ' + (err.response?.data?.message || err.message));
      setIsDeletingList(false);
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
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-40">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 animate-pulse">Loading list content...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !list) {
    return (
      <AppLayout>
        <div className="glass-panel p-12 text-center">
          <Database className="w-16 h-16 text-red-500 mx-auto mb-6 opacity-20" />
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading List</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">{error || 'The requested list could not be found.'}</p>
          <button onClick={() => router.push('/lists')} className="btn-orange flex items-center gap-2 mx-auto">
            <ChevronLeft className="w-4 h-4" /> Back to Lists
          </button>
        </div>
      </AppLayout>
    );
  }

  const filteredItems = (list.items || []).filter((item: any) =>
    item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {(() => {
              const cfg = getListConfig(list.type);
              const Icon = cfg.icon;
              return (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfg.bg}`}>
                  <Icon className={`w-6 h-6 ${cfg.color}`} />
                </div>
              );
            })()}
            <div>
              {isEditingMetadata ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="bg-white/5 border border-[#f38020]/30 rounded-lg px-2 py-1 text-white font-bold text-xl outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleSaveMetadata} disabled={isSavingMetadata} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                    {isSavingMetadata ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { setIsEditingMetadata(false); setEditName(list.name); }} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{list.name}</h1>
                  <button onClick={() => setIsEditingMetadata(true)} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{formatType(list.type)}</span>
                <span>•</span>
                <span className="font-mono">{list.id}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteListModal(true)}
            className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold hover:bg-red-500/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Metadata & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 shadow-[0_8px_32px_rgba(37,99,235,0.1)]">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Information</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Description</label>
                {isEditingMetadata ? (
                  <textarea
                    className="w-full mt-2 bg-white/5 border border-[#f38020]/30 rounded-lg p-2 text-sm text-slate-300 outline-none h-24"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Enter list description..."
                  />
                ) : (
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                    {list.description || 'No description provided.'}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Created</div>
                    <div className="text-xs text-slate-400">{formatDate(list.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Last Sync</div>
                    <div className="text-xs text-slate-400">{formatDate(list.updated_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Entries</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold font-mono">
                {list.count || 0}
              </span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '100%' }}></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              This list is used in Access and Gateway policies.
            </p>
          </div>
        </div>

        {/* Right Column: Items management */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search items in this list..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-orange w-full md:w-auto flex items-center gap-2 justify-center">
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </div>

          <div className="glass-panel overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Item Description</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Added</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item: any, idx: number) => (
                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-medium text-blue-400">
                          {item.value}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-400 line-clamp-1">
                          {item.description || <span className="text-slate-700 italic">No description</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeletingItemId(item.value)}
                          className="p-2 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-slate-600 font-medium italic">
                      {searchQuery ? `No items found matching "${searchQuery}"` : 'No items in this list.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add Entry to ${list.name}`}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={handleAddItem}
              disabled={isAddingItem || !newItemValue}
              className="btn-orange flex items-center gap-2"
            >
              {isAddingItem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to List
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Value (IP, Email, Hostname, etc.)</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              placeholder="e.g. user@example.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Entry Description (Optional)</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="e.g. Sales team member"
            />
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-xs text-slate-400">
              You are adding a new entry to a <strong>{formatType(list.type)}</strong>. Ensure the value format matches the list type.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Item Confirmation */}
      <Modal
        isOpen={!!deletingItemId}
        onClose={() => setDeletingItemId(null)}
        title="Remove Item"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setDeletingItemId(null)} className="btn-ghost">Cancel</button>
            <button
              onClick={() => deletingItemId && handleDeleteItem(deletingItemId)}
              disabled={isDeletingItem}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
              {isDeletingItem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove Item
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300 mb-2 font-medium">Remove "{deletingItemId}"?</p>
          <p className="text-sm text-slate-500">This will immediately remove this entry from the list. Policies using this list will be updated accordingly.</p>
        </div>
      </Modal>

      {/* Delete List Confirmation */}
      <Modal
        isOpen={showDeleteListModal}
        onClose={() => setShowDeleteListModal(false)}
        title="Delete Entire List"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setShowDeleteListModal(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={handleDeleteList}
              disabled={isDeletingList}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer"
            >
              {isDeletingList ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete List
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300 mb-2 font-medium">Permanently delete "{list.name}"?</p>
          <p className="text-sm text-slate-500">This list and its {list.count} entries will be removed from Cloudflare. <strong>Warning:</strong> Policies that reference this list will fail to validate traffic correctly.</p>
        </div>
      </Modal>
    </AppLayout>
  );
}
