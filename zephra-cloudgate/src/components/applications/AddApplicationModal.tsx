'use client';

import { useState, useEffect } from 'react';
import { X, Globe, Lock, ShieldCheck, ChevronRight, ChevronLeft, Rocket, Plus, Trash2 } from 'lucide-react';
import { createApplication, getTunnels, getDomains, getAccessPolicies } from '@/lib/api';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
} from '../ui/select';

import { Modal } from '../ui/Modal';
import { AlertTriangle } from 'lucide-react';
import { Tunnel, ApplicationPolicy, AccessPolicy, CreateApplicationData } from '@shared/types';
import { ApplicationExposureTypeEnum } from '@shared/types'
import Link from 'next/link';

const STEPS = ['1. Define App', '2. Exposure & Domain', '3. Policy', '4. Tunnel'];

interface CfZone {
  id: string;
  name: string;
}

interface PublicUrlConfig {
  id: string;
  subdomain: string;
  zone: string;
}

const createEmptyPublicUrlConfig = (): PublicUrlConfig => ({
  id: crypto.randomUUID(),
  subdomain: '',
  zone: '',
});

const getPublicUrlValue = ({ subdomain, zone }: Pick<PublicUrlConfig, 'subdomain' | 'zone'>) => {
  const trimmedSubdomain = subdomain.trim().toLowerCase();
  const trimmedZone = zone.trim().toLowerCase();

  return trimmedSubdomain && trimmedZone ? `${trimmedSubdomain}.${trimmedZone}` : '';
};

export default function AddApplicationModal({
  onClose,
  onCreated,
  initialTunnelId
}: {
  onClose: () => void;
  onCreated: () => void;
  initialTunnelId?: string;
}) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [zones, setZones] = useState<CfZone[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [destType, setDestType] = useState<'URI' | 'IP'>('URI');
  const [destUri, setDestUri] = useState('');
  const [protocol, setProtocol] = useState('http://');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [exposureType, setExposureType] = useState<ApplicationExposureTypeEnum>(ApplicationExposureTypeEnum.PUBLIC);
  const [publicUrlConfigs, setPublicUrlConfigs] = useState<PublicUrlConfig[]>([createEmptyPublicUrlConfig()]);
  const [selectedTunnel, setSelectedTunnel] = useState(initialTunnelId || '');
  const [policyType, setPolicyType] = useState<'OPEN' | 'RESTRICTED'>('OPEN');
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  // Error modal state
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');



  useEffect(() => {
    loadData();
    if (initialTunnelId) {
      setSelectedTunnel(initialTunnelId);
    }
  }, [initialTunnelId]);

  const destinationUrl = destType === 'URI' ? destUri : `${protocol}${ip}:${port}`;
  const publicUrls = exposureType !== ApplicationExposureTypeEnum.WARP
    ? publicUrlConfigs.map(getPublicUrlValue).filter(Boolean)
    : [];
  const publicUrl = publicUrls[0];
  const primaryZoneId = zones.find(z => z.name === publicUrlConfigs[0]?.zone)?.id;

  async function loadData(): Promise<void> {
    const [tunnelsRes, zonesRes, policiesRes] = await Promise.all([
      getTunnels(),
      getDomains(),
      getAccessPolicies(),
    ]);
    setTunnels(tunnelsRes.data.result || []);
    setZones(zonesRes.data.result || []);
    setPolicies(policiesRes.data.result || []);
  }

  async function handleSubmit() {
    if (!selectedTunnel) {
      setErrorMessage('Please select a tunnel to route traffic');
      setErrorModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const policy: ApplicationPolicy = {
        type: policyType,
        ...(policyType === 'RESTRICTED' ? {
          policyId: selectedPolicy
        } : {})
      };

      const applicationData: CreateApplicationData = {
        name,
        logoUrl,
        destinationUrl,
        destinationType: destType,
        exposureType,
        publicUrl: publicUrls,
        tunnelId: selectedTunnel || undefined,
        policy,
        zoneId: primaryZoneId
      };

      await createApplication(applicationData);
      onCreated();
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Error creating application');
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function updatePublicUrlConfig(id: string, updates: Partial<Omit<PublicUrlConfig, 'id'>>) {
    setPublicUrlConfigs(configs => configs.map(config => (
      config.id === id ? { ...config, ...updates } : config
    )));
  }

  function addPublicUrlConfig() {
    setPublicUrlConfigs(configs => [...configs, createEmptyPublicUrlConfig()]);
  }

  function removePublicUrlConfig(id: string) {
    setPublicUrlConfigs(configs => configs.length > 1 ? configs.filter(config => config.id !== id) : configs);
  }

  function nextStep() {
    const currentStep = step;
    switch (currentStep) {
      case 0:
        if (!name || (destType === 'URI' && !destUri) || (destType === 'IP' && (!ip || !port))) {
          setErrorMessage('Please fill in all required fields');
          setErrorModalOpen(true);
          return;
        }
        break;
      case 1:
        if (exposureType !== ApplicationExposureTypeEnum.WARP && publicUrlConfigs.some(({ subdomain, zone }) => !subdomain.trim() || !zone)) {
          setErrorMessage('Please fill in all required fields');
          setErrorModalOpen(true);
          return;
        }
        if (exposureType !== ApplicationExposureTypeEnum.WARP && new Set(publicUrls).size !== publicUrls.length) {
          setErrorMessage('Duplicate public URLs are not allowed');
          setErrorModalOpen(true);
          return;
        }
        break;
      case 2:
        if (policyType === 'RESTRICTED') {
          if (!selectedPolicy) {
            setErrorMessage('Please select at least one user for restricted access');
            setErrorModalOpen(true);
            return;
          }
        }
        break;
      case 3:
        if (!selectedTunnel) {
          setErrorMessage('Please select a tunnel to route traffic');
          setErrorModalOpen(true);
          return;
        }
        break;
    }

    if (exposureType === ApplicationExposureTypeEnum.PUBLIC && currentStep === 1) {
      setStep(3); // Skip exposure & domain step if it's public
    } else {
      setStep(s => s + 1);
    }
  }

  function prevStep() {
    const currentStep = step;
    if (exposureType === ApplicationExposureTypeEnum.PUBLIC && currentStep === 3) {
      setStep(1); // Skip back to exposure & domain step if it's public
    } else {
      setStep(s => s - 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] glass-panel overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add Application</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Step tabs */}
        <div className="bg-black/20 px-6 py-3 border-b border-white/5 flex gap-2 text-sm text-slate-500 font-medium overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className={`pb-1 px-2 whitespace-nowrap border-b-2 transition-all ${i === step ? 'text-[#f38020] border-[#f38020]' : i < step ? 'text-white/50 border-transparent' : 'border-transparent'}`}>
              {s}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 flex-1 min-h-[400px] overflow-y-auto">
          {/* Step 1: Define App */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">App Name</label>
                  <input type="text" placeholder="e.g. Nextcloud" value={name} onChange={e => setName(e.target.value)} className="input-glass" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Logo URL (optional)</label>
                  <input type="text" placeholder="https://..." value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="input-glass" />
                </div>
              </div>
              <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium text-white">Destination Type</label>
                  <div className="flex bg-black/30 p-1 rounded-lg gap-1">
                    {(['URI', 'IP'] as const).map(t => (
                      <button key={t} onClick={() => setDestType(t)}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${destType === t ? 'bg-[#f38020] text-black' : 'text-slate-400 hover:text-white'}`}>
                        {t === 'URI' ? 'URI Route' : 'IP Address'}
                      </button>
                    ))}
                  </div>
                </div>
                {destType === 'URI' ? (
                  <input type="text" placeholder="http://localhost:8080" value={destUri}
                    onChange={e => setDestUri(e.target.value)} className="input-glass font-mono text-sm" />
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    <Select value={protocol} onValueChange={(val) => val && setProtocol(val)}>
                      <SelectTrigger className="col-span-1 text-sm" />
                      <SelectPortal>
                        <SelectContent>
                          {['http://', 'https://', 'unix://', 'tcp://', 'ssh://', 'rdp://', 'unix+tls://', 'smb://'].map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                    <input type="text" placeholder="192.168.1.10" value={ip} onChange={e => setIp(e.target.value)}
                      className="input-glass col-span-2 font-mono text-sm" />
                    <input type="number" placeholder="80" value={port} onChange={e => setPort(e.target.value)}
                      className="input-glass col-span-1 font-mono text-sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Exposure */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: ApplicationExposureTypeEnum.PUBLIC, icon: Globe, label: 'Public', desc: 'Anyone can access' },
                  { value: ApplicationExposureTypeEnum.PUBLIC_WITH_ACCESS, icon: ShieldCheck, label: 'Protected', desc: 'Cloudflare Access required' },
                  { value: ApplicationExposureTypeEnum.WARP, icon: Lock, label: 'Private (WARP)', desc: 'Members with WARP only' },
                ] as const).map(opt => (
                  <label key={opt.value} className="cursor-pointer">
                    <input type="radio" className="sr-only" checked={exposureType === opt.value} onChange={() => setExposureType(opt.value)} />
                    <div className={`rounded-xl p-4 border transition-all h-full ${exposureType === opt.value ? 'border-[#f38020]/50 bg-[#f38020]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}>
                      <opt.icon className={`w-6 h-6 mb-2 ${exposureType === opt.value ? 'text-[#f38020]' : 'text-slate-400'}`} />
                      <span className="block text-sm font-semibold text-white mb-0.5">{opt.label}</span>
                      <span className="block text-xs text-slate-400 leading-snug">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {exposureType !== 'WARP' && (
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <label className="block text-sm font-medium text-white">Public URL Configuration</label>
                    <button
                      type="button"
                      onClick={addPublicUrlConfig}
                      className="btn-ghost h-9 px-3 text-xs flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add URL
                    </button>
                  </div>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                    {publicUrlConfigs.map((config, index) => (
                      <div key={config.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="subdomain"
                          value={config.subdomain}
                          onChange={e => updatePublicUrlConfig(config.id, { subdomain: e.target.value })}
                          className="input-glass flex-1 text-right"
                        />
                        <span className="text-slate-400 font-bold text-lg">.</span>
                        <Select value={config.zone} onValueChange={(val) => val && updatePublicUrlConfig(config.id, { zone: val })}>
                          <SelectTrigger className="flex-1" placeholder="Select domain..." />
                          <SelectPortal>
                            <SelectContent>
                              {zones.map((z) => (
                                <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </SelectPortal>
                        </Select>
                        <button
                          type="button"
                          onClick={() => removePublicUrlConfig(config.id)}
                          disabled={publicUrlConfigs.length === 1}
                          title={publicUrlConfigs.length === 1 ? 'At least one URL is required' : `Remove URL ${index + 1}`}
                          className="h-10 w-10 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-red-300 hover:border-red-400/30 hover:bg-red-500/10 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-white/10 disabled:hover:bg-white/[0.02] flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    A CNAME record will automatically be created for each URL
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Policy */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'OPEN', label: 'Open Team Access', desc: 'Every authenticated user can access' },
                  { value: 'RESTRICTED', label: 'Restricted Access', desc: 'Limit to specific users or groups' },
                ] as const).map(opt => (
                  <label key={opt.value} className="cursor-pointer">
                    <input type="radio" className="sr-only" checked={policyType === opt.value} onChange={() => setPolicyType(opt.value)} />
                    <div className={`rounded-xl p-4 border h-full transition-all ${policyType === opt.value ? 'border-[#f38020]/50 bg-[#f38020]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}>
                      <span className="block text-sm font-semibold text-white mb-1">{opt.label}</span>
                      <span className="block text-xs text-slate-400">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {policyType === 'RESTRICTED' && (
                <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                  {/* <div className="flex bg-black/30 p-1 rounded-lg self-start inline-flex gap-1">
                    {(['USERS', 'GROUP'] as const).map(t => (
                      <button key={t} onClick={() => setRestrictedType(t)}
                        className={`px-3 py-1.5 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${restrictedType === t ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        {t === 'USERS' ? <Users className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        {t === 'USERS' ? 'Specific Users' : 'Access Group'}
                      </button>
                    ))}
                  </div>

                  {restrictedType === 'USERS' ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Select users to grant access</label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {users.map(u => {
                          const isSelected = selectedUsers.includes(u.email);
                          return (
                            <button key={u.id}
                              onClick={() => setSelectedUsers(prev => isSelected ? prev.filter(e => e !== u.email) : [...prev, u.email])}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSelected ? 'border-[#f38020]/30 bg-[#f38020]/5' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'border-[#f38020] bg-[#f38020]' : 'border-white/20'}`}>
                                {isSelected && <Check className="w-3 h-3 text-black" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">Total selected: {selectedUsers.length}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Choose reusable Cloudflare group</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {groups.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
                            <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">No reusable groups found in Cloudflare.</p>
                          </div>
                        ) : (
                          groups.map(g => (
                            <label key={g.id} className="cursor-pointer block">
                              <input type="radio" className="sr-only" checked={selectedGroupId === g.id} onChange={() => setSelectedGroupId(g.id)} />
                              <div className={`p-4 rounded-xl border transition-all ${selectedGroupId === g.id ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-bold text-white leading-none">{g.name}</span>
                                  {selectedGroupId === g.id && <Shield className="w-4 h-4 text-[#8b5cf6]" />}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono opacity-60">{g.id}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )} */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Active Policies</label>
                    <div className="space-y-2">
                      {policies.length === 0 && (
                        <p className="text-sm text-slate-500 py-4 text-center">No policies available. <Link href="/policies" className="text-[#f38020] hover:underline">Create one first.</Link></p>
                      )}
                      {policies.map((policy) => (
                        <label key={policy.id} className="cursor-pointer mb-2">
                          <input type="radio" className="sr-only" checked={selectedPolicy === policy.id} onChange={() => setSelectedPolicy(policy.id)} />
                          <div className={`mb-2 flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedPolicy === policy.id ? 'border-[#f38020]/50 bg-[#f38020]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}>
                            <div>
                              <span className="text-sm font-medium text-white">{policy.name}</span>
                            </div>
                            <span className="ml-auto text-xs font-mono text-slate-500">{policy.decision}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Tunnel */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border border-[#f38020]/30 bg-[#f38020]/10 rounded-xl p-5 flex items-start gap-4">
                <span className="text-2xl" role="img" aria-label="link">🔗</span>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Select Tunnel</h4>
                  <p className="text-xs text-slate-300">Choose which Cloudflare Tunnel should route traffic for this application.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Active Tunnels</label>
                <div className="space-y-2">
                  {tunnels.length === 0 && (
                    <p className="text-sm text-slate-500 py-4 text-center">No tunnels available. <Link href="/tunnels" className="text-[#f38020] hover:underline">Create one first.</Link></p>
                  )}
                  {tunnels.map((t) => (
                    <label key={t.id} className="cursor-pointer mb-1">
                      <input type="radio" className="sr-only" checked={selectedTunnel === t.id} onChange={() => setSelectedTunnel(t.id)} />
                      <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedTunnel === t.id ? 'border-[#f38020]/50 bg-[#f38020]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}>
                        <div className={`w-2 h-2 rounded-full ${t.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                        <div>
                          <span className="text-sm font-medium text-white">{t.name}</span>
                          <span className="text-xs text-slate-400 ml-2">({t.status})</span>
                        </div>
                        <span className="ml-auto text-xs font-mono text-slate-500">{t.cfTunnelId?.slice(0, 12)}...</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-black/20 flex justify-between items-center">
          <button onClick={prevStep} disabled={step === 0}
            className={`btn-ghost flex items-center gap-2 ${step === 0 ? 'invisible' : ''}`}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step == 3 ? (
            <button onClick={handleSubmit} disabled={loading} className="btn-orange bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_14px_rgba(16,185,129,0.35)]">
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <>Deploy App <Rocket className="w-4 h-4" /></>}
            </button>

          ) : (
            <button onClick={nextStep} className="btn-orange">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Error"
        maxWidth="sm"
        footer={<button onClick={() => setErrorModalOpen(false)} className="btn-orange w-full">Understand</button>}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-300">{errorMessage}</p>
        </div>
      </Modal>
    </div>
  );
}
