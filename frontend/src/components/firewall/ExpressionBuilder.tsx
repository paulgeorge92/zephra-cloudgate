'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, AlertCircle } from 'lucide-react';
import { FirewallRuleCondition, FirewallContentCategory } from '@/lib/types';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectPortal,
} from '@/components/ui/select';

// Define available fields for each type
const FIELDS_CONFIG: Record<string, { id: string, label: string }[]> = {
  DNS: [
    { id: 'dns.domains', label: 'Domains' },
    { id: 'dns.content_category', label: 'Content Categories' },
    { id: 'ip.src.country', label: 'Source Country' },
    { id: 'identity.email', label: 'User Email' },
    { id: 'dns.query_type', label: 'DNS Query Type' },
  ],
  NETWORK: [
    { id: 'net.dst.ip', label: 'Destination IP' },
    { id: 'net.src.ip', label: 'Source IP' },
    { id: 'net.protocol', label: 'Protocol' },
    { id: 'net.dst.port', label: 'Destination Port' },
    { id: 'ip.src.country', label: 'Source Country' },
  ],
  HTTP: [
    { id: 'http.host', label: 'HTTP Host' },
    { id: 'http.request.uri', label: 'HTTP Path' },
    { id: 'http.request.method', label: 'HTTP Method' },
    { id: 'ip.src.country', label: 'Source Country' },
    { id: 'identity.email', label: 'User Email' },
    { id: 'device.posture', label: 'Device Posture' },
  ]
};

const OPERATORS = [
  { id: '==', label: 'is' },
  { id: '!=', label: 'is not' },
  { id: 'in', label: 'is in' },
  { id: 'not in', label: 'is not in' },
  { id: 'contains', label: 'contains' },
  { id: 'matches', label: 'matches (regex)' },
];

interface ExpressionBuilderProps {
  type: 'DNS' | 'NETWORK' | 'HTTP';
  onChange: (expression: string) => void;
  categories: FirewallContentCategory[];
}

export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({ type, onChange, categories }) => {
  const fields = FIELDS_CONFIG[type] || FIELDS_CONFIG.NETWORK;
  const [conditions, setConditions] = useState<FirewallRuleCondition[]>([
    { field: fields[0].id, operator: '==', value: '', logic: 'and' }
  ]);

  const generateExpression = (conds: FirewallRuleCondition[]) => {
    return conds.map((c, i) => {
      const field = c.field;
      const op = c.operator;
      const val = c.value;

      // Formatting value based on field and operator
      let formattedVal = '';
      if (op === 'in' || op === 'not in') {
        if (field === 'dns.content_category') {
          // If value is comma separated IDs
          const ids = val.split(',').map((v: string) => v.trim()).filter(Boolean);
          formattedVal = `{${ids.join(' ')}}`;
        } else {
          const items = val.split(',').map((v: string) => `"${v.trim()}"`).join(' ');
          formattedVal = `{${items}}`;
        }
      } else {
        // Numeric fields or special types might not need quotes
        const isNumeric = ['net.dst.port', 'dns.content_category'].includes(field);
        formattedVal = isNumeric ? val : `"${val}"`;
      }

      const segment = `${field} ${op} ${formattedVal}`;
      return i === 0 ? segment : `${c.logic} ${segment}`;
    }).join(' ');
  };

  useEffect(() => {
    const expr = generateExpression(conditions);
    onChange(expr);
  }, [conditions, type]);

  const addCondition = () => {
    setConditions([...conditions, { field: fields[0].id, operator: '==', value: '', logic: 'and' }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length === 1) return;
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<FirewallRuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };



  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-slate-400">Traffic Expression Builder</h4>
        <button onClick={addCondition} className="text-xs flex items-center gap-1 text-[#f38020] hover:text-orange-400 transition-colors">
          <Plus className="w-3 h-3" /> Add Condition
        </button>
      </div>

      <div className="space-y-3">
        {conditions.map((condition, idx) => (
          <div key={idx} className="flex gap-2 items-end group animate-in slide-in-from-left-2 duration-300">
            {idx > 0 && (
              <div className="w-20">
                <Select value={condition.logic} onValueChange={(val) => updateCondition(idx, { logic: val as any })}>
                  <SelectTrigger className="text-[10px] h-9" />
                  <SelectPortal>
                    <SelectContent>
                      <SelectItem value="and">AND</SelectItem>
                      <SelectItem value="or">OR</SelectItem>
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] text-slate-500 mb-1 block">Selector</label>
              <Select value={condition.field} onValueChange={(val) => updateCondition(idx, { field: val || '' })}>
                <SelectTrigger className="text-xs h-9" />
                <SelectPortal>
                  <SelectContent>
                    {fields.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </div>

            <div className="w-32">
              <label className="text-[10px] text-slate-500 mb-1 block">Operator</label>
              <Select value={condition.operator} onValueChange={(val) => updateCondition(idx, { operator: val || '' })}>
                <SelectTrigger className="text-xs h-9" />
                <SelectPortal>
                  <SelectContent>
                    {OPERATORS.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </div>

            <div className="flex-[2]">
              <label className="text-[10px] text-slate-500 mb-1 block">Value</label>
              <input
                type="text"
                value={condition.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                className="input-glass h-9 text-xs"
                placeholder={condition.operator.includes('in') ? 'val1, val2' : 'Value...'}
              />
            </div>

            <button
              onClick={() => removeCondition(idx)}
              className="p-2.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all mb-[1px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-black/20 rounded-lg p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <Info className="w-3 h-3" />
          Expression Preview
        </div>
        <code className="text-xs text-orange-200 break-all font-mono leading-relaxed">
          {generateExpression(conditions) || '...'}
        </code>
      </div>

      {conditions.some(c => c.field === 'dns.content_category') && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg flex gap-3">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Content Category selection uses ID numbers. Refer to the Zero Trust categories documentation for a full list of IDs.
          </p>
        </div>
      )}
    </div>
  );
};
