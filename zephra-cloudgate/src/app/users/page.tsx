'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getUsers, createUser, deleteUser, updateUser } from '@/lib/api';
import { Plus, Users, Trash2, Shield, UserCheck, AlertTriangle, X, RefreshCw, CloudDownload, Pencil } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
} from '@/components/ui/select';
import { Modal } from '@/components/ui/Modal';
import { User, CreateUserData } from '@shared/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<CreateUserData>({
    name: '', email: '', role: 'MEMBER'
  });
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = (page = 1) => {
    setLoading(true);
    getUsers(page, 10)
      .then(r => {
        setUsers(r.data.result || []);
        if (r.data.result_info?.total_count !== undefined) {
          setPagination({
            total: r.data.result_info.total_count,
            pages: r.data.result_info.total_pages
          });
        }
        setCurrentPage(page);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(1); }, []);

  const handlePageChange = (page: number) => {
    fetchUsers(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleSave() {
    setProcessing(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, { name: form.name, role: form.role });
      } else {
        await createUser(form);
      }
      setForm({ name: '', email: '', role: 'MEMBER' });
      setShowAdd(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || `Failed to ${editingUser ? 'update' : 'add'} user`);
      setErrorModalOpen(true);
    } finally {
      setProcessing(false);
    }
  }

  function handleEditClick(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email,
      role: user.role,
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCloseForm() {
    setShowAdd(false);
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'MEMBER' });
  }

  function handleDeleteClick(id: string, name: string) {
    setUserToDelete({ id, name });
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    setProcessing(true);
    try {
      await deleteUser(userToDelete.id);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Failed to delete user');
      setErrorModalOpen(true);
    } finally {
      setProcessing(false);
    }
  }

  const roleConfig: Record<string, { color: string; icon: any; bg: string }> = {
    ADMIN: { color: 'text-[#f38020]', icon: Shield, bg: 'bg-[#f38020]/10 border-[#f38020]/30' },
    MEMBER: { color: 'text-blue-400', icon: UserCheck, bg: 'bg-blue-500/10 border-blue-500/30' },
    GUEST: { color: 'text-slate-400', icon: Users, bg: 'bg-white/5 border-white/10' },
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-1">Manage Members and Guests with Zero Trust access</p>
        </div>
        <div className='flex'>
          <button onClick={() => setShowAdd(true)} className="btn-orange"><Plus className="w-4 h-4" /> Add User</button>
        </div>
      </div>

      {showAdd && (
        <div className="glass-panel p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h3>
          <div className={`grid ${editingUser ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 max-w-4xl mb-4`}>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-glass" placeholder="John Doe" />
            </div>
            {!editingUser && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-glass" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role</label>
                  <Select value={form.role} onValueChange={(val) => val && setForm(f => ({ ...f, role: val as any }))}>
                    <SelectTrigger className="w-full" />
                    <SelectPortal>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member (WARP access)</SelectItem>
                        <SelectItem value="GUEST">Guest (public only)</SelectItem>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={processing} className="btn-orange">
              {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingUser ? 'Save Changes' : 'Add User'}
            </button>
            <button onClick={handleCloseForm} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                {['User', 'Email', 'Role', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const cfg = roleConfig[u.role] || roleConfig.GUEST;
                const Icon = cfg.icon;
                const initials = u.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                        {initials}
                      </div>
                      <span className="font-medium text-white">{u.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(u.createdAt as any).toLocaleDateString()}</td>
                    <td className="px-6 py-4 flex gap-2">
                      {u.role !== 'ADMIN' && (
                        <>
                          <button onClick={() => handleEditClick(u)}
                            className="text-slate-500 hover:text-white p-1.5 rounded transition-all">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteClick(u.id, u.name || '')}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="py-16 text-center text-slate-500">No users yet. Add your first user above.</div>
          )}
          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !processing && setDeleteModalOpen(false)}
        title="Delete User"
        maxWidth="sm"
        footer={(
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteModalOpen(false)} disabled={processing} className="btn-ghost">Cancel</button>
            <button onClick={confirmDelete} disabled={processing} className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-2 transition-all">
              {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        )}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300">Are you sure you want to delete <span className="text-white font-bold">{userToDelete?.name}</span>? This action is permanent.</p>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Error"
        maxWidth="sm"
        footer={<button onClick={() => setErrorModalOpen(false)} className="btn-orange w-full">Close</button>}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300">{errorMessage}</p>
        </div>
      </Modal>
    </AppLayout>
  );
}
