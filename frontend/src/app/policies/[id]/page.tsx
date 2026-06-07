'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getAccessPolicy, getAppsUsingPolicy, getGatewayLists, deleteAccessPolicy, getCfAccessGroups, getDevicePostureRules } from '@/lib/api';
import { Shield, ChevronLeft, ExternalLink, Calendar, Clock, Hash, AppWindow, Settings, UserCheck, Globe, RefreshCw, CheckCircle2, XCircle, Info, Layers, Activity, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AccessApp, AccessPolicy, DevicePostureRule } from '@shared/types';

export default function PolicyDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [policy, setPolicy] = useState<AccessPolicy | null>(null);
  const [allApps, setAllApps] = useState<AccessApp[]>([]);
  const [gatewayLists, setGatewayLists] = useState<any[]>([]);
  const [accessGroups, setAccessGroups] = useState<any[]>([]);
  const [postureRules, setPostureRules] = useState<DevicePostureRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Phase 1: Fetch core policy data and assignments
      const [policyRes, appsRes] = await Promise.all([
        getAccessPolicy(id as string),
        getAppsUsingPolicy(id as string)
      ]);

      if (policyRes.data?.success === false) {
        throw new Error(policyRes.data.message || 'Failed to fetch policy detail');
      }

      const fetchedPolicy = policyRes.data.result;
      setPolicy(fetchedPolicy);
      setAllApps(appsRes.data?.result || []);

      // Phase 2: Detect and fetch required metadata
      if (fetchedPolicy) {
        const allRules = [
          ...(fetchedPolicy.include || []),
          ...(fetchedPolicy.require || []),
          ...(fetchedPolicy.exclude || [])
        ];

        const requiredSources = {
          lists: allRules.some(r => r.ip_list || r.email_list),
          groups: allRules.some(r => r.group),
          posture: allRules.some(r => r.device_posture)
        };

        const metaPromises = [];
        if (requiredSources.lists) metaPromises.push(getGatewayLists());
        if (requiredSources.groups) metaPromises.push(getCfAccessGroups());
        if (requiredSources.posture) metaPromises.push(getDevicePostureRules());

        if (metaPromises.length > 0) {
          const metaResults = await Promise.all(metaPromises);
          
          let resultIdx = 0;
          if (requiredSources.lists) setGatewayLists(metaResults[resultIdx++].data?.result || []);
          if (requiredSources.groups) setAccessGroups(metaResults[resultIdx++].data?.result || []);
          if (requiredSources.posture) setPostureRules(metaResults[resultIdx++].data?.result || []);
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Could not load policy details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccessPolicy(id as string);
      router.push('/policies');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete policy: ' + (err.response?.data?.message || err.message));
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-40">
          <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mb-4" />
          <p className="text-slate-500 animate-pulse">Loading policy configuration...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !policy) {
    return (
      <AppLayout>
        <div className="glass-panel p-12 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-6 opacity-20" />
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Policy</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">{error || 'The requested policy could not be found.'}</p>
          <button onClick={() => router.push('/policies')} className="btn-orange flex items-center gap-2 mx-auto">
            <ChevronLeft className="w-4 h-4" /> Back to List
          </button>
        </div>
      </AppLayout>
    );
  }

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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {(decision || 'unknown').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getUniqueTypeCount = (rules: any[]) => {
    if (!rules || !Array.isArray(rules)) return 0;
    const types = new Set<string>();
    rules.forEach(rule => {
      const keys = Object.keys(rule);
      if (keys.length > 0) types.add(keys[0]);
    });
    return types.size;
  };

  const inclCount = getUniqueTypeCount(policy.include || []);
  const reqCount = getUniqueTypeCount(policy.require || []);
  const exclCount = getUniqueTypeCount(policy.exclude || []);


  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/policies')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{policy.name}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Access Policy</span>
                <span>•</span>
                <span className="font-mono">{policy.id}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold hover:bg-red-500/10 transition-all flex items-center gap-2 shadow-lg shadow-red-500/5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Policy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Rules & Details */}
        <div className="xl:col-span-2 space-y-8">

          {/* Section 1: Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <OverviewCard label="Action" value={getDecisionBadge(policy.decision)} icon={Activity} />
            {/* <OverviewCard label="Apps Assigned" value={policy.app_count || 0} icon={AppWindow} /> */}
            <OverviewCard label="Total Rules" value={inclCount + reqCount + exclCount} icon={Layers} />
            <OverviewCard label="Session duration" value={policy.session_duration || 'Default'} icon={Clock} />
            <OverviewCard label="Last Updated" value={formatDate(policy.updated_at)} icon={RefreshCw} />
            {/* <OverviewCard label="Created" value={formatDate(policy.createdAt || policy.created_at)} icon={Calendar} />
            <OverviewCard label="Precedence" value={policy.precedence || '0'} icon={Hash} />
            <OverviewCard label="Status" value={policy.enabled !== false ? 'Active' : 'Disabled'} icon={Settings} statusColor={policy.enabled !== false ? 'text-emerald-400' : 'text-slate-500'} /> */}
          </div>

          {/* Section 3: Policy Details (Rules) */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-white">Policy Details</h2>
            </div>

            <div className="space-y-6">
              {policy.include && policy.include.length > 0 && (
                <RuleSegment title="Include" items={policy.include} gatewayLists={gatewayLists} accessGroups={accessGroups} postureRules={postureRules} color="emerald" />
              )}
              {policy.require && policy.require.length > 0 && (
                <RuleSegment title="Require" items={policy.require} gatewayLists={gatewayLists} accessGroups={accessGroups} postureRules={postureRules} color="blue" />
              )}
              {policy.exclude && policy.exclude.length > 0 && (
                <RuleSegment title="Exclude" items={policy.exclude} gatewayLists={gatewayLists} accessGroups={accessGroups} postureRules={postureRules} color="red" />
              )}
            </div>
          </div>

          {/* Section 4: Context Details */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white">Context Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Connection Rules</div>
                {policy.connection_rules ? (
                  <pre className="text-xs text-slate-400 overflow-auto max-h-40">{JSON.stringify(policy.connection_rules, null, 2)}</pre>
                ) : (
                  <p className="text-sm text-slate-600 italic">No specific connection rules configured.</p>
                )}
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Service Token Settings</div>
                <p className="text-sm text-slate-300">
                  {policy.include?.some((r: any) => r.service_token) ? "Service Token Authentication is enabled for this policy." : "No service tokens assigned to this policy."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Applications & Additional */}
        <div className="space-y-8">
          {/* Section 2: Applications */}
          <div className="glass-panel p-6 h-fit">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AppWindow className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-bold text-white">Applications</h2>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{policy.app_count || 0} Total</span>
            </div>

            <div className="space-y-3">
              {allApps && allApps.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {allApps.map(app => (
                    <a
                      key={app.id}
                      href={app.type === 'self_hosted' ? `https://${app.domain}` : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 ${app.type === 'self_hosted' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {app.logo_url ? (
                            <img src={app.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5 border border-white/10" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                              <AppWindow className="w-5 h-5 text-purple-500" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-emerald-500 border-2 border-[#0f172a] shadow-lg" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors uppercase tracking-tight">{app.name}</span>
                          <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors leading-tight">{app.domain}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${app.type === 'self_hosted'
                          ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                          {app.type?.replace('_', ' ')}
                        </span>
                        {app.type === 'self_hosted' && (
                          <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 text-sm">No applications assigned to this global policy.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Additional Details */}
          <div className="glass-panel p-6 h-fit shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 mb-6">
              <UserCheck className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-white">Additional Details</h2>
            </div>

            <div className="space-y-4">
              <DetailRow label="Approval Required" value={policy.approval_required ? "Yes" : "No"} highlight={policy.approval_required} />
              <DetailRow label="Approval Groups" value={policy.approval_groups?.length || 0} />
              <DetailRow label="Isolation Required" value={policy.isolation_required ? "Yes" : "No"} />
              <DetailRow label="Purpose Justification" value={policy.purpose_justification_required ? "Optional" : "Disabled"} />

              <div className="pt-4 border-t border-white/5">
                <a
                  href={`https://dash.cloudflare.com/${policy.account_id || '0'}/one/access-controls/policies/${policy.id}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-3 w-full rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                >
                  Manage in Cloudflare
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Policy"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setShowDeleteModal(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer"
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

function OverviewCard({ label, value, icon: Icon, statusColor }: any) {
  return (
    <div className="glass-panel p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-lg font-bold ${statusColor || 'text-white'}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, highlight }: any) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-orange-400' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

function RuleSegment({ title, items, gatewayLists, accessGroups, postureRules, color }: any) {
  const hasItems = items && Array.isArray(items) && items.length > 0;

  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  // Grouping logic
  const groupRules = (rules: any[]) => {
    const groups: Record<string, any[]> = {};
    rules.forEach(rule => {
      const key = Object.keys(rule)[0];
      const value = rule[key];
      if (!groups[key]) groups[key] = [];
      groups[key].push(value);
    });
    return groups;
  };

  // Label formatting logic
  const formatLabel = (key: string, count: number) => {
    // Replace underscores with space and Title Case
    let label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Pluralization
    if (count > 1) {
      if (label.toLowerCase().endsWith('y')) {
        label = label.slice(0, -1) + 'ies';
      } else if (!label.toLowerCase().endsWith('s')) {
        label += 's';
      }
    }
    return label;
  };

  // Resolution logic for IDs
  const resolveValue = (key: string, val: any) => {
    // 1. Gateway Lists (IP/Email)
    if ((key === 'email_list' || key === 'ip_list') && typeof val === 'object' && val.id) {
      const list = gatewayLists.find((l: any) => l.id === val.id);
      return list ? list.name : (val.id.slice(0, 8) + '...');
    }

    // 2. Access Groups
    if (key === 'group' && typeof val === 'object' && val.id) {
      const group = accessGroups.find((g: any) => g.id === val.id);
      return group ? group.name : (val.id.slice(0, 8) + '...');
    }

    // 3. Device Posture Rules
    if (key === 'device_posture' && typeof val === 'object' && val.integration_uid) {
      const posture = postureRules.find((p: any) => p.id === val.integration_uid);
      return posture ? posture.name : (val.integration_uid.slice(0, 8) + '...');
    }

    if (typeof val === 'object' && val !== null) {
      // Handle simple objects like { email: '...' } or { id: '...' }
      return val.email || val.id || JSON.stringify(val);
    }

    return val !== undefined && val !== null ? String(val) : '';
  };

  const groupedRules = hasItems ? groupRules(items) : {};

  return (
    <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-bold uppercase tracking-widest ${hasItems ? 'text-white' : 'text-slate-600'}`}>
          {title}
        </h3>
        {!hasItems && <span className="text-[10px] text-slate-700 italic">No rules active</span>}
      </div>

      <div className="space-y-4">
        {hasItems ? Object.entries(groupedRules).map(([key, values], idx) => {
          const label = formatLabel(key, values.length);
          const resolvedValues = values.map(v => resolveValue(key, v));

          return (
            <div key={idx} className="flex flex-col gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.04] transition-colors">
              <div className={`w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${colors[color]}`}>
                {label}
              </div>
              <div className="flex flex-wrap gap-2 pl-0.5">
                {resolvedValues.map((val, vIdx) => (
                  <span
                    key={vIdx}
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 font-medium hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {val}
                  </span>
                ))}
              </div>
            </div>
          );
        }) : (
          <div className="col-span-2 h-1 bg-white/5 rounded-full opacity-20" />
        )}
      </div>
    </div>
  );
}
