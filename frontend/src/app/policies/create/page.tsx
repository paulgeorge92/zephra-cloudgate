'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { createAccessPolicy, getCfAccessGroups, getDevicePostureRules, getGatewayLists } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger } from '@/components/ui/select';
import { AccessCondition, DevicePostureRule, ReusableList } from '@/lib/types';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, Globe, ListFilter, Lock, Plus, RefreshCw, Shield, Trash2, UserCheck } from 'lucide-react';

type Decision = 'allow' | 'deny' | 'bypass' | 'non_identity';
type RuleSection = 'include' | 'require' | 'exclude';
type RuleType = 'everyone' | 'email' | 'email_domain' | 'ip' | 'ip_list' | 'email_list' | 'group' | 'device_posture';

interface RuleRow {
  id: string;
  type: RuleType;
  value: string;
}

const DECISIONS: Array<{ value: Decision; label: string; desc: string; color: string }> = [
  { value: 'allow', label: 'Allow', desc: 'Grant access when policy rules match.', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  { value: 'deny', label: 'Deny', desc: 'Block access when policy rules match.', color: 'border-red-500/30 bg-red-500/10 text-red-400' },
  { value: 'bypass', label: 'Bypass', desc: 'Skip Access authentication for matching requests.', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { value: 'non_identity', label: 'Non Identity', desc: 'Use non-identity based access control.', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400' }
];

const RULE_TYPES: Array<{ value: RuleType; label: string; placeholder: string }> = [
  { value: 'everyone', label: 'Everyone', placeholder: 'No value required' },
  { value: 'email', label: 'Email', placeholder: 'user@example.com' },
  { value: 'email_domain', label: 'Email Domain', placeholder: 'example.com' },
  { value: 'ip', label: 'IP / CIDR', placeholder: '203.0.113.10 or 203.0.113.0/24' },
  { value: 'ip_list', label: 'IP List', placeholder: 'Select list' },
  { value: 'email_list', label: 'Email List', placeholder: 'Select list' },
  { value: 'group', label: 'Access Group', placeholder: 'Select group' },
  { value: 'device_posture', label: 'Device Posture', placeholder: 'Select posture check' }
];

const SECTION_META: Record<RuleSection, { title: string; color: string; help: string }> = {
  include: {
    title: 'Include',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    help: 'Users or contexts that can enter this policy.'
  },
  require: {
    title: 'Require',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    help: 'Additional checks that must also be true.'
  },
  exclude: {
    title: 'Exclude',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    help: 'Users or contexts removed from this policy.'
  }
};

const newRule = (type: RuleType = 'everyone'): RuleRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type,
  value: ''
});

function buildCondition(rule: RuleRow): AccessCondition | null {
  const value = rule.value.trim();

  if (rule.type === 'everyone') return { everyone: {} };
  if (!value) return null;

  if (rule.type === 'email') return { email: { email: value } };
  if (rule.type === 'email_domain') return { email_domain: { domain: value } };
  if (rule.type === 'ip') return { ip: { ip: value } };
  if (rule.type === 'ip_list') return { ip_list: { id: value } };
  if (rule.type === 'email_list') return { email_list: { id: value } } as AccessCondition;
  if (rule.type === 'group') return { group: { id: value } };
  if (rule.type === 'device_posture') return { device_posture: { integration_uid: value } };

  return null;
}

function getRuleLabel(type: RuleType): string {
  return RULE_TYPES.find(ruleType => ruleType.value === type)?.label || type;
}

export default function CreatePolicyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [decision, setDecision] = useState<Decision>('allow');
  const [sessionDuration, setSessionDuration] = useState('24h');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approverEmails, setApproverEmails] = useState('');
  const [purposeJustificationRequired, setPurposeJustificationRequired] = useState(false);
  const [isolationRequired, setIsolationRequired] = useState(false);

  const [includeRules, setIncludeRules] = useState<RuleRow[]>([newRule()]);
  const [requireRules, setRequireRules] = useState<RuleRow[]>([]);
  const [excludeRules, setExcludeRules] = useState<RuleRow[]>([]);

  const [lists, setLists] = useState<ReusableList[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [postureRules, setPostureRules] = useState<DevicePostureRule[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [listsRes, groupsRes, postureRes] = await Promise.all([
          getGatewayLists(),
          getCfAccessGroups(),
          getDevicePostureRules()
        ]);

        setLists(listsRes.data.result || []);
        setGroups(groupsRes.data.result || []);
        setPostureRules(postureRes.data.result || []);
      } catch (err) {
        console.error('Failed to load policy metadata', err);
      } finally {
        setLoadingMeta(false);
      }
    }

    fetchMetadata();
  }, []);

  const selectedDecision = useMemo(() => DECISIONS.find(item => item.value === decision) || DECISIONS[0], [decision]);

  const getRules = (section: RuleSection) => {
    if (section === 'include') return includeRules;
    if (section === 'require') return requireRules;
    return excludeRules;
  };

  const setRules = (section: RuleSection, rows: RuleRow[]) => {
    if (section === 'include') setIncludeRules(rows);
    else if (section === 'require') setRequireRules(rows);
    else setExcludeRules(rows);
  };

  const addRule = (section: RuleSection) => {
    setRules(section, [...getRules(section), newRule()]);
  };

  const updateRule = (section: RuleSection, id: string, updates: Partial<RuleRow>) => {
    setRules(section, getRules(section).map(rule => {
      if (rule.id !== id) return rule;
      const next = { ...rule, ...updates };
      if (updates.type && updates.type !== rule.type) next.value = '';
      return next;
    }));
  };

  const removeRule = (section: RuleSection, id: string) => {
    setRules(section, getRules(section).filter(rule => rule.id !== id));
  };

  const buildConditions = (rules: RuleRow[]) => rules.map(buildCondition).filter(Boolean) as AccessCondition[];

  const updatePurposeJustification = (enabled: boolean) => {
    setPurposeJustificationRequired(enabled);

    if (!enabled) {
      setApprovalRequired(false);
      setApproverEmails('');
    }
  };

  const handleSubmit = async () => {
    const include = buildConditions(includeRules);
    const require = buildConditions(requireRules);
    const exclude = buildConditions(excludeRules);

    if (!name.trim()) {
      setError('Policy name is required.');
      return;
    }

    if (include.length === 0) {
      setError('Add at least one Include rule.');
      return;
    }

    const approvalEmails = approverEmails
      .split(/[,;\n]+/)
      .map(email => email.trim())
      .filter(Boolean);

    if (approvalRequired && approvalEmails.length === 0) {
      setError('Enter at least one approver email.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: Record<string, any> = {
      name: name.trim(),
      decision,
      include,
      session_duration: sessionDuration.trim() || undefined,
      purpose_justification_required: purposeJustificationRequired,
      isolation_required: isolationRequired
    };

    if (purposeJustificationRequired) {
      payload.approval_required = approvalRequired;
    }

    if (approvalRequired) {
      payload.approval_groups = [
        {
          approvals_needed: 1,
          email_addresses: approvalEmails
        }
      ];
    }

    if (require.length > 0) payload.require = require;
    if (exclude.length > 0) payload.exclude = exclude;

    try {
      const res = await createAccessPolicy(payload);
      if (res.data.success === false) {
        setError(res.data.message || 'Failed to create policy.');
        return;
      }

      const createdId = res.data.result?.result?.id || res.data.result?.id;
      router.push(createdId ? `/policies/${createdId}` : '/policies');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create policy.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <button
          onClick={() => router.push('/policies')}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Policies
        </button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
              <Shield className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight">Create Access Policy</h1>
              <p className="text-slate-400 text-sm mt-2">Define reusable Zero Trust Access rules for protected applications.</p>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${selectedDecision.color}`}>
            {selectedDecision.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-white">Policy Identity</h2>
            </div>

            <div className="glass-panel p-6 space-y-5">
              <div>
                <label className="block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Policy Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input-glass w-full h-12"
                  placeholder="Engineering access"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Decision</label>
                  <Select value={decision} onValueChange={(value) => setDecision((value || 'allow') as Decision)}>
                    <SelectTrigger className="w-full h-12">
                      <span className="text-sm text-slate-200">{selectedDecision.label}</span>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectContent>
                        {DECISIONS.map(item => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                  <p className="text-[11px] text-slate-500 mt-2">{selectedDecision.desc}</p>
                </div>

                <div>
                  <label className="block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Duration</label>
                  <input
                    value={sessionDuration}
                    onChange={(event) => setSessionDuration(event.target.value)}
                    className="input-glass w-full h-12"
                    placeholder="24h"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">Use Cloudflare duration syntax, such as 1h, 24h, or 7d.</p>
                </div>
              </div>
            </div>
          </section>

          <RuleSectionEditor
            section="include"
            rules={includeRules}
            lists={lists}
            groups={groups}
            postureRules={postureRules}
            loadingMeta={loadingMeta}
            onAdd={() => addRule('include')}
            onUpdate={(id, updates) => updateRule('include', id, updates)}
            onRemove={(id) => removeRule('include', id)}
          />

          <RuleSectionEditor
            section="require"
            rules={requireRules}
            lists={lists}
            groups={groups}
            postureRules={postureRules}
            loadingMeta={loadingMeta}
            onAdd={() => addRule('require')}
            onUpdate={(id, updates) => updateRule('require', id, updates)}
            onRemove={(id) => removeRule('require', id)}
          />

          <RuleSectionEditor
            section="exclude"
            rules={excludeRules}
            lists={lists}
            groups={groups}
            postureRules={postureRules}
            loadingMeta={loadingMeta}
            onAdd={() => addRule('exclude')}
            onUpdate={(id, updates) => updateRule('exclude', id, updates)}
            onRemove={(id) => removeRule('exclude', id)}
          />
        </div>

        <aside className="xl:col-span-4 space-y-8 sticky top-24">
          <section>
            <div className="flex items-center gap-3 mb-6 text-emerald-400">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ArrowRight className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-white">Settings</h2>
            </div>

            <div className="glass-panel p-6 space-y-6">
              <ToggleRow
                label="Purpose Justification"
                description="Ask users to provide business context."
                checked={purposeJustificationRequired}
                onChange={updatePurposeJustification}
              />
              {purposeJustificationRequired && (
                <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <ToggleRow
                    label="Approval Required"
                    description="Require explicit approval after users provide justification."
                    checked={approvalRequired}
                    onChange={setApprovalRequired}
                  />
                  {approvalRequired && (
                    <div>
                      <label className="block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Approver Emails</label>
                      <textarea
                        value={approverEmails}
                        onChange={(event) => setApproverEmails(event.target.value)}
                        className="input-glass w-full min-h-24 resize-y py-3"
                        placeholder="security@example.com, manager@example.com"
                      />
                      <p className="text-[11px] text-slate-500 mt-2">Separate multiple approvers with commas or new lines.</p>
                    </div>
                  )}
                </div>
              )}
              <ToggleRow
                label="Browser Isolation"
                description="Require isolation for sessions matching this policy."
                checked={isolationRequired}
                onChange={setIsolationRequired}
              />

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="btn-orange w-full h-14 rounded-2xl font-black uppercase tracking-widest disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Create Policy
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push('/policies')}
                className="w-full h-11 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Cancel
              </button>
            </div>
          </section>
        </aside>
      </div>
    </AppLayout>
  );
}

function RuleSectionEditor({
  section,
  rules,
  lists,
  groups,
  postureRules,
  loadingMeta,
  onAdd,
  onUpdate,
  onRemove
}: {
  section: RuleSection;
  rules: RuleRow[];
  lists: ReusableList[];
  groups: any[];
  postureRules: DevicePostureRule[];
  loadingMeta: boolean;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<RuleRow>) => void;
  onRemove: (id: string) => void;
}) {
  const meta = SECTION_META[section];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListFilter className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="text-xl font-bold text-white">{meta.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{meta.help}</p>
          </div>
        </div>
        <button onClick={onAdd} className="btn-ghost flex items-center gap-2 text-xs">
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <div className="glass-panel p-6 space-y-3">
        {rules.length === 0 ? (
          <button
            onClick={onAdd}
            className="w-full p-5 rounded-2xl border border-dashed border-white/10 text-slate-500 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
          >
            Add {meta.title} rule
          </button>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="grid grid-cols-1 md:grid-cols-[180px_1fr_44px] gap-3 items-end">
              <div>
                <label className="block mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Selector</label>
                <Select value={rule.type} onValueChange={(value) => onUpdate(rule.id, { type: (value || 'everyone') as RuleType })}>
                  <SelectTrigger className="w-full h-11">
                    <span className="text-sm text-slate-200">{getRuleLabel(rule.type)}</span>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent>
                      {RULE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">{getRuleLabel(rule.type)}</label>
                <RuleValueInput
                  rule={rule}
                  lists={lists}
                  groups={groups}
                  postureRules={postureRules}
                  loadingMeta={loadingMeta}
                  onChange={(value) => onUpdate(rule.id, { value })}
                />
              </div>

              <button
                onClick={() => onRemove(rule.id)}
                className="w-11 h-11 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 text-slate-500 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RuleValueInput({
  rule,
  lists,
  groups,
  postureRules,
  loadingMeta,
  onChange
}: {
  rule: RuleRow;
  lists: ReusableList[];
  groups: any[];
  postureRules: DevicePostureRule[];
  loadingMeta: boolean;
  onChange: (value: string) => void;
}) {
  const definition = RULE_TYPES.find(item => item.value === rule.type);

  if (rule.type === 'everyone') {
    return (
      <div className="input-glass h-11 flex items-center gap-2 text-slate-500">
        <Globe className="w-4 h-4" />
        Matches everyone
      </div>
    );
  }

  if (rule.type === 'ip_list' || rule.type === 'email_list') {
    const listType = rule.type === 'ip_list' ? 'IP' : 'EMAIL';
    const options = lists.filter(list => list.type === listType);

    return (
      <Select value={rule.value} onValueChange={(value) => onChange(value || '')}>
        <SelectTrigger className="w-full h-11">
          <span className={rule.value ? 'text-sm text-slate-200' : 'text-sm text-slate-500'}>
            {options.find(list => list.id === rule.value)?.name || (loadingMeta ? 'Loading lists...' : definition?.placeholder)}
          </span>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            {options.map(list => (
              <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
            ))}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  }

  if (rule.type === 'group') {
    return (
      <Select value={rule.value} onValueChange={(value) => onChange(value || '')}>
        <SelectTrigger className="w-full h-11">
          <span className={rule.value ? 'text-sm text-slate-200' : 'text-sm text-slate-500'}>
            {groups.find(group => group.id === rule.value)?.name || (loadingMeta ? 'Loading groups...' : definition?.placeholder)}
          </span>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
            ))}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  }

  if (rule.type === 'device_posture') {
    return (
      <Select value={rule.value} onValueChange={(value) => onChange(value || '')}>
        <SelectTrigger className="w-full h-11">
          <span className={rule.value ? 'text-sm text-slate-200' : 'text-sm text-slate-500'}>
            {postureRules.find(posture => posture.id === rule.value)?.name || (loadingMeta ? 'Loading posture checks...' : definition?.placeholder)}
          </span>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            {postureRules.map(posture => (
              <SelectItem key={posture.id} value={posture.id}>{posture.name}</SelectItem>
            ))}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  }

  return (
    <input
      value={rule.value}
      onChange={(event) => onChange(event.target.value)}
      className="input-glass w-full h-11"
      placeholder={definition?.placeholder}
    />
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-white">{label}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-emerald-500' : 'bg-white/10'}`}
      >
        <span className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
