'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, ShieldCheck, Hash, Key, Cloud, Server,
  CheckCircle, ArrowRight, Check, ExternalLink, AlertCircle, X,
  XCircle
} from 'lucide-react';
import {
  setupAdmin, saveCloudflareConfig, saveSmtpConfig, saveServerProfile, verifySetup,
  completeSetup,
  resetSetup
} from '@/lib/api';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
} from '../ui/select';
import { CloudflareConfigData, SmtpConfigData, ServerProfile, SetupAdminData, SetupVerificationResult } from '@shared/types';

const STEPS = [
  { id: 1, label: 'Admin Profile' },
  { id: 2, label: 'Cloudflare Account' },
  { id: 3, label: 'API Credentials' },
  { id: 4, label: 'Zero Trust' },
  { id: 5, label: 'Server Profile' },
  { id: 6, label: 'Configure Email Service' },
  { id: 7, label: 'Verification' },
  { id: 8, label: 'Complete' },
];

// ─── Inline error banner ──────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <p className="text-sm text-red-300 leading-snug flex-1">{message}</p>
      <button onClick={onDismiss} className="text-red-400/60 hover:text-red-300 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Field-level error message ────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-400 mt-1.5 ml-0.5 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" /> {message}
    </p>
  );
}

// ─── Validated input className ────────────────────────────────────────────────
function inputCls(hasError: boolean) {
  return `input-glass ${hasError ? 'border-red-500/60 focus:border-red-500 focus:shadow-[0_0_0_1px_rgb(239,68,68,0.6),0_0_15px_rgba(239,68,68,0.15)]' : ''}`;
}

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SetupVerificationResult | null>(null);
  const [bannerError, setBannerError] = useState('');
  const router = useRouter();

  // Form state
  const [admin, setAdmin] = useState<SetupAdminData & { confirm: string }>({ name: '', email: '', password: '', confirm: '' });
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});

  const [cf, setCf] = useState<CloudflareConfigData & { teamName: string }>({ accountId: '', email: '', globalApiKey: '', teamName: '' });
  const [server, setServer] = useState<ServerProfile>({ name: '', logoUrl: '', website: '', description: '' });
  const [smtp, setSmtp] = useState<SmtpConfigData & { encryption: string }>({ host: '', port: 587, username: '', password: '', encryption: 'TLS' });

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;


  // ── Validation ──────────────────────────────────────────────────────────────
  function validateAdmin(): boolean {
    const errors: Record<string, string> = {};

    if (!admin.name.trim())
      errors.name = 'Full name is required.';

    if (!admin.email.trim())
      errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email))
      errors.email = 'Please enter a valid email address.';

    if (!admin.password)
      errors.password = 'Password is required.';
    else if (admin.password.length < 8)
      errors.password = 'Password must be at least 8 characters.';

    if (!admin.confirm)
      errors.confirm = 'Please confirm your password.';
    else if (admin.password && admin.confirm !== admin.password)
      errors.confirm = 'Passwords do not match.';

    setAdminErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Clear a single field error when user starts typing
  function clearAdminError(key: string) {
    if (adminErrors[key]) {
      setAdminErrors(e => { const n = { ...e }; delete n[key]; return n; });
    }
  }

  // ── handleNext ──────────────────────────────────────────────────────────────
  async function handleNext() {
    setBannerError('');
    let proceedToNextStage = true;
    // Client-side validation
    if (step === 1 && !validateAdmin()) return;
    if (step === 2 && !cf.accountId.trim()) {
      setBannerError('Account ID is required.');
      return;
    }
    if (step === 3) {
      if (!cf.email.trim() || !cf.globalApiKey?.trim()) {
        setBannerError('All API credentials are required.');
        return;
      }
    }

    // Step 2 is just data collection, we save in Step 3
    if (step === 2) {
      setStep(s => s + 1);
      return;
    }

    setLoading(true);
    try {
      if (step === 1) {
        const res = await setupAdmin(admin);
        if (res.data.result?.access_token) {
          localStorage.setItem('auth_token', res.data.result.access_token);
        }
      } else if (step === 3) {
        // Step 3 saves both Account ID (from Step 2) and Credentials
        await saveCloudflareConfig({
          accountId: cf.accountId,
          email: cf.email,
          globalApiKey: cf.globalApiKey,
          teamName: cf.teamName,
        });
      } else if (step === 5) {
        await saveServerProfile(server);
      } else if (step === 6) {
        // Only save if some info is provided, otherwise treat as skip
        if (smtp.host.trim()) {
          await saveSmtpConfig(smtp);
        }
        setVerifyResult(null);
      } else if (step === 7) {
        const res = await verifySetup();
        setVerifyResult(res.data.result as SetupVerificationResult);
        if (res.data.success) {
          const completeRes = await completeSetup();
          proceedToNextStage = completeRes.data.success;
        }
      }

      if (step === 8) {
        router.replace('/dashboard');
        return;
      }
      proceedToNextStage && setStep(s => s + 1);

    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (Array.isArray(e?.response?.data?.errors)
          ? e.response.data.errors.join(' ')
          : null) ||
        'Something went wrong. Please try again.';
      setBannerError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Admin fields config ─────────────────────────────────────────────────────
  const adminFields = [
    { label: 'Full Name', type: 'text', key: 'name', placeholder: 'John Doe', required: true },
    { label: 'Email', type: 'email', key: 'email', placeholder: 'admin@example.com', required: true },
    { label: 'Password', type: 'password', key: 'password', placeholder: '••••••••', required: true },
    { label: 'Confirm Password', type: 'password', key: 'confirm', placeholder: '••••••••', required: true },
  ] as const;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8 w-full max-w-4xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#f38020] flex items-center justify-center shadow-[0_0_20px_rgba(243,128,32,0.4)]">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Zephra CloudGate</span>
        </div>
        <h1 className="text-2xl font-bold">
          <span className="text-[#f38020]">{step}/{STEPS.length}:</span>{' '}
          <span className="text-white">{STEPS[step - 1].label}</span>
        </h1>
        {/* Progress bar */}
        <div className="w-full max-w-3xl mx-auto h-1 bg-white/10 rounded-full mt-6 mb-4 overflow-hidden">
          <div className="h-full bg-[#f38020] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {/* Step nav */}
        <div className="flex justify-between max-w-3xl mx-auto text-xs font-medium px-2">
          {STEPS.map((s) => (
            <span key={s.id} className={step === s.id ? 'text-white' : step > s.id ? 'text-[#f38020]' : 'text-slate-500'}>
              {step > s.id ? <Check className="w-3 h-3 inline mr-1" /> : null}{s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="glass-panel w-full max-w-4xl p-10">
        {/* Global error banner */}
        {bannerError && <ErrorBanner message={bannerError} onDismiss={() => setBannerError('')} />}

        {/* ── STEP 1: Admin Profile ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex gap-10 items-stretch">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Setup Admin Profile</h2>
              <p className="text-slate-400 text-sm mb-8">Create the root account for your home server manager.</p>
              <div className="max-w-md space-y-5">
                {adminFields.map(f => (
                  <div key={f.key}>
                    <label className="flex items-center gap-1 text-xs font-semibold text-white mb-1.5 ml-0.5">
                      {f.label}
                      <span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={admin[f.key]}
                      onChange={(e) => {
                        setAdmin(a => ({ ...a, [f.key]: e.target.value }));
                        clearAdminError(f.key);
                      }}
                      className={inputCls(!!adminErrors[f.key])}
                    />
                    <FieldError message={adminErrors[f.key]} />
                  </div>
                ))}
                <p className="text-xs text-slate-500 mt-2">
                  <span className="text-red-400">*</span> All fields are required
                </p>
              </div>
            </div>
            <div className="w-1/2 flex justify-center items-center shrink-0 hidden md:flex pt-4">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 bg-[#f38020]/10 rounded-full blur-3xl" />
                <div className="absolute inset-4 rounded-3xl bg-[#111216] border border-white/10 shadow-2xl flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-full bg-[#181a1f] border border-white/10 flex items-center justify-center shadow-inner mb-4 transition-transform duration-500 ease-out">
                      <ShieldCheck className="w-10 h-10 text-[#f38020]" />
                    </div>
                    <div className="h-2 w-24 bg-white/10 rounded-full" />
                    <div className="h-2 w-16 bg-white/5 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Cloudflare Account ──────────────────────────────────── */}
        {step === 2 && (
          <div className="flex gap-10 items-center">
            <div className="w-1/2">
              <h2 className="text-2xl font-bold text-white mb-4 italic">Setup Cloudflare Account</h2>
              <ol className="space-y-4 text-slate-400 text-sm list-decimal pl-5 mb-8">
                <li className="pl-2">Go to <a href="https://dash.cloudflare.com/sign-up" target="_blank" className="text-white underline">cloudflare.com <ExternalLink className="w-3 h-3 inline" /></a></li>
                <li className="pl-2"><strong className="text-white">Sign up</strong> and create your Cloudflare account.</li>
                <li className="pl-2">Once logged in, navigate to the <strong className="text-white">Account Home</strong>.</li>
                <li className="pl-2">Click the top-right menu → <strong className="text-white">Copy Account ID</strong>.</li>
              </ol>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5 ml-0.5">Enter your Account ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" placeholder="e.g. 1a2b3c4d5e..." value={cf.accountId}
                    onChange={(e) => setCf(c => ({ ...c, accountId: e.target.value }))}
                    className="input-glass pl-10 font-mono text-[#f38020]" />
                </div>
              </div>
            </div>
            <div className="w-1/2 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-2xl shrink-0 p-4">
              <div className="flex justify-between items-center mb-6">
                <div className="text-gray-700 font-semibold text-sm">Account home</div>
                <div className="relative">
                  <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"><span>⋯</span></div>
                  <div className="absolute right-0 top-10 w-56 bg-white border border-gray-200 rounded shadow-lg z-10">
                    <div className="border-2 border-orange-500 p-2 text-xs text-gray-800 flex justify-between items-center bg-orange-50">Copy account ID <span>⎘</span></div>
                    <div className="p-2 text-xs text-gray-500">Change account name</div>
                    <div className="p-2 text-xs text-gray-500">Manage members</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 opacity-40">
                <div className="border rounded p-3 h-24" />
                <div className="border rounded p-3 h-24" />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: API Credentials ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex gap-10">
            <div className="flex-1 space-y-6">
              <h2 className="text-2xl font-bold text-white mb-2 italic">Create API Credentials</h2>
              {[
                { label: 'Cloudflare Email', type: 'email', key: 'email', placeholder: 'email@example.com', hint: '' },
                { label: 'Global API Key', type: 'password', key: 'globalApiKey', placeholder: '••••••••', hint: 'User Icon → My Profile → API Tokens → Global API Key' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-white mb-1.5 ml-0.5">{f.label}</label>
                  {f.hint && <p className="text-xs text-slate-500 mb-1.5 ml-0.5">{f.hint}</p>}
                  <input type={f.type} placeholder={f.placeholder} value={cf[f.key as keyof CloudflareConfigData] || ''}
                    onChange={(e) => setCf(c => ({ ...c, [f.key]: e.target.value }))}
                    className="input-glass font-mono text-sm" />
                </div>
              ))}
            </div>
            <div className="w-80 shrink-0 bg-white/[0.02] border border-[#f38020]/20 rounded-xl p-6">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#f38020]" /> Required Token Permissions
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {[
                  ['Account - SCIM Provisioning', 'Edit'],
                  ['Account - Access: Apps', 'Edit'],
                  ['Account - Cloudflare Tunnel', 'Edit'],
                  ['Account - Access Audit Logs', 'Read'],
                  ['Account - Access: Apps/Policies', 'Edit'],
                  ['Account - Account Analytics', 'Read'],
                  ['Zone - Zone', 'Read'],
                  ['Zone - DNS', 'Edit'],
                  ['Zone - Analytics', 'Read'],
                ].map(([perm, action]) => (
                  <div key={perm} className="text-xs bg-white/5 border border-white/10 px-3 py-2 rounded flex justify-between">
                    <span className="font-medium text-[#f38020]">{perm}</span>
                    <span className="text-slate-300">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Zero Trust ──────────────────────────────────────────── */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto text-center py-4">
            <div className="w-20 h-20 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl mx-auto mb-8 shadow-inner">
              <ShieldCheck className="w-10 h-10 text-[#f38020]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 italic">Activate Zero Trust</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              In your Cloudflare Dashboard, navigate to <strong className="text-white">Zero Trust</strong>. Subscribe to the <strong className="text-white">Free Plan</strong> (supports up to 50 users). You may need a payment method, but won&apos;t be charged.
            </p>
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Your Zero Trust team name</label>
              <div className="input-glass flex items-center max-w-sm mx-auto relative">
                <input type="text" placeholder="my-awesome-team" value={cf.teamName}
                  onChange={(e) => setCf(c => ({ ...c, teamName: e.target.value }))}
                  className="bg-transparent outline-none w-full pr-44" />
                <span className="absolute right-4 text-xs text-slate-500 select-none">.cloudflareaccess.com</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Server Profile ──────────────────────────────────────── */}
        {step === 5 && (
          <div className="flex gap-10 items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2 italic">Home Server Profile</h2>
              <p className="text-slate-400 text-sm mb-8">Give your home server a unique identity.</p>
              <div className="space-y-5 max-w-md">
                {[
                  { label: 'Server Name', key: 'name', placeholder: 'e.g. Zephra Nexus' },
                  { label: 'Website (optional)', key: 'website', placeholder: 'https://' },
                  { label: 'Logo URL (optional)', key: 'logoUrl', placeholder: 'https://...' },
                  { label: 'Description (optional)', key: 'description', placeholder: 'My home server' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-white mb-1.5 ml-0.5">{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={server[f.key as keyof ServerProfile] || ''}
                      onChange={(e) => setServer(s => ({ ...s, [f.key]: e.target.value }))}
                      className="input-glass" />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-1/2 flex justify-center items-center shrink-0 hidden md:flex">
              <div className="relative w-72 h-72">
                <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute inset-x-4 top-10 bottom-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col overflow-hidden rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="h-32 bg-gradient-to-br from-[#1e2025] to-[#111216] border-b border-white/5 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-2xl bg-[#1e2025] border border-white/10 flex items-center justify-center">
                      <Server className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 px-6 pt-4 pb-4 flex flex-col items-center">
                    <div className="h-3 w-32 bg-white/10 rounded-full mb-2" />
                    <div className="h-2 w-48 bg-white/5 rounded-full mb-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 6: SMTP ────────────────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 italic">SMTP Configuration</h2>
            <p className="text-slate-400 text-sm mb-8">Configure email for alerts and notifications.</p>
            <div className="grid grid-cols-2 gap-5 max-w-2xl">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-semibold text-white mb-1.5">SMTP Host</label>
                <input type="text" placeholder="smtp.gmail.com" value={smtp.host}
                  onChange={(e) => setSmtp(s => ({ ...s, host: e.target.value }))} className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Port</label>
                <input type="number" placeholder="587" value={smtp.port}
                  onChange={(e) => setSmtp(s => ({ ...s, port: +e.target.value }))} className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Username</label>
                <input type="email" placeholder="you@example.com" value={smtp.username}
                  onChange={(e) => setSmtp(s => ({ ...s, username: e.target.value }))} className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Password</label>
                <input type="password" placeholder="••••••••" value={smtp.password}
                  onChange={(e) => setSmtp(s => ({ ...s, password: e.target.value }))} className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Encryption</label>
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
          </div>
        )}

        {/* ── STEP 7: Verification ────────────────────────────────────────── */}
        {step === 7 && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2 text-center italic">Verification</h2>
            <p className="text-slate-400 text-sm mb-8 text-center">We&apos;ll verify your Cloudflare credentials.</p>
            {!verifyResult ? (
              <div className="space-y-4">
                {['Verify Account ID', 'Verify Global API Key', 'Verify SMTP Config'].map((item) => (
                  <div key={item} className="flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-full bg-[#f38020]/10 border border-[#f38020]/30 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-[#f38020]" />
                    </div>
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-500 text-center mt-4 italic">Click &quot;Verify Now&quot; to run all checks.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {['account', 'apikey', 'smtp'].map((item) => (
                  <div key={item} className="flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-full border-2  flex items-center justify-center ${verifyResult[item as keyof SetupVerificationResult]?.success ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'bg-red-500/10 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]'}`}>
                      {verifyResult[item as keyof SetupVerificationResult]?.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <span className={`text-sm ${verifyResult[item as keyof SetupVerificationResult]?.success ? 'text-emerald-400' : 'text-red-400'}`}>{verifyResult[item as keyof SetupVerificationResult]?.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 8: Complete ────────────────────────────────────────────── */}
        {step === 8 && (
          <div className="max-w-lg mx-auto text-center py-4">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)] animate-success-pop">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Setup Complete! 🎉</h2>
            <p className="text-slate-400 leading-relaxed mb-8 italic">
              Zephra CloudGate is ready. You can now manage your home server infrastructure, expose applications, and control Cloudflare Zero Trust — all from one place.
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Admin account created
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Cloudflare connected
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Server configured
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-white/10 flex justify-between items-center">
          <div className="flex gap-4">
            {step > 1 && step < 8 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step === 6 && (
              <button onClick={() => { setStep(s => s + 1); setVerifyResult(null) }} className="btn-ghost text-slate-400 hover:text-white transition-colors flex items-center gap-2 border border-white/5 px-4 rounded-xl">
                Skip for now
              </button>
            )}
          </div>
          <button onClick={handleNext} disabled={loading} className="btn-orange">
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            ) : step === 7 ? (
              <>Verify Now <ChevronRight className="w-4 h-4" /></>
            ) : step === 8 ? (
              <>Go to Dashboard <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
