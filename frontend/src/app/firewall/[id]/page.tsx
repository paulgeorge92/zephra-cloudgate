'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getFirewallPolicy, getFirewallCategories, getGatewayLists, getFirewallAppTypes } from '@/lib/api';
import { FirewallPolicy, FirewallContentCategory, ReusableList, FirewallAppType } from '@/lib/types';
import { parseWirefilter, FIELD_LABELS, getActionConfig, OPERATORS } from '@/lib/wirefilter.util';
import { ChevronLeft, Shield, Activity, Globe, Clock, Info, Code, CheckCircle2, XCircle, AlertTriangle, Settings2, ListFilter, Users, ExternalLink, MessageSquare, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const TYPE_COLORS: Record<string, string> = {
  NETWORK: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  DNS: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  HTTP: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

export default function FirewallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [policy, setPolicy] = useState<FirewallPolicy | null>(null);
  const [categories, setCategories] = useState<FirewallContentCategory[]>([]);
  const [appTypes, setAppTypes] = useState<FirewallAppType[]>([]);
  const [lists, setLists] = useState<ReusableList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [policyRes, categoriesRes, listsRes, appTypesRes] = await Promise.all([
          getFirewallPolicy(id),
          getFirewallCategories(),
          getGatewayLists(),
          getFirewallAppTypes(),
        ]);

        if (policyRes.data.success) {
          setPolicy(policyRes.data.result || null);
        } else {
          setError(policyRes.data.message || 'Failed to load policy');
        }

        setCategories(categoriesRes.data.result || []);
        // gateway lists handles result differently in some implementations, but usually res.result
        setLists(listsRes.data.result || []);

        // app types handles result differently in some implementations, but usually res.result
        setAppTypes(appTypesRes.data.result || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to fetch policy details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const parsedTraffic = useMemo(() => parseWirefilter(policy?.traffic || ''), [policy?.traffic]);
  const parsedIdentity = useMemo(() => parseWirefilter(policy?.identity || ''), [policy?.identity]);
  const policyAction = policy ? getActionConfig(policy.action) : undefined;

  const findCategoryById = (id: string, cats: FirewallContentCategory[]): FirewallContentCategory | undefined => {
    for (const cat of cats) {
      if (cat.id.toString() === id) return cat;
      if (cat.subcategories) {
        const found = findCategoryById(id, cat.subcategories);
        if (found) return found;
      }
    }
    return undefined;
  };

  const resolveValue = (field: string, value: string, isList: boolean) => {
    if (isList) {
      const list = lists.find(l => l.id === value);
      return list ? (
        <Link href={`/lists/${list.id}`} title={list.description || undefined}>
          <span className="flex items-center gap-1.5 text-blue-400 font-semibold underline underline-offset-4 decoration-blue-500/30">
            {list.name}
            <ExternalLink className="w-3 h-3" />
          </span>
        </Link>
      ) : `$${value}`;
    }

    switch (FIELD_LABELS[field] || field) {
      case 'Content Categories':
      case 'Security Categories':
        const ids = value.split(',').map(v => v.trim());
        return (
          <div className="flex flex-wrap gap-2">
            {ids.map(idStr => {
              const cat = findCategoryById(idStr, categories);
              return (
                <span
                  key={idStr}
                  title={cat?.description || undefined}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[13px] text-slate-300 flex items-center gap-1"
                >
                  {cat ? cat.name : `ID: ${idStr}`}
                  <Info className="w-2.5 h-2.5 opacity-40" />
                </span>
              );
            })}
          </div>
        );
      case 'Application':
        const appIds = value.split(',').map(v => v.trim());
        return (
          <div className="flex flex-wrap gap-2">
            {appIds.map(idStr => {
              const appType = appTypes.find(a => a.id.toString() === idStr);
              return (
                <span
                  key={idStr}
                  title={appType?.description || undefined}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[13px] text-slate-300 flex items-center gap-1"
                >
                  {appType ? appType.name : `App ID: ${idStr}`}
                  <Info className="w-2.5 h-2.5 opacity-40" />
                </span>
              );
            })}
          </div>
        );

      default:
        const values = value.split(',').map(v => v.trim());
        if (Array.isArray(values) && values.length > 1) {
          return (
            <div className="flex flex-wrap gap-2">
              {values.map((val, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[13px] text-slate-300">
                  {val.trim()}
                </span>
              ))}
            </div>
          );
        }
        return <span className="text-slate-200">{value}</span>;
    }
  };

  const resolveOperator = (operator: string) => {
    return OPERATORS.find(op => op.id === operator)?.label || operator;
  }

  if (loading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm animate-pulse tracking-widest uppercase font-bold">Policy Analysis in Progress</p>
      </div>
    </AppLayout>
  );

  if (error || !policy) return (
    <AppLayout>
      <div className="glass-panel p-12 text-center max-w-2xl mx-auto mt-20">
        <div className="w-20 h-20 bg-red-500/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/10">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Sync Error</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">{error || 'The requested Gateway policy could not be found or has been removed from Cloudflare.'}</p>
        <button onClick={() => router.push('/firewall')} className="btn-orange px-10 py-3 rounded-xl font-bold">Return to Dashboard</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="mb-8 animate-in fade-in duration-700">
        <button
          onClick={() => router.push('/firewall')}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Policies
        </button>

        <div className="flex justify-between items-end pb-8 border-b border-white/5">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#f38020]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {policy.type === 'DNS' && <Globe className="w-8 h-8 text-blue-400 relative z-10" />}
              {policy.type === 'NETWORK' && <Activity className="w-8 h-8 text-orange-400 relative z-10" />}
              {policy.type === 'HTTP' && <Shield className="w-8 h-8 text-purple-400 relative z-10" />}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">{policy.name}</h1>
                <div className="flex items-center gap-2">
                  {policy.enabled ? (
                    <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 font-bold uppercase tracking-widest">
                      <XCircle className="w-3 h-3" />
                      Disabled
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase ${TYPE_COLORS[policy.type]}`}>
                    {policy.type} Layer
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-lg font-medium">{policy.description || 'Secure Gateway Policy configuration for your organization.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scope (Conditions) */}
        <div className="lg:col-span-8 space-y-8 animate-in slide-in-from-left-4 duration-700">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#f38020]/10 flex items-center justify-center border border-[#f38020]/20">
                <span className="text-xs font-black text-[#f38020]">IF</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Scope & Conditions</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
            </div>

            <div className="space-y-6">
              {/* Traffic Condition Block */}
              <div className="glass-panel p-6 border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="w-12 h-12" />
                </div>

                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">
                  <ListFilter className="w-3.5 h-3.5 text-[#f38020]" />
                  Traffic Matches
                </div>

                <div className="space-y-4">
                  {parsedTraffic.length > 0 ? parsedTraffic.map((cond, idx) => (
                    <div key={idx} className="relative">
                      {idx > 0 && (
                        <div className="flex justify-center my-2 relative z-10">
                          <span className="px-3 py-0.5 rounded-md bg-blue-600 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40">
                            {cond.logic || 'AND'}
                          </span>
                        </div>
                      )}
                      <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-6 hover:bg-black/40 transition-colors">
                        <div className="w-48 shrink-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Field API Selector</span>
                          <span className="text-slate-300 font-bold">{FIELD_LABELS[cond.field] || cond.field}</span>
                        </div>
                        <div className="md:w-32 shrink-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Operator</span>
                          <span className="text-emerald-400 font-mono font-bold tracking-widest">{resolveOperator(cond.operator)}</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Criteria Value</span>
                          <div className="text-sm">
                            {resolveValue(cond.field, cond.value, cond.isList)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-500 italic text-sm">
                      No traffic conditions defined. Access is restricted by default.
                    </div>
                  )}
                </div>
              </div>

              {/* Identity Condition Block */}
              {parsedIdentity.length > 0 && (
                <div className="glass-panel p-6 border-blue-500/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
                    <Users className="w-12 h-12" />
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Identity Matches
                  </div>

                  <div className="space-y-4">
                    {parsedIdentity.map((cond, idx) => (
                      <div key={idx} className="relative">
                        {idx > 0 && (
                          <div className="flex justify-center my-2 relative z-10">
                            <span className="px-3 py-0.5 rounded-md bg-blue-600 text-[10px] font-black uppercase tracking-widest">
                              {cond.logic || 'AND'}
                            </span>
                          </div>
                        )}
                        <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-6">
                          <div className="w-48 shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Identity field</span>
                            <span className="text-slate-300 font-bold">{FIELD_LABELS[cond.field] || cond.field}</span>
                          </div>
                          <div className="md:w-32 shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Operator</span>
                            <span className="text-blue-400 font-mono font-bold tracking-widest">{resolveOperator(cond.operator)}</span>
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Authenticated Value</span>
                            <div className="text-sm">
                              {resolveValue(cond.field, cond.value, cond.isList)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Raw Code Block */}
          <section className="animate-in fade-in duration-1000 delay-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Code className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Wirefilter (Raw Expression)</h3>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 font-mono relative group">
              <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Cloudflare Read Only Source
              </div>
              <p className="text-blue-200/50 text-xs leading-relaxed break-all">
                {policy.traffic}
              </p>
              {policy.identity && (
                <p className="mt-4 pt-4 border-t border-white/5 text-purple-200/50 text-xs leading-relaxed break-all">
                  {policy.identity}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Actions & Settings */}
        <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-right-4 duration-700">
          <section>
            <div className="flex items-center gap-3 mb-6 text-emerald-400">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ArrowRight className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Action & Settings</h3>
            </div>

            <div className="glass-panel p-8 border-emerald-500/10 space-y-8">
              {/* Action Selection Mock */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Enforced Logic</label>
                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-2xl ${policyAction?.color || 'text-slate-300 bg-slate-500/10 border-slate-500/30'}`}>
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5" />
                    <span className="font-black text-lg uppercase tracking-wider">{policyAction?.ui_string || policy.action}</span>
                  </div>
                  <CheckCircle2 className="w-6 h-6 opacity-30" />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Gateway will immediately execute this action when all conditions in the scope are met.
                </p>
              </div>

              {/* Rule Settings Breakdown */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Enhanced settings</h4>

                <div className="space-y-5">
                  {/* Block Page Toggle Mapping */}
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${policy.rule_settings?.block_page_enabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                      <MessageSquare className={`w-5 h-5 ${policy.rule_settings?.block_page_enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-white">Custom Block Page</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${policy.rule_settings?.block_page_enabled ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                          {policy.rule_settings?.block_page_enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-3">Redirect users to a tailored security restricted page.</p>
                      {policy.rule_settings?.block_page?.target_uri && (
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 group">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Target URI</span>
                          <a
                            href={policy.rule_settings.block_page.target_uri}
                            target="_blank"
                            className="text-[10px] text-blue-400 underline decoration-blue-500/20 truncate block"
                          >
                            {policy.rule_settings.block_page.target_uri}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notification Toggle Mapping */}
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${policy.rule_settings?.notification_settings?.enabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                      <Settings2 className={`w-5 h-5 ${policy.rule_settings?.notification_settings?.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-white">Rule Notifications</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${policy.rule_settings?.notification_settings?.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                          {policy.rule_settings?.notification_settings?.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Alert the Cloudflare One Client when this policy is triggered.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp Metadata */}
              <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Last Synchronized</span>
                    <span className="text-sm text-white font-medium">{policy.updated_at ? new Date(policy.updated_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
