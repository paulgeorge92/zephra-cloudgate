'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getFirewallCategories, getGatewayLists, createFirewallPolicy, getGatewayUiOptions, getDlpFileTypes } from '@/lib/api';
import { FirewallPolicy, FirewallContentCategory, ReusableList } from '@/lib/types';
import { getSelectors, getOperatorsForField, getActionsForLayer, getListTypeForField, stringifyWirefilter, WirefilterBlock, FirewallField, OPERATORS } from '@/lib/wirefilter.util';
import { ChevronLeft, Shield, Activity, Globe, Plus, Trash2, Info, Lock, ArrowRight, AlertTriangle, X, Users, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectPortal, } from '@/components/ui/select';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryPicker — for Content Categories (grouped by `class`) 
// and Security Categories (filtered to "Security threats" subcategories)
// ─────────────────────────────────────────────────────────────────────────────
function CategoryPicker({ categories, selectedIds, onToggle, grouped = false, placeholder = 'Select categories...' }: { categories: FirewallContentCategory[]; selectedIds: string[]; onToggle: (id: string) => void; grouped?: boolean; placeholder?: string; }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Collect all selectable categories (including subcategories) for badge display
  const allItems = useMemo(() => {
    const found: FirewallContentCategory[] = [];
    const traverse = (list: FirewallContentCategory[]) => {
      list.forEach(c => {
        found.push(c);
        if (c.subcategories) traverse(c.subcategories);
      });
    };
    traverse(categories);
    return found;
  }, [categories]);

  const selectedCats = useMemo(
    () => allItems.filter(c => selectedIds.includes(c.id.toString())),
    [allItems, selectedIds]
  );

  // Group top-level categories by their `class` field
  const groupedCategories = useMemo(() => {
    if (!grouped) return null;
    const groups: Record<string, FirewallContentCategory[]> = {};
    categories.forEach(c => {
      const key = c.class || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [categories, grouped]);

  const renderItems = (items: FirewallContentCategory[], depth = 0) =>
    items.map(cat => (
      <div key={cat.id}>
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(cat.id.toString()); }}
          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${selectedIds.includes(cat.id.toString()) ? 'bg-white/10' : 'hover:bg-white/5'}`}
          style={{ paddingLeft: `${16 + depth * 20}px` }}
        >
          <div className={`shrink-0 ${selectedIds.includes(cat.id.toString()) ? 'text-blue-500' : 'text-slate-600'}`}>
            {selectedIds.includes(cat.id.toString()) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </div>
          <span className={`text-sm ${selectedIds.includes(cat.id.toString()) ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
            {cat.name}
          </span>
        </div>
        {cat.subcategories && renderItems(cat.subcategories, depth + 1)}
      </div>
    ));

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`input-glass min-h-[44px] flex flex-wrap items-center gap-1.5 p-1.5 cursor-pointer relative pr-10 ${isOpen ? 'ring-1 ring-[#f38020]' : ''}`}
      >
        {selectedCats.length === 0 ? (
          <span className="text-slate-500 text-xs pl-2">{placeholder}</span>
        ) : (
          selectedCats.map(cat => (
            <div key={cat.id} className="flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[11px] font-bold border border-white/5 hover:bg-white/20 transition-colors">
              {cat.name}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-400 shrink-0"
                onClick={(e) => { e.stopPropagation(); onToggle(cat.id.toString()); }}
              />
            </div>
          ))
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500">
          {selectedIds.length > 0 && (
            <X
              className="w-4 h-4 hover:text-white"
              onClick={(e) => { e.stopPropagation(); selectedIds.forEach(id => onToggle(id)); }}
            />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-2 bg-black border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar pb-2">
            {grouped && groupedCategories
              ? Object.entries(groupedCategories).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, items]) => (
                <div key={groupName}>
                  <div className="px-4 py-2 border-b border-t border-white/5 bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                    {groupName}
                  </div>
                  {renderItems(items, 0)}
                </div>
              ))
              : renderItems(categories)
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GenericMultiPicker — for static string[] values (Protocol, HTTP Method, etc.)
// ─────────────────────────────────────────────────────────────────────────────
function GenericMultiPicker({
  options,
  selectedIds,
  onToggle,
  placeholder = 'Select options...'
}: {
  options: string[];
  selectedIds: string[];
  onToggle: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter(p => selectedIds.includes(p));

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`input-glass min-h-[44px] flex flex-wrap items-center gap-1.5 p-1.5 cursor-pointer relative pr-10 ${isOpen ? 'ring-1 ring-[#f38020]' : ''}`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-500 text-xs pl-2">{placeholder}</span>
        ) : (
          selectedOptions.map(opt => (
            <div key={opt} className="flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[11px] font-bold border border-white/5 hover:bg-white/20 transition-colors">
              {opt}
              <X className="w-3 h-3 cursor-pointer hover:text-red-400 shrink-0"
                onClick={(e) => { e.stopPropagation(); onToggle(opt); }}
              />
            </div>
          ))
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500">
          {selectedIds.length > 0 && (
            <X className="w-4 h-4 hover:text-white"
              onClick={(e) => { e.stopPropagation(); selectedIds.forEach(id => onToggle(id)); }}
            />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-2 bg-black border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-2 border-b border-white/5 bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Make selection
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar pb-2">
            {options.map(opt => (
              <div key={opt} onClick={(e) => { e.stopPropagation(); onToggle(opt); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${selectedIds.includes(opt) ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className={`shrink-0 ${selectedIds.includes(opt) ? 'text-blue-500' : 'text-slate-600'}`}>
                  {selectedIds.includes(opt) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </div>
                <span className={`text-sm ${selectedIds.includes(opt) ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {opt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KeyValueMultiPicker — for {value, label}[] options (HTTP Response codes)
// ─────────────────────────────────────────────────────────────────────────────
function KeyValueMultiPicker({
  options,
  selectedIds,
  onToggle,
  placeholder = 'Select options...'
}: {
  options: { value: string; label: string }[];
  selectedIds: string[];
  onToggle: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter(p => selectedIds.includes(p.value));

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`input-glass min-h-[44px] flex flex-wrap items-center gap-1.5 p-1.5 cursor-pointer relative pr-10 ${isOpen ? 'ring-1 ring-[#f38020]' : ''}`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-500 text-xs pl-2">{placeholder}</span>
        ) : (
          selectedOptions.map(opt => (
            <div key={opt.value} className="flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[11px] font-bold border border-white/5 hover:bg-white/20 transition-colors">
              <span className="max-w-[120px] truncate">{opt.label}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-400 shrink-0"
                onClick={(e) => { e.stopPropagation(); onToggle(opt.value); }}
              />
            </div>
          ))
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500">
          {selectedIds.length > 0 && (
            <X className="w-4 h-4 hover:text-white"
              onClick={(e) => { e.stopPropagation(); selectedIds.forEach(id => onToggle(id)); }}
            />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-2 bg-black border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-2 border-b border-white/5 bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Make selection
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar pb-2">
            {options.map(opt => (
              <div key={opt.value} onClick={(e) => { e.stopPropagation(); onToggle(opt.value); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${selectedIds.includes(opt.value) ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className={`shrink-0 ${selectedIds.includes(opt.value) ? 'text-blue-500' : 'text-slate-600'}`}>
                  {selectedIds.includes(opt.value) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </div>
                <span className={`text-sm ${selectedIds.includes(opt.value) ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {opt.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupedFilePicker — for DLP file types grouped by `category`
// ─────────────────────────────────────────────────────────────────────────────
function GroupedFilePicker({
  fileTypes,
  selectedIds,
  onToggle
}: {
  fileTypes: Record<string, { name: string; category: string; type: string }>;
  selectedIds: string[];
  onToggle: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const optionsArray = Object.entries(fileTypes).map(([ext, data]) => ({ ext, ...data }));
  const grouped = optionsArray.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, typeof optionsArray>);

  const selectedOptions = optionsArray.filter(f => selectedIds.includes(f.ext));

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`input-glass min-h-[44px] flex flex-wrap items-center gap-1.5 p-1.5 cursor-pointer relative pr-10 ${isOpen ? 'ring-1 ring-[#f38020]' : ''}`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-500 text-xs pl-2">Select file types...</span>
        ) : (
          selectedOptions.map(opt => (
            <div key={opt.ext} className="flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[11px] font-bold border border-white/5 hover:bg-white/20 transition-colors">
              <span className="max-w-[120px] truncate">{opt.name || opt.ext}</span>
              <X className="w-3 h-3 cursor-pointer hover:text-red-400 shrink-0" onClick={(e) => { e.stopPropagation(); onToggle(opt.ext); }} />
            </div>
          ))
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500">
          {selectedIds.length > 0 && (
            <X className="w-4 h-4 hover:text-white" onClick={(e) => { e.stopPropagation(); selectedIds.forEach(id => onToggle(id)); }} />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-2 bg-black border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar pb-2">
            {Object.keys(grouped).sort().map(category => (
              <div key={category} className="mb-2">
                <div className="px-4 py-2 border-b border-t border-white/5 bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                  {category}
                </div>
                {grouped[category].map(opt => (
                  <div key={opt.ext} onClick={(e) => { e.stopPropagation(); onToggle(opt.ext); }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${selectedIds.includes(opt.ext) ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <div className={`shrink-0 ${selectedIds.includes(opt.ext) ? 'text-blue-500' : 'text-slate-600'}`}>
                      {selectedIds.includes(opt.ext) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className={`block text-sm ${selectedIds.includes(opt.ext) ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {opt.name || opt.ext}
                      </span>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider">{opt.ext}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ValueInput — central dispatcher for the value column in a condition row
// ─────────────────────────────────────────────────────────────────────────────
function ValueInput({
  fieldDef,
  operator,
  value,
  onChange,
  onToggle,
  lists,
  categories,
  httpResponses,
  dlpFileTypes,
}: {
  fieldDef: FirewallField;
  operator: string;
  value: string;
  onChange: (val: string) => void;
  onToggle: (val: string) => void;
  lists: ReusableList[];
  categories: FirewallContentCategory[];
  httpResponses: { label: string; value: string }[];
  dlpFileTypes: Record<string, { name: string; category: string; type: string }>;
}) {
  const isMulti = operator === 'in' || operator === 'not in';
  const isListOp = operator === 'in list' || operator === 'not in list';
  const selectedIds = value.split(/[, ]+/).filter(Boolean);

  // ── List-based operators ──────────────────────────────────────────────────
  if (isListOp) {
    return (
      <Select value={value} onValueChange={(val: string | null) => onChange(val ?? '')}>
        <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 text-blue-400">
          {lists.find(l => l.id === value)?.name || value || 'Select list...'}
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            {lists
              .filter(l => {
                const listType = getListTypeForField(fieldDef.wf_string);
                return !listType || l.type === listType;
              })
              .map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  }

  // ── Security Categories ───────────────────────────────────────────────────
  if (fieldDef.ui_string === 'Security Categories') {
    return (
      <CategoryPicker
        categories={categories.filter(c => c.class === 'Security threats')}
        selectedIds={selectedIds}
        onToggle={onToggle}
        placeholder="Select security categories..."
      />
    );
  }

  // ── Content Categories (grouped by class) ─────────────────────────────────
  if (fieldDef.ui_string === 'Content Categories') {
    return (
      <CategoryPicker
        categories={categories}
        selectedIds={selectedIds}
        onToggle={onToggle}
        grouped={true}
        placeholder="Select content categories..."
      />
    );
  }

  // ── HTTP Response codes ───────────────────────────────────────────────────
  if (fieldDef.ui_string === 'HTTP Response') {
    if (httpResponses.length > 0) {
      if (isMulti) {
        return (
          <KeyValueMultiPicker
            options={httpResponses}
            selectedIds={selectedIds}
            onToggle={onToggle}
            placeholder="Select HTTP responses..."
          />
        );
      }
      // Single select (==, !=)
      const selectedLabel = httpResponses.find(r => r.value === value)?.label;
      return (
        <Select value={value} onValueChange={(val: string | null) => onChange(val ?? '')}>
          <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 text-slate-200">
            {selectedLabel || value || 'Select HTTP response...'}
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              {httpResponses.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      );
    }
  }

  // ── Upload / Download File Types (DLP) ────────────────────────────────────
  if (fieldDef.ui_string === 'Upload File Types' || fieldDef.ui_string === 'Download File Types') {
    if (Object.keys(dlpFileTypes).length > 0) {
      if (isMulti) {
        return (
          <GroupedFilePicker
            fileTypes={dlpFileTypes}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        );
      }
      // Single select (==, !=) — flat select from file type names
      const optionsArray = Object.entries(dlpFileTypes).map(([ext, d]) => ({ ext, ...d }));
      return (
        <Select value={value} onValueChange={(val: string | null) => onChange(val ?? '')}>
          <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 text-slate-200">
            {optionsArray.find(o => o.ext === value)?.name || value || 'Select file type...'}
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              {optionsArray.map(o => (
                <SelectItem key={o.ext} value={o.ext}>{o.name || o.ext}</SelectItem>
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      );
    }
  }

  // ── Static `values` array (Protocol, HTTP Method, Detected Protocol, etc.) ─
  if (fieldDef.values && fieldDef.values.length > 0) {
    if (isMulti) {
      return (
        <GenericMultiPicker
          options={fieldDef.values}
          selectedIds={selectedIds}
          onToggle={onToggle}
          placeholder={`Select ${fieldDef.ui_string.toLowerCase()}...`}
        />
      );
    }
    // Single / dropdown
    return (
      <Select value={value} onValueChange={(val: string | null) => onChange(val ?? '')}>
        <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 text-slate-200">
          {value || `Select ${fieldDef.ui_string.toLowerCase()}...`}
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            {fieldDef.values.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </SelectPortal>
      </Select>
    );
  }

  // ── Default: free text input ──────────────────────────────────────────────
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-glass w-full h-11"
      placeholder={isMulti ? 'Value 1, Value 2' : 'Enter value...'}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CreateFirewallPolicyPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<FirewallContentCategory[]>([]);
  const [lists, setLists] = useState<ReusableList[]>([]);
  const [httpResponses, setHttpResponses] = useState<{ label: string; value: string }[]>([]);
  const [dlpFileTypes, setDlpFileTypes] = useState<Record<string, { name: string; category: string; type: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'DNS' | 'NETWORK' | 'HTTP'>('DNS');
  const [action, setAction] = useState('BLOCK');

  // Logical Building State
  const [trafficBlocks, setTrafficBlocks] = useState<WirefilterBlock[]>([]);
  const [identityBlocks, setIdentityBlocks] = useState<WirefilterBlock[]>([]);

  // Traffic type change warning state
  const [pendingType, setPendingType] = useState<'DNS' | 'NETWORK' | 'HTTP' | null>(null);

  // Derived filtered data
  const trafficSelectors = useMemo(() => getSelectors(type, 'traffic'), [type]);
  const identitySelectors = useMemo(() => getSelectors(type, 'identity'), [type]);
  const availableActions = useMemo(() => getActionsForLayer(type), [type]);

  // Rule Settings
  const [blockPageEnabled, setBlockPageEnabled] = useState(false);
  const [blockPageURI, setBlockPageURI] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catsRes, listsRes, uiOptionsRes, fileTypesRes] = await Promise.all([
          getFirewallCategories(),
          getGatewayLists(),
          getGatewayUiOptions(),
          getDlpFileTypes()
        ]);
        setCategories(catsRes.data?.result || []);
        setLists(listsRes.data?.result || []);
        setHttpResponses(uiOptionsRes.data?.result?.http_responses || []);
        setDlpFileTypes(fileTypesRes.data?.result?.filetypes || {});
      } catch (err) {
        console.error('Failed to fetch builder data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Apply pending traffic type change — clears all blocks
  const applyTypeChange = (newType: 'DNS' | 'NETWORK' | 'HTTP') => {
    setType(newType);
    setTrafficBlocks([]);
    setIdentityBlocks([]);
    setPendingType(null);
  };

  // Request type change — shows warning if conditions exist
  const requestTypeChange = (newType: 'DNS' | 'NETWORK' | 'HTTP') => {
    if (newType === type) return;
    const hasConditions = trafficBlocks.length > 0 || identityBlocks.length > 0;
    if (hasConditions) {
      setPendingType(newType);
    } else {
      applyTypeChange(newType);
    }
  };

  const addCondition = (blockIdx: number) => {
    const newBlocks = [...trafficBlocks];
    const selectors = getSelectors(type, 'traffic');
    const defaultField = selectors[0]?.wf_string || '';
    const operators = getOperatorsForField(defaultField);
    const defaultOp = operators[0]?.ui_string || '==';
    newBlocks[blockIdx].conditions.push({ field: defaultField, operator: defaultOp, value: '' });
    setTrafficBlocks(newBlocks);
  };

  const removeCondition = (blockIdx: number, condIdx: number) => {
    const newBlocks = [...trafficBlocks];
    newBlocks[blockIdx].conditions.splice(condIdx, 1);
    if (newBlocks[blockIdx].conditions.length === 0) {
      newBlocks.splice(blockIdx, 1);
    }
    setTrafficBlocks(newBlocks);
  };

  const addBlock = () => {
    const selectors = getSelectors(type, 'traffic');
    const defaultField = selectors[0]?.wf_string || '';
    const operators = getOperatorsForField(defaultField);
    const defaultOp = operators[0]?.ui_string || '==';
    setTrafficBlocks([...trafficBlocks, { logic: 'OR', conditions: [{ field: defaultField, operator: defaultOp, value: '' }] }]);
  };

  // Identity condition helpers
  const addIdentityCondition = () => {
    const idSelectors = getSelectors(type, 'identity');
    const defaultField = idSelectors[0]?.wf_string || '';
    const operators = getOperatorsForField(defaultField);
    const defaultOp = operators[0]?.ui_string || '==';
    if (identityBlocks.length === 0) {
      setIdentityBlocks([{ logic: 'OR', conditions: [{ field: defaultField, operator: defaultOp, value: '' }] }]);
    } else {
      const newBlocks = [...identityBlocks];
      newBlocks[0].conditions.push({ field: defaultField, operator: defaultOp, value: '' });
      setIdentityBlocks(newBlocks);
    }
  };

  const removeIdentityCondition = (condIdx: number) => {
    const newBlocks = [...identityBlocks];
    newBlocks[0].conditions.splice(condIdx, 1);
    if (newBlocks[0].conditions.length === 0) {
      setIdentityBlocks([]);
    } else {
      setIdentityBlocks(newBlocks);
    }
  };

  const updateCondition = (blockIdx: number, condIdx: number, updates: any) => {
    const newBlocks = [...trafficBlocks];
    const current = newBlocks[blockIdx].conditions[condIdx];
    const merged = { ...current, ...updates };

    // Side effect: if field changed, ensure operator is valid
    if (updates.field) {
      const allowedOps = getOperatorsForField(updates.field);
      if (!allowedOps.find(op => op.ui_string === merged.operator)) {
        merged.operator = allowedOps[0]?.ui_string || '==';
      }
      merged.value = '';
    }

    // Side effect: if operator changed, reset value
    if (updates.operator && updates.operator !== current.operator) {
      merged.value = '';
    }

    newBlocks[blockIdx].conditions[condIdx] = merged;
    setTrafficBlocks(newBlocks);
  };

  const handleSubmit = async () => {
    if (!name) {
      setError('Please provide a policy name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const trafficExpr = stringifyWirefilter(trafficBlocks);
    const identityExpr = stringifyWirefilter(identityBlocks.filter(b => b.conditions.some(c => c.value)));

    const payload: Partial<FirewallPolicy> = {
      name,
      description,
      type,
      action,
      traffic: trafficExpr,
      identity: identityExpr,
      enabled: true,
      rule_settings: {
        block_page_enabled: blockPageEnabled,
        block_page: blockPageEnabled ? { target_uri: blockPageURI } : undefined,
        notification_settings: { enabled: notificationsEnabled }
      }
    };

    try {
      const res = await createFirewallPolicy(payload);
      if (res.data.success) {
        router.push('/firewall');
      } else {
        setError(res.data.message || 'Failed to create policy');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'A sync error occurred with Cloudflare');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (blockIdx: number, condIdx: number, catId: string) => {
    const cond = trafficBlocks[blockIdx].conditions[condIdx];
    const currentIds = cond.value.split(/[, ]+/).filter(Boolean);
    const newIds = currentIds.includes(catId)
      ? currentIds.filter(id => id !== catId)
      : [...currentIds, catId];
    updateCondition(blockIdx, condIdx, { value: newIds.join(' ') });
  };

  if (loading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#f38020] border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm animate-pulse tracking-widest uppercase font-bold">Initializing Policy Builder</p>
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
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Create Gateway Policy</h1>
            <p className="text-slate-400 text-lg font-medium max-w-2xl">
              Configure unified security rules across your organization&apos;s traffic layers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20">
        {/* Left Column: Scope (Conditions) */}
        <div className="lg:col-span-8 space-y-12 animate-in slide-in-from-left-4 duration-700">
          {/* Basic Info */}
          <section className="glass-panel p-8 border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Info className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Policy Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policy Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-glass text-white h-12"
                  placeholder="e.g., Global Malware Block"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-glass h-12"
                  placeholder="Optional context for other admins"
                />
              </div>
            </div>
          </section>

          {/* Scope Builder */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f38020]/10 flex items-center justify-center border border-[#f38020]/20">
                <span className="text-xs font-black text-[#f38020]">IF</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Conditions (Scope)</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
            </div>

            {/* Traffic Type Selector */}
            <div className="glass-panel p-8 border-white/10">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">If traffic type is...</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'DNS', icon: Globe, label: 'DNS', color: 'text-blue-400' },
                  { id: 'NETWORK', icon: Activity, label: 'Network', color: 'text-orange-400' },
                  { id: 'HTTP', icon: Shield, label: 'HTTP', color: 'text-purple-400' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => requestTypeChange(item.id as any)}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all group ${type === item.id
                        ? 'bg-white/10 border-[#f38020] shadow-[0_0_20px_rgba(243,128,32,0.1)]'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                  >
                    <item.icon className={`w-5 h-5 ${type === item.id ? item.color : 'text-slate-500'}`} />
                    <span className={`font-bold ${type === item.id ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Inline warning when a type change is pending */}
              {pendingType && (
                <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-300">Switch traffic type?</p>
                      <p className="text-[11px] text-amber-400/80 mt-1 leading-relaxed">
                        Switching to <span className="font-black">{pendingType}</span> will clear all
                        existing traffic and identity conditions — this cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      onClick={() => setPendingType(null)}
                      className="px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Keep current
                    </button>
                    <button
                      onClick={() => applyTypeChange(pendingType)}
                      className="px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-400 transition-colors"
                    >
                      Yes, switch &amp; clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Traffic Logic Blocks */}
            <div className="space-y-6 relative z-30">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-2">And traffic matches...</label>

              {trafficBlocks.map((block, bIdx) => (
                <div key={bIdx} className="relative">
                  {bIdx > 0 && (
                    <div className="flex items-center justify-center py-4 relative group">
                      <div className="absolute left-0 right-0 h-px bg-white/5" />
                      <div className="relative z-10 px-4 py-1 rounded-lg bg-blue-600 border border-blue-400 shadow-xl text-[10px] font-black text-white uppercase tracking-widest">
                        OR
                      </div>
                    </div>
                  )}

                  <div className="glass-panel p-6 border-white/10 space-y-4">
                    {block.conditions.map((cond, cIdx) => {
                      const fieldDef = trafficSelectors.find(f => f.wf_string === cond.field);
                      return (
                        <div key={cIdx} className="flex gap-4 items-end">
                          {/* Selector */}
                          <div className="w-1/3">
                            {cIdx === 0 && <label className="block mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Selector</label>}
                            <Select value={cond.field} onValueChange={(val) => updateCondition(bIdx, cIdx, { field: val })}
                            >
                              <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 hover:border-white/10">
                                <span className="text-sm text-slate-200">
                                  {trafficSelectors.find(f => f.wf_string === cond.field)?.ui_string || cond.field}
                                </span>
                              </SelectTrigger>
                              <SelectPortal>
                                <SelectContent>
                                  {trafficSelectors.map(f => (
                                    <SelectItem key={f.wf_string} value={f.wf_string}>{f.ui_string}</SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectPortal>
                            </Select>
                          </div>

                          {/* Operator */}
                          <div className="w-40">
                            {cIdx === 0 && <label className="block mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Operator</label>}
                            <Select
                              value={cond.operator}
                              onValueChange={(val) => updateCondition(bIdx, cIdx, { operator: val })}
                            >
                              <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 hover:border-white/10">
                                <span className="text-sm text-emerald-400 font-mono">
                                  {OPERATORS.find(op => op.id === cond.operator)?.label || cond.operator}
                                </span>
                              </SelectTrigger>
                              <SelectPortal>
                                <SelectContent>
                                  {getOperatorsForField(cond.field).map(op => (
                                    <SelectItem key={op.ui_string} value={op.ui_string}>
                                      {OPERATORS.find(o => o.id === op.ui_string)?.label || op.ui_string}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectPortal>
                            </Select>
                          </div>

                          {/* Value */}
                          <div className="flex-1">
                            {cIdx === 0 && <label className="block mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Value</label>}
                            {fieldDef ? (
                              <ValueInput
                                fieldDef={fieldDef}
                                operator={cond.operator}
                                value={cond.value}
                                onChange={(val) => updateCondition(bIdx, cIdx, { value: val })}
                                onToggle={(catId) => toggleCategory(bIdx, cIdx, catId)}
                                lists={lists}
                                categories={categories}
                                httpResponses={httpResponses}
                                dlpFileTypes={dlpFileTypes}
                              />
                            ) : (
                              <input
                                type="text"
                                value={cond.value}
                                onChange={(e) => updateCondition(bIdx, cIdx, { value: e.target.value })}
                                className="input-glass w-full h-11"
                                placeholder="Enter value..."
                              />
                            )}
                          </div>

                          <button
                            onClick={() => removeCondition(bIdx, cIdx)}
                            className="w-11 h-11 rounded-xl shrink-0 bg-white/5 border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 text-slate-500 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => addCondition(bIdx)}
                      className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest pl-2 pt-2 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      And Condition
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addBlock}
                className="w-full p-4 rounded-3xl border-2 border-dashed border-white/5 hover:border-[#f38020]/30 hover:bg-[#f38020]/5 transition-all group"
              >
                <div className="flex items-center justify-center gap-2 text-slate-500 group-hover:text-[#f38020] transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Add OR Block</span>
                </div>
              </button>
            </div>

            {/* Identity Scope — optional */}
            <div className="space-y-4 relative z-20">
              <div className="flex items-center justify-between pl-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  And identity matches...
                  <span className="ml-2 normal-case font-normal text-slate-600">(optional)</span>
                </label>
                {identityBlocks.length === 0 && identitySelectors.length > 0 && (
                  <button
                    onClick={addIdentityCondition}
                    className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Condition
                  </button>
                )}
              </div>

              {identityBlocks.length === 0 ? (
                identitySelectors.length > 0 ? (
                  <div
                    onClick={addIdentityCondition}
                    className="glass-panel p-6 border-dashed border-blue-500/10 cursor-pointer hover:border-blue-500/20 hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
                      <Users className="w-7 h-7 text-slate-700 group-hover:text-blue-500/40 transition-colors" />
                      <p className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors">
                        No identity conditions — click to add one
                      </p>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="glass-panel p-6 border-blue-500/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-focus-within:opacity-20 transition-opacity pointer-events-none">
                    <Users className="w-16 h-16 text-blue-400" />
                  </div>

                  <div className="space-y-4 relative z-10">
                    {identityBlocks[0].conditions.map((cond, cIdx) => {
                      const fieldDef = identitySelectors.find(f => f.wf_string === cond.field);

                      const updateIdCondition = (val: string) => {
                        const newBlocks = [...identityBlocks];
                        newBlocks[0].conditions[cIdx].value = val;
                        setIdentityBlocks(newBlocks);
                      };

                      const toggleIdCondition = (val: string) => {
                        const currentIds = cond.value.split(/[, ]+/).filter(Boolean);
                        const newIds = currentIds.includes(val) ? currentIds.filter(v => v !== val) : [...currentIds, val];
                        updateIdCondition(newIds.join(' '));
                      };

                      return (
                        <div key={cIdx} className="flex gap-3 items-end">
                          <div className="w-1/3">
                            <Select
                              value={cond.field}
                              onValueChange={(val) => {
                                const newBlocks = [...identityBlocks];
                                newBlocks[0].conditions[cIdx].field = val || '';
                                newBlocks[0].conditions[cIdx].value = '';
                                const operators = getOperatorsForField(val || '');
                                newBlocks[0].conditions[cIdx].operator = operators[0]?.ui_string || '==';
                                setIdentityBlocks(newBlocks);
                              }}
                            >
                              <SelectTrigger className="w-full h-11 bg-black/40 border-white/5">
                                <span className="text-sm text-slate-200">
                                  {identitySelectors.find(f => f.wf_string === cond.field)?.ui_string || cond.field}
                                </span>
                              </SelectTrigger>
                              <SelectPortal>
                                <SelectContent>
                                  {identitySelectors.map(f => (
                                    <SelectItem key={f.wf_string} value={f.wf_string}>{f.ui_string}</SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectPortal>
                            </Select>
                          </div>
                          <div className="w-32">
                            <Select
                              value={cond.operator}
                              onValueChange={(val) => {
                                const newBlocks = [...identityBlocks];
                                newBlocks[0].conditions[cIdx].operator = val || '';
                                newBlocks[0].conditions[cIdx].value = '';
                                setIdentityBlocks(newBlocks);
                              }}
                            >
                              <SelectTrigger className="w-full h-11 bg-black/40 border-white/5">
                                <span className="text-sm text-blue-400">
                                  {OPERATORS.find((op) => op.id === cond.operator)?.label || cond.operator}
                                </span>
                              </SelectTrigger>
                              <SelectPortal>
                                <SelectContent>
                                  {getOperatorsForField(cond.field).map(op => (
                                    <SelectItem key={op.ui_string} value={op.ui_string}>
                                      {OPERATORS.find(o => o.id === op.ui_string)?.label || op.ui_string}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectPortal>
                            </Select>
                          </div>
                          <div className="flex-1">
                            {fieldDef ? (
                              <ValueInput
                                fieldDef={fieldDef}
                                operator={cond.operator}
                                value={cond.value}
                                onChange={updateIdCondition}
                                onToggle={toggleIdCondition}
                                lists={lists}
                                categories={categories}
                                httpResponses={httpResponses}
                                dlpFileTypes={dlpFileTypes}
                              />
                            ) : (
                              <input
                                type="text"
                                value={cond.value}
                                onChange={(e) => updateIdCondition(e.target.value)}
                                className="input-glass w-full h-11"
                                placeholder="e.g. admin@org.com"
                              />
                            )}
                          </div>
                          <button
                            onClick={() => removeIdentityCondition(cIdx)}
                            className="w-11 h-11 rounded-xl shrink-0 bg-white/5 border border-white/5 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 text-slate-500 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={addIdentityCondition}
                    className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest pt-4 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    And Condition
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Actions & Settings */}
        <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-right-4 duration-700 sticky top-24">
          <section>
            <div className="flex items-center gap-3 mb-6 text-emerald-400">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ArrowRight className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Actions &amp; Settings</h3>
            </div>

            <div className="glass-panel p-8 border-emerald-500/10 space-y-8">
              {/* Action Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block pl-1">Primary Enforcement</label>
                <div className="space-y-2">
                  <Select
                    value={action.toUpperCase()}
                    onValueChange={(val) => setAction(val || '')}
                  >
                    <SelectTrigger className="w-full h-14 bg-black/40 border-white/5 hover:border-[#f38020]/30 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-[#f38020]" />
                        <span className="font-black uppercase tracking-widest text-sm text-white">
                          {availableActions.find(a => a.wf_string.toUpperCase() === action.toUpperCase())?.ui_string || action}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectContent>
                        {availableActions.map(a => (
                          <SelectItem key={a.wf_string} value={a.wf_string.toUpperCase()}>
                            {a.ui_string}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </div>
              </div>

              {/* Enhanced Settings */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Logic Enhancements</h4>

                <div className="space-y-5">
                  {/* Block Page Toggle */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-white">Custom Block Page</span>
                          <button
                            onClick={() => setBlockPageEnabled(!blockPageEnabled)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${blockPageEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${blockPageEnabled ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">Redirect users to a tailored restricted page when blocked.</p>
                      </div>
                    </div>

                    {blockPageEnabled && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <input
                          type="text"
                          value={blockPageURI}
                          onChange={(e) => setBlockPageURI(e.target.value)}
                          className="input-glass text-xs h-10 border-emerald-500/20"
                          placeholder="https://your-org.com/blocked"
                        />
                      </div>
                    )}
                  </div>

                  {/* Notification Toggle */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-white">One Client Alerts</span>
                        <button
                          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notificationsEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed italic">Notify users via the Cloudflare One Client app.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="pt-8 space-y-3">
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-400 leading-relaxed">{error}</p>
                  </div>
                )}
                <button
                  disabled={submitting || !name}
                  onClick={handleSubmit}
                  className="btn-orange w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(243,128,32,0.2)] disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                      <span>Deploying...</span>
                    </div>
                  ) : 'Deploy Gateway Policy'}
                </button>
                <button
                  onClick={() => router.push('/firewall')}
                  className="w-full h-12 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  Cancel Creation
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
