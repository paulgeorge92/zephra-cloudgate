'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { createGatewayList } from '@/lib/api';
import {
  ChevronLeft,
  Database,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Check,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
} from '@/components/ui/select';

const LIST_TYPES = [
  { value: 'DOMAIN', label: 'Hostnames', placeholder: 'e.g. example.com' },
  { value: 'EMAIL', label: 'User Emails', placeholder: 'e.g. user@example.com' },
  { value: 'IP', label: 'IP addresses', placeholder: 'e.g. 192.168.1.1' },
  { value: 'URL', label: 'URLs', placeholder: 'e.g. https://example.com/path' },
  { value: 'DEVICE', label: 'Device IDs', placeholder: 'e.g. device-uuid' },
  { value: 'SERIAL', label: 'Serial numbers', placeholder: 'e.g. ABCD-1234' },
];

export default function CreateListPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('DOMAIN');
  const [entries, setEntries] = useState<{ value: string; description: string }[]>([]);
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEntry = () => {
    if (!newValue.trim()) return;
    setEntries([...entries, { value: newValue.trim(), description: newDesc.trim() }]);
    setNewValue('');
    setNewDesc('');
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('List name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        type,
        items: entries.map(e => ({
          value: e.value,
          description: e.description || undefined
        }))
      };

      const res = await createGatewayList(payload);
      if (res.data?.success === false) {
        throw new Error(res.data.message || 'Failed to create list');
      }

      router.push('/lists');
    } catch (err: any) {
      console.error('Create error:', err);
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTypeConfig = LIST_TYPES.find(t => t.value === type);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/lists" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f38020]/10 border border-[#f38020]/20 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#f38020]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Create New List</h1>
              <p className="text-sm text-slate-500">Configure a new reusable gateway list for your Zero Trust policies.</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={isSaving || !name.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#f38020] text-white font-bold hover:bg-[#f38020]/90 transition-all shadow-lg shadow-[#f38020]/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Create & Save List
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Form Settings */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-4">
              <LayoutGrid className="w-5 h-5 text-[#f38020]" />
              <h2 className="text-lg font-bold text-white">Basic Configuration</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">List Name</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f38020]/50 transition-colors"
                  placeholder="e.g. Blocked Domains"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">Description (Optional)</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f38020]/50 transition-colors h-24 resize-none"
                  placeholder="Describe the purpose of this list..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">List Type</label>
                <Select 
                  value={type} 
                  onValueChange={(val) => { if (val) { setType(val); setEntries([]); } }}
                  items={LIST_TYPES}
                >
                  <SelectTrigger className="w-full" placeholder="Select type..." />
                  <SelectPortal>
                    <SelectContent>
                      {LIST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1.5 font-medium">
                  <Info className="w-3 h-3" />
                  Changing type will clear current entries to ensure compatibility.
                </p>
              </div>
            </div>
          </div>

          {/* Action Sidebar (Moved to left section) */}
          <div className="glass-panel p-6 shadow-[0_8px_32px_rgba(243,128,32,0.1)]">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-white/5">
              <Check className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Summary & Actions</h3>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Name</span>
                <span className="text-white font-medium truncate max-w-[200px]">{name || '—'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Type</span>
                <span className="text-[#f38020] font-bold">{type} ({currentTypeConfig?.label})</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Entries</span>
                <span className="text-white font-medium">{entries.length} items ready</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Confirm all details before saving. The list will be immediately active and available for policy rule configuration in the Cloudflare dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Entry Management */}
        <div className="lg:col-span-7 space-y-8">
          <div className="glass-panel p-6 space-y-6 h-fit min-h-[500px] shadow-[0_8px_32px_rgba(37,99,235,0.05)]">
            <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Entries</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                {entries.length} Items Added
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  placeholder={currentTypeConfig?.placeholder}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Short description (optional)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                />
              </div>
              <button
                onClick={addEntry}
                disabled={!newValue.trim()}
                className="btn-ghost shrink-0 px-4 py-2.5 flex items-center gap-2 text-blue-400 border-blue-500/20 hover:bg-blue-500/10 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {entries.length > 0 ? (
                entries.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{entry.value}</div>
                        {entry.description && (
                          <div className="text-[10px] text-slate-500">{entry.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeEntry(idx)}
                      className="p-2 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 rounded-xl border border-dashed border-white/5 text-slate-600">
                  <p className="text-sm italic">No entries added yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
