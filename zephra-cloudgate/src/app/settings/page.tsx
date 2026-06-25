'use client';

import { useEffect, useState } from 'react';
import { Save, Cloud, Server, Mail, ShieldCheck, Hash, AlertCircle, CheckCircle, File, X, Download } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { getCloudflareConfig, getSmtpConfig, getServerProfile, saveCloudflareConfig, saveSmtpConfig, saveServerProfile, getMe, updateUser, uploadLogo, importCloudflareData, default as api } from '@/lib/api';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectPortal } from '@/components/ui/select';
import { CloudflareConfigData, SmtpConfigData, ServerProfile } from '@shared/types';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [cf, setCf] = useState<CloudflareConfigData & { teamName: string }>({
    accountId: '', email: '', globalApiKey: '', teamName: ''
  });
  const [server, setServer] = useState<ServerProfile>({
    name: '', logoUrl: '', website: '', description: ''
  });
  const [smtp, setSmtp] = useState<SmtpConfigData & { encryption: string }>({
    host: '', port: 587, username: '', password: '', encryption: 'TLS'
  });
  const [account, setAccount] = useState({
    id: '', email: '', currentPassword: '', password: '', confirm: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cfRes, smtpRes, serverRes, meRes] = await Promise.all([
          getCloudflareConfig(),
          getSmtpConfig(),
          getServerProfile(),
          getMe()
        ]);
        if (cfRes.data) setCf(prev => ({ ...prev, ...cfRes.data.result }));
        if (smtpRes.data) setSmtp(prev => ({ ...prev, ...smtpRes.data.result }));
        if (serverRes.data) setServer(prev => ({ ...prev, ...serverRes.data.result }));
        if (meRes.data?.result) setAccount(prev => ({ ...prev, id: meRes.data.result!.id, email: meRes.data.result!.email }));
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadLogo(file);
      const url = res.data.result?.url.startsWith('/') ? `${api.defaults.baseURL}${res.data.result?.url}` : res.data.result?.url;
      setServer({ ...server, logoUrl: url });
      setMessage({ type: 'success', text: 'Logo uploaded successfully. Don\'t forget to save profile changes.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to upload logo.' });
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCf = async () => {
    setSaving('cf');
    try {
      await saveCloudflareConfig({
        accountId: cf.accountId,
        email: cf.email,
        globalApiKey: cf.globalApiKey,
        teamName: cf.teamName,
      });
      setMessage({ type: 'success', text: 'Cloudflare configuration saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save Cloudflare config.' });
    } finally {
      setSaving(null);
    }
  };

  const handleImportCf = async () => {
    setSaving('import');
    try {
      const res = await importCloudflareData();
      const { users, applications } = res.data.result;
      setMessage({
        type: 'success',
        text: `Import completed: ${users} users and  ${applications} applications synced.`
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to import Cloudflare data.' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveServer = async () => {
    setSaving('server');
    try {
      await saveServerProfile(server);
      setMessage({ type: 'success', text: 'Server profile updated successfully.' });
      window.dispatchEvent(new CustomEvent('server-branding-updated'));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update server profile.' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveSmtp = async () => {
    setSaving('smtp');
    try {
      await saveSmtpConfig(smtp);
      setMessage({ type: 'success', text: 'SMTP settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save SMTP settings.' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAccount = async () => {
    if (account.password) {
      if (!account.currentPassword) {
        setMessage({ type: 'error', text: 'Existing password is required to set a new one.' });
        return;
      }
      if (account.password !== account.confirm) {
        setMessage({ type: 'error', text: 'Passwords do not match.' });
        return;
      }
    }
    setSaving('account');
    try {
      const data: Record<string, string> = { email: account.email };
      if (account.password) {
        data.password = account.password;
        data.currentPassword = account.currentPassword;
      }
      await updateUser(account.id, data as any);
      setMessage({ type: 'success', text: 'Admin account updated successfully.' });
      setAccount({ ...account, currentPassword: '', password: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update account.' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400 text-sm">Manage your server identity, Cloudflare integration, and system notifications.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-50 hover:opacity-100">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'server', label: 'Server Profile', icon: Server },
              { id: 'account', label: 'Admin Account', icon: ShieldCheck },
              { id: 'cloudflare', label: 'Cloudflare', icon: Cloud },
              { id: 'smtp', label: 'SMTP Settings', icon: Mail },
            ].map(tab => (
              <button key={tab.id} onClick={() => document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-8">
            {/* Server Profile Section */}
            <section id="server" className="glass-panel p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Server Profile</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Public Identity</p>
                </div>
                <button onClick={handleSaveServer} disabled={!!saving} className="ml-auto btn-orange !py-2 !px-4 text-sm flex items-center gap-2">
                  {saving === 'server' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="shrink-0 flex flex-col items-center">
                    <label className="block text-xs font-semibold text-white mb-2 self-start">Logo Preview</label>
                    <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden ${!server.logoUrl ? 'bg-[#f38020]' : 'bg-transparent'}`}>
                      {server.logoUrl ? (
                        <img src={server.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Cloud className="w-10 h-10 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Instance Name</label>
                      <input type="text" value={server.name} onChange={e => setServer({ ...server, name: e.target.value })}
                        placeholder="e.g. Zephra Nexus" className="input-glass" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Upload Logo Icon</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          <div className="input-glass flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                            <File className="w-4 h-4" />
                            <span className="text-sm">{uploading ? 'Uploading...' : 'Click to upload icon...'}</span>
                          </div>
                        </label>
                        {server.logoUrl && (
                          <button onClick={() => setServer({ ...server, logoUrl: '' })} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-2 ml-0.5 flex items-center justify-between">
                        Logo URL
                        <span className="text-[10px] text-slate-500 font-normal">Optional if file uploaded</span>
                      </label>
                      <input type="text" value={server.logoUrl || ''} onChange={e => setServer({ ...server, logoUrl: e.target.value })}
                        placeholder="https://..." className="input-glass" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Description</label>
                    <textarea value={server.description || ''} onChange={e => setServer({ ...server, description: e.target.value })}
                      placeholder="My home server" className="input-glass min-h-[80px]" />
                  </div>
                </div>
              </div>
            </section>

            {/* Admin Account Section */}
            <section id="account" className="glass-panel p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Admin Account</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Security & Access</p>
                </div>
                <button onClick={handleSaveAccount} disabled={!!saving} className="ml-auto btn-orange !py-2 !px-4 text-sm flex items-center gap-2">
                  {saving === 'account' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Admin Email</label>
                    <input type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })}
                      className="input-glass font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5 text-[#f38020]">Existing Password</label>
                    <input type="password" value={account.currentPassword} onChange={e => setAccount({ ...account, currentPassword: e.target.value })}
                      placeholder="Required for password changes" className="input-glass font-mono text-sm border-[#f38020]/20" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5">New Password</label>
                    <input type="password" value={account.password} onChange={e => setAccount({ ...account, password: e.target.value })}
                      placeholder="Leave blank to keep current" className="input-glass font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Confirm Password</label>
                    <input type="password" value={account.confirm} onChange={e => setAccount({ ...account, confirm: e.target.value })}
                      placeholder="Confirm new password" className="input-glass font-mono text-sm" />
                  </div>
                </div>
              </div>
            </section>

            {/* Cloudflare Section */}
            <section id="cloudflare" className="glass-panel p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#f38020]/10 border border-[#f38020]/20 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-[#f38020]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Cloudflare Integration</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Zero Trust Infrastructure</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={handleImportCf} disabled={!!saving} className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-2">
                    {saving === 'import' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Download className="w-4 h-4" />}
                    Import All
                  </button>
                  <button onClick={handleSaveCf} disabled={!!saving} className="btn-orange !py-2 !px-4 text-sm flex items-center gap-2">
                    {saving === 'cf' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Account ID</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={cf.accountId} onChange={e => setCf({ ...cf, accountId: e.target.value })}
                      className="input-glass pl-10 font-mono text-sm text-[#f38020]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Cloudflare Email</label>
                  <input type="email" value={cf.email} onChange={e => setCf({ ...cf, email: e.target.value })}
                    className="input-glass font-mono text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Zero Trust Team</label>
                    <div className="input-glass flex items-center pr-3">
                      <input type="text" value={cf.teamName} onChange={e => setCf({ ...cf, teamName: e.target.value })}
                        className="bg-transparent outline-none w-full" />
                      <span className="text-[10px] text-slate-500 shrink-0">.cloudflareaccess.com</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 ml-0.5">Global API Key</label>
                    <input type="password" value={cf.globalApiKey} onChange={e => setCf({ ...cf, globalApiKey: e.target.value })}
                      placeholder="••••••••" className="input-glass font-mono text-sm" />
                  </div>
                </div>
              </div>
            </section>

            {/* SMTP Section */}
            <section id="smtp" className="glass-panel p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">SMTP Settings</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Email Notifications</p>
                </div>
                <button onClick={handleSaveSmtp} disabled={!!saving} className="ml-auto btn-orange !py-2 !px-4 text-sm flex items-center gap-2">
                  {saving === 'smtp' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-white mb-2">SMTP Host</label>
                  <input type="text" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })}
                    placeholder="smtp.gmail.com" className="input-glass" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Port</label>
                  <input type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: +e.target.value })}
                    placeholder="587" className="input-glass" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Username</label>
                  <input type="email" value={smtp.username} onChange={e => setSmtp({ ...smtp, username: e.target.value })}
                    placeholder="you@example.com" className="input-glass" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Password</label>
                  <input type="password" value={smtp.password} onChange={e => setSmtp({ ...smtp, password: e.target.value })}
                    placeholder="••••••••" className="input-glass" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Encryption</label>
                  <Select value={smtp.encryption} onValueChange={(val) => val && setSmtp(s => ({ ...s, encryption: val }))}>
                    <SelectTrigger className="w-full" />
                    <SelectPortal>
                      <SelectContent>
                        <SelectItem value="TLS">TLS</SelectItem>
                        <SelectItem value="SSL">SSL</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
