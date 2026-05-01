import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { APP_PATHS } from '../config';
import DynamicReferenceSelect from './DynamicReferenceSelect';
import { skuApi, uploadApi, refApi } from '../api';
import { Button } from '@/components/ui/button';
import { cn, getDirectImageUrl } from '@/lib/utils';
import BloomAIConsole from './BloomAIConsole';
import {
  X, Save, UploadCloud, RefreshCw, Trash2, Link, ArrowLeft, Search,
  Package, Tag, FileText, BarChart2, Layers, Info, StickyNote,
  AlertCircle, FolderPlus, ExternalLink, BookmarkCheck, Check, Copy,
  Zap, Users, Compass, PlusCircle, Bookmark, RotateCcw, Globe, Settings, Store, Sparkles
} from 'lucide-react';



// ─── Auto-resizing textarea ───────────────────────────────────────
function AutoTextarea({ name, value, onChange, placeholder, rows = 2, className, isImproved }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      // Limit to scrollHeight but constrained by CSS maxHeight if set
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <div className={cn("relative group/textarea transition-all")}>
      <textarea
        ref={ref}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm transition-all leading-relaxed custom-scrollbar outline-none",
          isImproved
            ? "bg-transparent border-indigo-400/30 text-slate-800 focus:border-indigo-500/50"
            : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent",
          className
        )}
        style={{ maxHeight: '200px', overflowY: 'auto' }}
      />
    </div>
  );
}

// ─── Image uploader with URL support ──────────────────────────────
function ImageBlock({ value, onChange, onStatus, catalogUrl }) {
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const fileRef = useRef(null);
  const [tempUrl, setTempUrl] = useState(value || '');

  useEffect(() => {
    setTempUrl(value || '');
  }, [value]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      onChange(res.url);
      setShowOptions(false);
    } catch {
      onStatus?.('Upload failed. Try again.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFetchFromCatalog = async () => {
    if (!catalogUrl) {
      onStatus?.('No Catalog URL provided in Content tab.', 'error');
      return;
    }
    setFetching(true);
    try {
      const res = await skuApi.getFirstDriveImage(catalogUrl);
      if (res.image_url) {
        onChange(getDirectImageUrl(res.image_url));
        onStatus?.('Successfully fetched image from Catalog URL.', 'success');
        setShowOptions(false);
      } else {
        onStatus?.('No images found in the Catalog URL folder.', 'error');
      }
    } catch (err) {
      onStatus?.(err.response?.data?.detail || 'Failed to fetch image.', 'error');
    } finally {
      setFetching(false);
    }
  };

  const applyUrl = () => {
    if (!tempUrl.trim()) return;
    const resolved = getDirectImageUrl(tempUrl.trim());
    onChange(resolved);
    setShowOptions(false);
  };

  const handleUrlBlur = () => {
    if (tempUrl.trim() && tempUrl.trim() !== value) {
      applyUrl();
    }
  };

  const isAddingOrReplacing = !value || showOptions;

  return (
    <div className="mb-6">
      <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFile} />

      <div className="relative group rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]/10 transition-all hover:bg-[var(--color-muted)]/20 min-h-[120px] flex flex-col">
        {!isAddingOrReplacing ? (
          <div className="relative h-48 bg-[var(--color-card)] flex items-center justify-center p-4">
            <img
              src={value}
              alt="Product Preview"
              className="max-w-full max-h-full object-contain drop-shadow-sm rounded-lg"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback if image fails to load */}
            <div className="hidden absolute inset-0 flex flex-col items-center justify-center text-red-500/80 gap-2">
              <AlertCircle size={24} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Invalid Image URL</span>
            </div>

            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={() => setShowOptions(true)}
                className="flex items-center gap-2 bg-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                <RefreshCw size={14} /> Replace Options
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="flex items-center gap-2 bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition-all active:scale-95 shadow-sm"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 animate-[fade-in_0.2s_ease]">
             {value && (
               <button
                 type="button"
                 onClick={() => setShowOptions(false)}
                 className="absolute top-4 left-4 p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)] transition-colors shadow-sm bg-[var(--color-card)]/50 border border-[var(--color-border)]"
                 title="Back to Preview"
               >
                 <ArrowLeft size={14} />
               </button>
             )}

              <div
                className={cn(
                  "w-full md:w-1/3 aspect-square max-w-[140px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/10 cursor-not-allowed opacity-50 grayscale transition-all relative overflow-hidden group/disabled"
                )}
              >
                  <UploadCloud size={32} className="text-[var(--color-muted-foreground)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Upload</span>
                  {/* Status Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/20 backdrop-blur-[1px]">
                    <span className="bg-[var(--color-card)] text-[var(--color-foreground)] text-[8px] font-black px-2 py-0.5 rounded shadow-sm border border-[var(--color-border)] uppercase tracking-tighter">Disabled</span>
                  </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                 <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--color-foreground)]">Google Drive Image URL</span>
                        <button
                          type="button"
                          onClick={handleFetchFromCatalog}
                          disabled={fetching || !catalogUrl}
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            catalogUrl ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" : "text-slate-400 bg-slate-100"
                          )}
                          title={!catalogUrl ? "Please provide a Catalog URL in Content tab first" : "Fetch first image from Catalog URL"}
                        >
                          {fetching ? <RefreshCw size={10} className="animate-spin" /> : <Store size={10} />}
                          Sync from Catalog
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-tight bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">Cloud Active</span>
                    </div>
                    <div className="relative group/input">
                       <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-muted-foreground)] group-focus-within/input:text-[var(--color-primary)] transition-colors">
                         <Link size={14} />
                       </div>
                       <input
                         type="url"
                         value={tempUrl}
                         onChange={(e) => setTempUrl(e.target.value)}
                         onBlur={handleUrlBlur}
                         onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyUrl())}
                         placeholder="Paste Google Drive image link here..."
                         className="w-full h-11 pl-10 pr-4 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-muted-foreground)]/40 shadow-sm"
                       />
                    </div>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] leading-relaxed italic opacity-70">
                      Paste your Google Drive link above. We'll automatically convert it into a direct stream.
                      <span className="text-[var(--color-primary)] font-bold ml-1">Note: Ensure the file is shared as "Anyone with the link".</span>
                    </p>
                 </div>
              </div>
           </div>
        )}
        {uploading && (
           <div className="absolute inset-0 bg-[var(--color-card)]/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="flex items-center gap-3 bg-[var(--color-card)] px-5 py-2.5 rounded-full shadow-lg border border-[var(--color-border)]">
                 <span className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                 <span className="text-xs font-bold text-[var(--color-foreground)] tracking-tight">Optimizing Image…</span>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

function Field({ id, label, required, children, hint, error, aiWarning, isImproved, onAccept, onDiscard, onRegenerate }) {
  const [showAIContext, setShowAIContext] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowAIContext(true), 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowAIContext(false), 500);
  };

  const score = aiWarning ? (typeof aiWarning === 'object' ? aiWarning.confidence_score : (parseInt(aiWarning.match(/\d+/)?.[0]) || 0)) : 0;
  const scoreColor = score >= 80 ? "text-emerald-500 bg-emerald-50 border-emerald-100" : (score < 50 ? "text-rose-500 bg-rose-50 border-rose-100" : "text-amber-500 bg-amber-50 border-amber-100");

  const hasVariants = aiWarning?.variants && aiWarning.variants.length > 0;

  return (
    <div className={cn("flex flex-col gap-1 transition-all duration-500", isImproved && "p-3 rounded-2xl bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-sm animate-bloom-pulse")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className={cn("text-xs font-medium", isImproved ? "text-indigo-700 font-bold" : "text-[var(--color-foreground)]")}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          
          <div className="flex items-center gap-1">
            {aiWarning && (
              <button 
                type="button"
                onClick={() => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  setShowAIContext(!showAIContext);
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-black transition-all hover:scale-105 active:scale-95 cursor-help",
                  showAIContext ? "ring-2 ring-indigo-500/20 border-indigo-300 bg-indigo-50 text-indigo-600" : scoreColor
                )}
              >
                <Zap size={8} fill="currentColor" />
                {score}% Trust
              </button>
            )}

            {hasVariants && (
              <button 
                type="button"
                onClick={() => setShowVariants(!showVariants)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black transition-all hover:scale-105 active:scale-95 shadow-sm",
                  showVariants ? "bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500/20" : "bg-white text-indigo-600 border-indigo-100 hover:border-indigo-300"
                )}
              >
                <Sparkles size={8} fill={showVariants ? "white" : "currentColor"} />
                {showVariants ? "Hide Options" : `${aiWarning.variants.length} Style Variations`}
              </button>
            )}
          </div>
        </div>

        {isImproved && (
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 animate-in zoom-in-50 duration-300 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600/50 rounded-l-full border-r border-indigo-400/30">
              <span className="text-[7px] font-black uppercase tracking-widest">AI improved</span>
            </div>
            <div className="flex items-center">
              <button type="button" onClick={() => onRegenerate?.(id)} className="p-1 px-1.5 hover:bg-white/20 transition-colors border-none text-white flex items-center justify-center" title="Regenerate"><RefreshCw size={10} /></button>
              <button type="button" onClick={() => onDiscard?.(id)} className="p-1 px-1.5 hover:bg-rose-500 transition-colors border-none text-white flex items-center justify-center border-l border-indigo-400/30" title="Discard"><RotateCcw size={10} /></button>
              <button type="button" onClick={() => onAccept?.(id)} className="p-1 px-2 hover:bg-indigo-400 transition-colors border-none text-white flex items-center justify-center border-l border-indigo-400/30" title="Accept"><Check size={10} strokeWidth={4} /></button>
            </div>
          </div>
        )}
      </div>

      {children}

      {/* AI TRUST PANEL (Hover/Click Context) */}
      {aiWarning && showAIContext && (
        <div className={cn(
          "mt-1.5 p-3 rounded-xl border animate-in slide-in-from-top-1 duration-200 pointer-events-none",
          score >= 80 ? "bg-emerald-50/80 border-emerald-100 text-emerald-900" : (score < 50 ? "bg-rose-50/80 border-rose-100 text-rose-900" : "bg-amber-50/80 border-amber-100 text-amber-900")
        )}>
           <div className="flex items-center gap-2">
             <AlertCircle size={12} className="opacity-50" />
             <p className="text-[11px] leading-relaxed font-semibold">
               {typeof aiWarning === 'object' 
                 ? (aiWarning.warning || `Generated with ${aiWarning.confidence_level} confidence based on ${aiWarning.basis.replace(/_/g, ' ')}.`)
                 : aiWarning}
             </p>
           </div>
        </div>
      )}

      {/* INDEPENDENT VARIANT SELECTOR */}
      {hasVariants && showVariants && (
        <div className="mt-2 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-inner animate-in zoom-in-95 duration-200">
           <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">AI Generated Title Strategies</p>
           <div className="grid grid-cols-1 gap-1.5">
             {aiWarning.variants.map((variant, idx) => {
               const isSelected = variant === children.props.value;
               const strategies = ['SEO Optimized', 'Benefit Focused', 'Premium Tone', 'Feature Focused', 'Target Audience'];
               const strategy = strategies[idx] || 'Alternate';
               
               return (
                 <button
                   key={idx}
                   type="button"
                   onClick={() => {
                     const event = { target: { name: id, value: variant } };
                     children.props.onChange?.(event);
                   }}
                   className={cn(
                     "text-left px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all border relative overflow-hidden group/var",
                     isSelected 
                       ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.01] z-10" 
                       : "bg-white/80 text-indigo-900 border-indigo-100 hover:bg-white hover:border-indigo-300 hover:shadow-sm"
                   )}
                 >
                   <div className="flex items-center justify-between mb-0.5">
                     <span className={cn("text-[8px] font-black uppercase tracking-tighter opacity-50", isSelected ? "text-indigo-200" : "text-indigo-500")}>
                       {strategy}
                     </span>
                     {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                   </div>
                   <div className="line-clamp-2 leading-tight pr-4">
                     {variant}
                   </div>
                 </button>
               );
             })}
           </div>
        </div>
      )}

      {hint && !error && <span className="text-[11px] text-[var(--color-muted-foreground)]">{hint}</span>}
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

function FieldRow({ children, cols = 2 }) {
  return (
    <div className={cn("grid gap-4", cols === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'identity',       label: 'Identity',        icon: Package },
  { id: 'content',        label: 'Content',         icon: FileText },
  { id: 'classification', label: 'Classify',         icon: Tag },
  { id: 'pricing',        label: 'Pricing & Specs',  icon: BarChart2 },
  { id: 'bundling',       label: 'Product & Bundle', icon: Layers },
  { id: 'tax',            label: 'Tax & Compliance', icon: Info },
  { id: 'platforms',      label: 'Channels',         icon: ExternalLink },
  { id: 'components',     label: 'Shared Pools',     icon: BookmarkCheck },
];


const TAB_FIELDS = {
  identity:       ['product_name', 'sku_code', 'brand_reference_id', 'product_component_group_code', 'primary_image_url'],
  content:        ['description', 'key_feature', 'key_ingredients', 'ingredients', 'how_to_use', 'product_care', 'caution', 'seo_keywords', 'catalog_url'],
  classification: ['category_reference_id', 'sub_category_reference_id', 'status_reference_id', 'product_type'],
  pricing:        ['mrp', 'purchase_cost', 'net_quantity', 'net_quantity_unit_reference_id', 'size_reference_id', 'color', 'raw_product_size', 'package_size', 'package_weight', 'raw_product_weight', 'finished_product_weight'],
  bundling:       ['bundle_type', 'pack_type'],
  tax:            ['tax_rule_code', 'tax_percent'],
  platforms:      ['platform_identifiers'],
  components:     ['product_component_group_code'],
};


function getTabsWithErrors(errors) {
  const errorFields = new Set(Object.keys(errors).filter(k => errors[k]));
  const tabs = new Set();
  for (const [tabId, fields] of Object.entries(TAB_FIELDS)) {
    if (fields.some(f => errorFields.has(f))) tabs.add(tabId);
  }
  return tabs;
}

// ─── Empty form state ─────────────────────────────────────────────
const EMPTY = {
  product_name: '', sku_code: '', barcode: '', product_component_group_code: [],
  remark: '', primary_image_url: '', brand_reference_id: null,
  description: '', key_feature: '', caution: '', product_care: '', how_to_use: '',
  ingredients: '', key_ingredients: '', seo_keywords: '', catalog_url: '',
  category_reference_id: null, sub_category_reference_id: null, status_reference_id: null,
  mrp: '', purchase_cost: '', color: '', raw_product_size: '', package_size: '',
  package_weight: '', raw_product_weight: '', finished_product_weight: '',
  net_quantity: '', net_quantity_unit_reference_id: null, size_reference_id: null,
  bundle_type: null, pack_type: null,
  tax_rule_code: '', tax_percent: '',
  platform_identifiers: [],
};

// ─── Shared input className ───────────────────────────────────────
const inputCls = (hasError) => cn(
  "w-full rounded-lg border bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent transition-all",
  hasError ? "border-red-400 focus:ring-red-400/30" : "border-[var(--color-border)]"
);

const sanitizeFolderName = (name) => {
  if (name == null) return "";
  // Ensure we're working with a string to avoid .trim() crashes on numbers
  return String(name).trim().toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
};

// Safely parse the component group mapping from string/null into an array of {type, id}
const parsePoolMapping = (val) => {
  if (!val) return [];
  let parsed = val;
  if (typeof val === 'string') {
    try {
      parsed = JSON.parse(val);
    } catch (e) {
      console.warn("Failed to parse pool mapping:", e);
      return [];
    }
  }

  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) {
    // Lazy migration from old object format
    return Object.entries(parsed).map(([type, id]) => ({ type, id }));
  }
  return [];
};

// ─── Persistence Helpers ──────────────────────────────────────────
const getDraftKey = (id) => id ? `bloomerce_sku_edit_draft_${id}` : `bloomerce_sku_add_draft`;

// ─── Main Form ────────────────────────────────────────────────────
export default function SkuMasterForm({ initialData, statusOptions, references, refLists, onClose, onSaved, onSwitchProduct, initialTab }) {
  const isEdit = Boolean(initialData?.id);
  const [statusMessage, setStatusMessage] = useState(null); // { text: string, type: 'success' | 'error' }
  const [pendingAction, setPendingAction] = useState(null); // { type: string, payload?: any }
  const statusTimeoutRef = useRef(null);

  const showStatus = (text, type = 'success') => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    setStatusMessage({ text, type });
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 4000);
  };

  const normalizeInitialData = useCallback((data) => {
    const merged = { ...EMPTY };
    if (!data) return merged;
    for (const key of Object.keys(EMPTY)) {
      let v = data[key];
      if (key === 'product_component_group_code') {
        v = parsePoolMapping(v);
      }
      // Ensure platform_identifiers is always an array
      if (key === 'platform_identifiers' && !v) v = [];
      merged[key] = v != null ? v : EMPTY[key];
    }
    return merged;
  }, []);

  const [form, setForm] = useState(() => {
    const draftKey = getDraftKey(initialData?.id);
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Ensure the component mapping is normalized even in drafts
        if (parsed.product_component_group_code) {
          parsed.product_component_group_code = parsePoolMapping(parsed.product_component_group_code);
        }
        return { ...EMPTY, ...parsed };
      } catch (e) {
        console.error("Failed to parse draft:", e);
      }
    }

    if (!initialData) {
      // Set default status to the first available option
      const defaultStatus = (statusOptions && statusOptions.length > 0) ? statusOptions[0] : null;
      return {
        ...EMPTY,
        status_reference_id: defaultStatus ? defaultStatus.id : EMPTY.status_reference_id
      };
    }
    return normalizeInitialData(initialData);
  });


  // Sync draft to localStorage
  useEffect(() => {
    const draftKey = getDraftKey(initialData?.id);
    // We only save if the form is "dirty" compared to initial state (or it's a new product)
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form, initialData?.id]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { skuId: urlSkuId, activeTab: urlTab } = useParams();
  const [activeTab, setActiveTab] = useState(urlTab || initialTab || 'identity');

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const isNew = urlSkuId === 'new' || !initialData?.id;
    if (isNew) {
      navigate(`${APP_PATHS.CATALOG}/new/${tabId}`);
    } else {
      const identifier = initialData?.sku_code || initialData?.id || urlSkuId;
      navigate(`${APP_PATHS.CATALOG}/edit/${identifier}/${tabId}`);
    }
  };

  // Handle external tab switching (e.g. from Dashboard "Generate" button)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [generatingUrl, setGeneratingUrl] = useState(false);
  const [showDrivePreview, setShowDrivePreview] = useState(false);
  const [driveDraft, setDriveDraft] = useState({
    brand_name: '',
    category_name: '',
    sub_category_name: '',
    sku_code: ''
  });

  const [isAIConsoleOpen, setIsAIConsoleOpen] = useState(false);
  const [bloomHistory, setBloomHistory] = useState(new Set());
  const [originalValues, setOriginalValues] = useState({});
  const [aiWarnings, setAiWarnings] = useState({}); // { fieldId: string }
  const [regenField, setRegenField] = useState(null);
  const [channelUrls, setChannelUrls] = useState({});
  const [channelIcons, setChannelIcons] = useState({});
  const [expandedPlatIdx, setExpandedPlatIdx] = useState(null);

  // --- Core Handlers ---
  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setForm(p => {
      const next = { ...p, [name]: val };
      // Mirror SKU code → barcode
      if (name === 'sku_code') next.barcode = val;

      // Auto-calculate finished weight
      if (name === 'package_weight' || name === 'raw_product_weight') {
        const pWeight = parseFloat(next.package_weight) || 0;
        const rWeight = parseFloat(next.raw_product_weight) || 0;
        next.finished_product_weight = (pWeight > 0 || rWeight > 0) ? Math.round(pWeight + rWeight).toString() : '';
      }
      return next;
    });

    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const handleAcceptField = (fieldId) => {
    setBloomHistory(prev => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  };

  const handleDiscardField = (fieldId) => {
    if (fieldId in originalValues) {
      setForm(prev => ({ ...prev, [fieldId]: originalValues[fieldId] }));
    }
    setBloomHistory(prev => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
    setAiWarnings(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleRegenerateField = (fieldId) => {
    setRegenField(fieldId);
    setIsAIConsoleOpen(true);
  };

  const handleAcceptAll = () => {
    setBloomHistory(new Set());
    setAiWarnings({});
    setStatusMessage({ type: 'success', text: "All AI improvements accepted." });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDiscardAll = () => {
    console.log("AI Bloom: Discarding all improvements", {
      fields: Array.from(bloomHistory),
      originalValuesCount: Object.keys(originalValues).length
    });

    setForm(prev => {
      const next = { ...prev };
      bloomHistory.forEach(fieldId => {
        if (fieldId in originalValues) {
          next[fieldId] = originalValues[fieldId];
        }
      });
      return next;
    });
    setBloomHistory(new Set());
    setAiWarnings({});
    setStatusMessage({ type: 'info', text: "All AI improvements discarded." });
    setTimeout(() => setStatusMessage(null), 3000);
  };
  // ---------------------

  useEffect(() => {
    refApi.getAll('ECOMMERCE_CHANNEL').then(data => {
      const urlMapping = {};
      const iconMapping = {};
      data.forEach(ch => {
        if (ch.metadata_json && ch.metadata_json.base_url) {
          urlMapping[ch.label] = ch.metadata_json.base_url;
        }
        if (ch.icon) {
          iconMapping[ch.label] = ch.icon;
        }
      });
      setChannelUrls(urlMapping);
      setChannelIcons(iconMapping);
    }).catch(err => console.error("Failed to fetch channel URLs:", err));
  }, []);

  const handleUpdateChannelUrl = async (channelLabel, newUrl) => {
    if (!channelLabel) return;
    try {
      const allChannels = await refApi.getAll('ECOMMERCE_CHANNEL');
      const channel = allChannels.find(c => c.label === channelLabel);
      if (channel) {
        const meta = channel.metadata_json || {};
        meta.base_url = newUrl;
        await refApi.update(channel.id, {
          reference_data_type: 'CHANNEL',
          label: channel.label,
          key: channel.key,
          metadata_json: meta
        });
        setChannelUrls(prev => ({ ...prev, [channelLabel]: newUrl }));
        showStatus(`Base URL for ${channelLabel} updated successfully.`);
      }
    } catch (err) {
      console.error("Failed to update channel URL:", err);
      showStatus("Failed to update channel URL", "error");
    }
  };

    const handleApplyAI = (results) => {
    if (!results) return;

    const filteredResults = {};
    const newWarnings = { ...aiWarnings };

    Object.keys(results).forEach(key => {
      try {
        const rawVal = results[key];
        if (rawVal === null || rawVal === undefined) return;

        // --- AGGRESSIVE UNIVERSAL UNPACKING ---
        let value = null;
        let metadata = null;

        if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
          // AI returns SmartField { value, confidence_score, ... }
          if (rawVal.value !== undefined) {
            value = rawVal.value;
            metadata = rawVal;
          } else if (rawVal.body !== undefined) {
            value = rawVal.body;
            metadata = { ...rawVal, value: rawVal.body };
          } else if (rawVal.text !== undefined) {
            value = rawVal.text;
            metadata = { ...rawVal, value: rawVal.text };
          } else if (rawVal.label !== undefined) {
            value = rawVal.label;
            metadata = { ...rawVal, value: rawVal.label };
          } else {
            // Fallback: use the object's first string-like property or stringify it
            value = Object.values(rawVal).find(v => typeof v === 'string') || JSON.stringify(rawVal);
            metadata = { ...rawVal, value };
          }
        } else {
          // It's a primitive or an array
          value = rawVal;
        }

        // --- DEEP SANITIZATION (Prevent [object Object]) ---
        let finalValue = value;

        if (Array.isArray(value)) {
          finalValue = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              // Special formatting for Heading/Explanation objects (Key Features)
              const h = item.heading || item.title || item.label || '';
              const e = item.explanation || item.description || item.value || '';
              if (h && e) return `${h}: ${e}`;
              if (h || e) return h || e;
              return JSON.stringify(item);
            }
            return item;
          }).join("\n");
        } else if (typeof value === 'object' && value !== null) {
          // If we STILL have an object here (recursive check), pull the best possible string
          finalValue = value.value !== undefined ? value.value : (value.body || value.text || value.label || JSON.stringify(value));
        }

        // Clean up string values (trim, etc)
        if (typeof finalValue === 'string') {
          finalValue = finalValue.trim();
        }

        // --- TITLE VARIANT HANDLING ---
        if ((key === 'primary_title' || key === 'alt_title' || key === 'product_name' || key === 'alternate_product_name') && Array.isArray(value)) {
          // If it's a list of titles, pick the first as default but keep variants in metadata
          finalValue = value[0];
          if (metadata) {
            metadata.variants = value;
          } else {
            metadata = { value: finalValue, variants: value, confidence_score: 100, basis: 'multi_variant' };
          }
        }

        // Skip if final value is still garbage or empty
        if (finalValue === null || finalValue === undefined || String(finalValue).trim() === "" || String(finalValue) === "[object Object]") return;

        // Handle Field Mapping Bridge (AI names -> DB names)
        let targetKey = key;
        const keyMap = {
          'primary_title': 'product_name',
          'alt_title': 'alternate_product_name',
          'colour_shade': 'color',
          'key_features': 'key_feature',
          'full_ingredients': 'ingredients',
          'care_instructions': 'product_care',
          'cautions': 'caution',
          'hsn_code': 'tax_rule_code',
          'mrp_est': 'mrp',
          'selling_price_est': 'selling_price',
          'purchase_cost_est': 'purchase_cost',
          'raw_weight_g': 'raw_product_weight',
          'raw_product_weight': 'raw_product_weight', // legacy
          'package_weight_g': 'package_weight',
          'sku_id': 'sku_code',
          'sku_code': 'sku_code',
          'barcode': 'barcode',
          'tax_percent': 'tax_percent',
          'net_quantity': 'net_quantity',
          'quantity_unit': 'net_quantity_unit_reference_id'
        };

        if (keyMap[key]) {
          targetKey = keyMap[key];
        }

        // --- NUMERIC SANITIZATION ---
        const numericFields = ['mrp', 'selling_price', 'purchase_cost', 'raw_product_weight', 'package_weight', 'tax_percent', 'net_quantity'];
        if (numericFields.includes(targetKey)) {
          // Extract first valid number (handle "₹ 499" or "100-200")
          const numMatch = String(finalValue).replace(/,/g, '').match(/[\d.]+/);
          if (numMatch) {
            finalValue = numMatch[0];
          }
        }

        // CRITICAL: Never allow a string value into a reference ID field
        if (targetKey.endsWith('_reference_id') && isNaN(Number(finalValue))) {
          // Skip direct assignment; let taxonomy resolve handle it later
        } else {
          filteredResults[targetKey] = finalValue;
        }

        // Store Metadata/Warnings
        if (metadata) {
          newWarnings[targetKey] = metadata;
        }
      } catch (err) {
        console.warn(`Failed to process AI field '${key}':`, err);
      }
    });

    setAiWarnings(newWarnings);

    // --- AUTO-RESOLVE TAXONOMY IDs ---
    const getVal = (k) => {
      const r = results[k];
      if (!r) return null;
      if (typeof r === 'object' && !Array.isArray(r)) {
        return r.value !== undefined ? r.value : null;
      }
      return r;
    };

    const catVal = getVal('category');
    if (catVal && refLists?.CATEGORY) {
      const match = refLists.CATEGORY.find(c =>
        c.label?.toLowerCase() === String(catVal).toLowerCase() ||
        c.key?.toLowerCase() === String(catVal).toLowerCase()
      );
      if (match) filteredResults.category_reference_id = match.id;
      else filteredResults.category_reference_id = catVal; // Virtual Option
    }

    const subCatVal = getVal('sub_category');
    if (subCatVal && refLists?.SUB_CATEGORY) {
      const match = refLists.SUB_CATEGORY.find(sc =>
        sc.label?.toLowerCase() === String(subCatVal).toLowerCase() ||
        sc.key?.toLowerCase() === String(subCatVal).toLowerCase()
      );
      if (match) filteredResults.sub_category_reference_id = match.id;
      else filteredResults.sub_category_reference_id = subCatVal; // Virtual Option
    }

    const brandVal = getVal('brand');
    if (brandVal && refLists?.BRAND) {
      const match = refLists.BRAND.find(b =>
        b.label?.toLowerCase() === String(brandVal).toLowerCase() ||
        b.key?.toLowerCase() === String(brandVal).toLowerCase()
      );
      if (match) filteredResults.brand_reference_id = match.id;
      else filteredResults.brand_reference_id = brandVal; // Virtual Option
    }

    const unitVal = getVal('quantity_unit') || getVal('net_quantity_unit');
    if (unitVal && refLists?.NET_QUANTITY_UNIT) {
      const match = refLists.NET_QUANTITY_UNIT.find(u =>
        u.label?.toLowerCase() === String(unitVal).toLowerCase() ||
        u.key?.toLowerCase() === String(unitVal).toLowerCase()
      );
      if (match) filteredResults.net_quantity_unit_reference_id = match.id;
      else filteredResults.net_quantity_unit_reference_id = unitVal; // Virtual Option
    }
    // ---------------------------------

    // If no valid content was returned, provide feedback and exit
    if (Object.keys(filteredResults).length === 0) {
      setStatusMessage({
        type: 'info',
        text: "Bloom completed, but no new content was suggested for the selected fields."
      });
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 5000);
      return;
    }

    // Record original values before applying AI if they don't exist yet
    setOriginalValues(prev => {
      const next = { ...prev };
      Object.keys(filteredResults).forEach(key => {
        if (!(key in next)) {
          next[key] = form[key];
        }
      });
      return next;
    });

    setForm(prev => ({
      ...prev,
      ...filteredResults
    }));

    // Record which fields were improved for highlighting (only those that actually changed)
    setBloomHistory(prev => new Set([...prev, ...Object.keys(filteredResults)]));

    // Detailed feedback for one-click bloom
    setStatusMessage({
      type: 'success',
      text: "Bloom successful! 🍃 All content applied. Please review the highlighted fields and Accept or Discard changes as needed."
    });
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 8000);

    setRegenField(null);
  };

  const handleRegenerateClick = async (e, force = false) => {
    e?.stopPropagation();
    if (!force) {
      setPendingAction({ type: 'regenerate' });
      return;
    }
    setPendingAction(null);
    try {
        console.log("Drive Flow: Regenerate requested", { sku: form.sku_code });
        setGeneratingUrl(true);
        // 1. Trash the old one on the server
        if (initialData?.id && form.catalog_url) {
          await skuApi.trashCatalogFolder(initialData.id);
        }
        // 2. Clear current URL in form
        set('catalog_url', '');
        // 3. Open preview to let user see/tweak the new path
        setShowDrivePreview(true);
      } catch (err) {
        console.error("Drive Flow Error (Regenerate):", err);
        showStatus("Failed to trash folder: " + (err.response?.data?.detail || err.message), 'error');
      } finally {
        setGeneratingUrl(false);
      }
  };



  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [linkingType, setLinkingType] = useState(null); // 'raw', 'package', etc.
  const [poolInfo, setPoolInfo] = useState([]); // Flat array of related SKUs: [{ id, product_name, sku_code, product_component_group_code, catalog_url }]
  const [poolDiscovery, setPoolDiscovery] = useState({}); // { raw: [{id, product_name, sku_code, pool_id}], ... }
  const [scanningTypes, setScanningTypes] = useState(new Set());

  const fetchPoolInfo = async () => {
    if (!initialData?.id) return;
    try {
      const res = await skuApi.getPoolInfo(initialData.id);
      setPoolInfo(res);
    } catch (err) {
      console.error("Failed to fetch pool info:", err);
    }
  };

  const fetchPoolDiscovery = async (type = null) => {
    if (!initialData?.id) return;
    if (type) setScanningTypes(prev => new Set(prev).add(type));
    try {
      const res = await skuApi.getPoolDiscovery(initialData.id, type);
      setPoolDiscovery(prev => ({
        ...prev,
        ...res
      }));
    } catch (err) {
      console.error("Failed to fetch pool discovery:", err);
    } finally {
      if (type) setScanningTypes(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchPoolInfo();
    // fetchPoolDiscovery(); // Disabled auto-discovery per optimization plan
  }, [initialData?.id, form.product_component_group_code]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await skuApi.search(searchQuery);
        if (Array.isArray(res)) {
          setSearchResults(res.filter(sku => sku.id !== initialData?.id));
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery, initialData?.id]);

  const handleLinkComponent = async (targetSkuId) => {
    if (!initialData?.id || !linkingType) return;
    setSaving(true);
    try {
      const res = await skuApi.linkComponent(initialData.id, targetSkuId, linkingType);
      // Refresh form data to show new mapping
      const updatedSku = await skuApi.getById(initialData.id);
      setForm(p => ({ ...p, product_component_group_code: parsePoolMapping(updatedSku.product_component_group_code) }));
      setLinkingType(null);
      setSearchQuery('');
      await fetchPoolInfo();
      await fetchPoolDiscovery();
      showStatus("Component linked successfully!");
    } catch (err) {
      showStatus(`Linking failed: ${err.response?.data?.detail || err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkComponent = async (type, force = false) => {
    if (!initialData?.id) return;
    if (!force) {
      setPendingAction({ type: 'unlink', payload: type });
      return;
    }
    setPendingAction(null);
    setSaving(true);
    try {
      await skuApi.unlinkComponent(initialData.id, type);
      const updatedSku = await skuApi.getById(initialData.id);
      setForm(p => ({ ...p, product_component_group_code: parsePoolMapping(updatedSku.product_component_group_code) }));
      await fetchPoolInfo();
      await fetchPoolDiscovery();
      showStatus("Component unlinked.");
    } catch (err) {
      showStatus(`Unlinking failed: ${err.response?.data?.detail || err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Pre-populate driveDraft labels when editing existing product

  useEffect(() => {
    if (initialData?.id) {
      // Fetch labels for current references
      const fetchLabels = async () => {
        try {
          const promises = [];

          if (initialData.brand_reference_id) {
            promises.push(refApi.getAll('BRAND').then(list => {
              const found = list.find(r => r.id === initialData.brand_reference_id);
              if (found) setDriveDraft(d => ({ ...d, brand_name: sanitizeFolderName(found.label) }));
            }));
          }

          if (initialData.category_reference_id) {
            promises.push(refApi.getAll('CATEGORY').then(list => {
              const found = list.find(r => r.id === initialData.category_reference_id);
              if (found) setDriveDraft(d => ({ ...d, category_name: sanitizeFolderName(found.label) }));
            }));
          }

          if (initialData.sub_category_reference_id) {
            promises.push(refApi.getAll('SUB_CATEGORY').then(list => {
              const found = list.find(r => r.id === initialData.sub_category_reference_id);
              if (found) setDriveDraft(d => ({ ...d, sub_category_name: sanitizeFolderName(found.label) }));
            }));
          }

          setDriveDraft(d => ({ ...d, sku_code: initialData.sku_code || '' }));
          await Promise.all(promises);
        } catch (err) {
          console.error("Failed to pre-fetch drive labels:", err);
        }
      };
      fetchLabels();
    } else {
      // For new products, just sync SKU code
      setDriveDraft(d => ({ ...d, sku_code: form.sku_code || '' }));
    }
  }, [initialData?.id]);

  const preparePayload = (formData) => {
    const payload = { ...formData };
    ['mrp', 'purchase_cost', 'selling_price', 'package_weight', 'raw_product_weight',
      'net_quantity', 'tax_percent',
      'brand_reference_id', 'category_reference_id', 'sub_category_reference_id',
      'status_reference_id', 'net_quantity_unit_reference_id', 'size_reference_id'
    ].forEach(k => {
      const raw = payload[k];
      if (raw === "" || raw === undefined || raw === null) {
        payload[k] = null;
      } else {
        const isNumeric = ['mrp', 'purchase_cost', 'selling_price', 'package_weight', 'raw_product_weight', 'net_quantity', 'tax_percent'].includes(k);
        const isId = k.endsWith('_reference_id');
        const num = Number(raw);

        if (isNumeric) {
          payload[k] = isNaN(num) ? null : num;
        } else if (isId) {
          // IDs can be integers (existing) or strings (new/ad-hoc)
          // If it's a number-like string, convert it to a number.
          // If it's a real string (like "New Category"), keep it as a string.
          if (!isNaN(num) && typeof raw !== 'string') {
            payload[k] = num;
          } else if (!isNaN(num) && typeof raw === 'string' && raw.trim() !== "" && !isNaN(parseInt(raw))) {
             payload[k] = parseInt(raw);
          } else {
            payload[k] = raw; // Keep as string for backend resolution
          }
        } else {
          payload[k] = isNaN(num) ? raw : num;
        }
      }
    });
    // Remove derived/legacy fields from payload
    delete payload.finished_product_weight;
    // Force SKU and Barcode to be identical as per user instructions
    payload.barcode = payload.sku_code;

    // Ensure platform_identifiers is a list and filter out empty ones
    if (Array.isArray(payload.platform_identifiers)) {
      payload.platform_identifiers = payload.platform_identifiers.filter(p =>
        (p.id && String(p.id).trim() !== "") &&
        (p.channel_name && String(p.channel_name).trim() !== "")
      );
    } else {
      payload.platform_identifiers = [];
    }

    return payload;
  };

  const handleGenerateDriveFolder = async (e) => {
    e?.stopPropagation();

    if (!showDrivePreview) {
      console.log("Drive Flow: Opening preview panel", {
        sku: form.sku_code,
        draft: driveDraft
      });

      // Initialize driveDraft labels from the form values
      setDriveDraft(prev => ({
        ...prev,
        sku_code: sanitizeFolderName(form.sku_code) || ''
      }));
      setShowDrivePreview(true);
      return;
    }

    console.log("Drive Flow: Requesting folder creation", driveDraft);
    setGeneratingUrl(true);
    try {
      const res = await skuApi.generateCatalogUrlPreview(driveDraft);
      console.log("Drive Flow: Received response", res);

      if (!res || !res.catalog_url) {
        throw new Error("Backend failed to return a valid Catalog URL.");
      }

      const updatedUrl = res.catalog_url;
      set('catalog_url', updatedUrl);
      setShowDrivePreview(false);

      // We no longer auto-save and close the form here.
      // This allows the user to continue editing other fields before clicking the main "Save" button.

    } catch (err) {
      console.error("Drive Flow Error (Create):", err);
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      showStatus(`Failed to create Google Drive folder: ${msg}`, 'error');
    } finally {
      setGeneratingUrl(false);
    }
  };

  const savedSnapshot = useRef(null);
  if (!savedSnapshot.current) {
    if (!initialData) {
      const base = { ...EMPTY };
      const draftStatus = (statusOptions || []).find(s => s.label.toLowerCase() === 'draft');
      if (draftStatus) base.status_reference_id = draftStatus.id;
      savedSnapshot.current = base;
    } else {
      savedSnapshot.current = normalizeInitialData(initialData);
    }
  }

  const isDirty = useMemo(() => {
    return Object.keys(EMPTY).some(k => {
      let a = form[k];
      let b = savedSnapshot.current[k];

      // Deep compare for arrays (product_component_group_code, platform_identifiers)
      if (Array.isArray(a) || Array.isArray(b)) {
        return JSON.stringify(a || []) !== JSON.stringify(b || []);
      }

      // Normalize values for comparison
      const normalize = (val) => {
        if (val === '' || val === null || val === undefined) return null;
        // Optimization: ensure numeric fields are compared strictly as strings to avoid scale issues (e.g. 499 vs 499.0)
        return String(val).trim();
      };

      return normalize(a) !== normalize(b);
    });
  }, [form]);

  const handleClose = () => {
    if (!isEdit) {
      // For NEW products: silently keep the draft and close — no popup needed
      // The next time they open Add Product, the draft will be restored
      onClose();
      return;
    }
    // For EDIT: only show dialog if there are unsaved changes
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  // Keep draft & close: closes without saving but retains localStorage draft for later
  const handleKeepDraft = () => {
    setConfirmClose(false);
    onClose();
  };

  // Discard: clears localStorage draft and reverts form
  const handleDiscard = () => {
    localStorage.removeItem(getDraftKey(initialData?.id));
    setConfirmClose(false);
    onClose();
  };
  const validate = () => {
    const errs = {};
    if (!form.product_name?.trim()) errs.product_name = 'Product name is required';
    if (!form.sku_code?.trim()) errs.sku_code = 'SKU code is required';
    return errs;
  };

  const saveForm = async (opts = {}) => {
    if (opts.fromDialog) setConfirmClose(false);
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const errTabs = getTabsWithErrors(errs);
      const firstErrTab = TABS.find(t => errTabs.has(t.id));
      if (firstErrTab) handleTabChange(firstErrTab.id);
      return;
    }
    setSaving(true);
    try {
      const payload = preparePayload(form);

      if (initialData?.id) await skuApi.update(initialData.id, payload);
      else await skuApi.create(payload);

      // Clear draft on success
      localStorage.removeItem(getDraftKey(initialData?.id));

      savedSnapshot.current = { ...form };
      onSaved();
    } catch (err) {
      showStatus(`Save failed: ${err.response?.data?.detail || err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); saveForm(); };
  const title = isEdit ? 'Edit Product' : 'Add New Product';
  const tabsWithErrors = getTabsWithErrors(errors);


  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm animate-[fade-in_0.2s_ease]"
        onClick={handleClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 sm:right-0 z-[100] flex flex-col w-full sm:w-full md:max-w-2xl bg-[var(--color-card)] border-l border-[var(--color-border)] shadow-2xl animate-[slide-in-from-right_0.3s_cubic-bezier(0.4,0,0.2,1)] overflow-hidden">

        {/* ── Unsaved-changes dialog (Edit mode only) ───────────── */}
        {confirmClose && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm rounded-none">
            <div className="bg-[var(--color-card)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-[340px] flex flex-col gap-5">
              <div>
                <p className="font-semibold text-[var(--color-foreground)] text-base">Unsaved changes</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">You have changes that haven't been saved to the database. What would you like to do?</p>
              </div>
              <div className="flex flex-col gap-2">
                {/* Option 1: Save & Close */}
                <Button size="sm" disabled={saving} onClick={() => saveForm({ fromDialog: true })} className="w-full justify-start gap-2 h-10">
                  {saving ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save size={14} />}
                  <span>Save &amp; Close</span>
                </Button>
                {/* Option 2: Keep draft */}
                <Button variant="outline" size="sm" onClick={handleKeepDraft} className="w-full justify-start gap-2 h-12">
                  <BookmarkCheck size={14} className="text-amber-500" />
                  <span className="text-left leading-none">Keep changes, close for now
                    <span className="block text-[10px] text-[var(--color-muted-foreground)] font-normal mt-1">You can return to this product later.</span>
                  </span>
                </Button>
                {/* Option 3: Discard */}
                <Button variant="ghost" size="sm" onClick={handleDiscard} className="w-full justify-start gap-2 h-10 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                  <Trash2 size={14} />
                  <span>Discard all changes</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[50%] sm:max-w-none">
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
                title="Close"
              >
                <X size={20} className="sm:size-[18px]" />
              </button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="hidden xs:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shadow-inner shrink-0">
                   <BookmarkCheck size={18} className="sm:size-5" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h2 className="text-[13px] sm:text-base font-bold text-[var(--color-foreground)] leading-tight truncate">{title}</h2>
                  <p className="text-[8px] sm:text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest truncate">Catalog Entry</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setNotesOpen(!notesOpen)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  notesOpen ? "bg-amber-100 text-amber-700 shadow-inner" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
                  !notesOpen && form.remark && "text-amber-600 bg-amber-500/10 ring-1 ring-amber-500/20"
                )}
                title="Internal Notes"
              >
                <StickyNote size={20} className="sm:size-[18px]" />
              </button>

              <button
                type="button"
                onClick={() => setIsAIConsoleOpen(!isAIConsoleOpen)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 p-2 px-2.5 sm:px-3 rounded-lg transition-all font-bold group",
                  isAIConsoleOpen
                    ? "bg-indigo-500 text-white shadow-inner"
                    : "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                )}
                title={isAIConsoleOpen ? "Close AI Workspace" : "Bloom AI Intelligence"}
              >
                <Zap size={20} className={cn("sm:size-[18px] transition-transform", isAIConsoleOpen ? "scale-90" : "group-hover:scale-110")} fill="currentColor" />
                <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Bloom AI</span>
              </button>

              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="h-9 gap-1.5 sm:gap-2 shrink-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white transition-all font-bold px-3 sm:px-4 shadow-lg shadow-[var(--color-primary)]/20"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <><Save size={16} className="sm:size-4" /><span className="hidden sm:inline">{isEdit ? 'Save Changes' : 'Create Product'}</span><span className="sm:hidden text-[11px] font-black uppercase tracking-tight">Save</span></>
                )}
              </Button>
            </div>
          </div>
        </div>

        {isAIConsoleOpen ? (
          /* AI MODE: Only show the console */
          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            <div className="max-w-4xl mx-auto p-4 md:p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Bloom AI Intelligence Engine</h2>
                  <p className="text-xs text-slate-500 font-medium">Generate high-converting product content using AI</p>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/5 border border-indigo-100 overflow-hidden">
                <BloomAIConsole
                  initialData={initialData}
                  currentForm={form}
                  references={refLists}
                  initialSelectedFields={regenField ? [regenField] : null}
                  onApply={handleApplyAI}
                  onClose={() => {
                    setIsAIConsoleOpen(false);
                    setRegenField(null);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* FORM MODE: Regular editing */
          <>
            {/* AI Command Center (Sticky bar when suggestions are present) */}
            {bloomHistory.size > 0 && (
              <div className="flex-shrink-0 z-[75] px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-2 duration-300 sticky top-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                    <Zap size={12} fill="currentColor" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    AI Improvements Active ({bloomHistory.size} fields)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscardAll}
                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-100 border-none bg-transparent"
                  >
                    <RotateCcw size={12} className="mr-1.5" />
                    Clear All AI Content
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAcceptAll}
                    className="h-8 px-4 text-[10px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                  >
                    <Check size={12} className="mr-1.5" />
                    Accept All
                  </Button>
                </div>
              </div>
            )}

        {/* ── Notes panel ─────────────────────────────────────── */}
        {notesOpen && (
          <div className="px-5 py-3 bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 flex-shrink-0 animate-[fade-in_0.2s_ease]">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-wider">Internal Operational Notes</p>
            <AutoTextarea
              name="remark"
              value={form.remark}
              onChange={handleChange}
              placeholder="QC flags, artwork status, launch remarks…"
              rows={2}
              className="bg-[var(--color-card)] border-amber-500/20 focus:ring-amber-500/30 text-amber-900 dark:text-amber-100 placeholder:text-amber-500/40"
            />
          </div>
        )}

        {/* ── Global Status Notifications (Floating Toast) ───── */}
        {statusMessage && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-6 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
            <div className={cn(
              "flex items-center gap-4 p-3 rounded-2xl shadow-2xl border backdrop-blur-xl pointer-events-auto",
              statusMessage.type === 'error'
                ? "bg-rose-500/95 border-rose-400 text-white shadow-rose-500/30"
                : "bg-indigo-500/95 border-indigo-400 text-white shadow-indigo-500/30"
            )}>
              <div className="shrink-0 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                {statusMessage.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
              </div>
              <p className="text-[11px] font-bold leading-snug flex-1">{statusMessage.text}</p>
              <button onClick={() => setStatusMessage(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-0 border-b border-[var(--color-border)] px-2 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => {
            const hasErr = tabsWithErrors.has(t.id);
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium whitespace-nowrap relative transition-colors",
                  isActive
                    ? "text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--color-primary)] after:rounded-t"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  hasErr && "text-red-500"
                )}
              >
                <t.icon size={13} />
                {t.label}
                {hasErr && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable body ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form id="skuForm" onSubmit={handleSubmit} noValidate>
            <div className="p-5 flex flex-col gap-5">

              {/* IDENTITY */}
              {activeTab === 'identity' && (
                <>
                  <ImageBlock
                    onStatus={showStatus}
                    value={form.primary_image_url}
                    onChange={(val) => set('primary_image_url', val)}
                    catalogUrl={form.catalog_url}
                  />

                  <Field id="product_name" label="Product Name" required error={errors.product_name} isImproved={bloomHistory.has('product_name')} aiWarning={aiWarnings.product_name}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <input type="text" name="product_name" value={form.product_name} onChange={handleChange}
                      className={inputCls(errors.product_name)}
                      placeholder="e.g. Bloomerce Rose Petal Face Wash" />
                  </Field>

                  <Field id="sku_code" label="SKU / EAN / Barcode ID" required error={errors.sku_code} hint="Saved as both SKU Code and Barcode/EAN in the database" isImproved={bloomHistory.has('sku_code')} aiWarning={aiWarnings.sku_code}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <input type="text" name="sku_code" value={form.sku_code} onChange={handleChange}
                      className={cn(inputCls(errors.sku_code), "font-mono")}
                      placeholder="e.g. BL-RFW-001 or 8901234567891" />
                  </Field>

                  <FieldRow>
                    <Field id="brand_reference_id" label="Brand" isImproved={bloomHistory.has('brand_reference_id')} aiWarning={aiWarnings.brand_reference_id || aiWarnings.brand}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <DynamicReferenceSelect label="" referenceType="BRAND" value={form.brand_reference_id}
                        isImproved={bloomHistory.has('brand_reference_id')}
                        onChange={(id, label) => {
                          set('brand_reference_id', id);
                          setDriveDraft(prev => ({ ...prev, brand_name: sanitizeFolderName(label) }));
                        }} placeholder="Select or add brand…" />
                    </Field>
                  </FieldRow>

                  {/* COMPONENT SYNC STATUS (Identity View) */}
                  {(Array.isArray(form.product_component_group_code) ? form.product_component_group_code : []).length > 0 && (
                    <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100/50 text-indigo-600 flex items-center justify-center">
                            <BookmarkCheck size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Syndicated Infrastructure</p>
                            <p className="text-[10px] text-indigo-600 font-medium">
                              {poolInfo.length} Products across {(Array.isArray(form.product_component_group_code) ? form.product_component_group_code : []).length} Pools
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTabChange('components')}
                          className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 border-none bg-transparent"
                        >
                          View Details
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-indigo-100/50">
                        {(Array.isArray(form.product_component_group_code) ? form.product_component_group_code : []).map((entry, idx) => {
                          const peers = poolInfo.filter(peer => {
                            const peerCodes = parsePoolMapping(peer.product_component_group_code);
                            return peerCodes.some(c => c.type === entry.type && c.id === entry.id);
                          });
                          return (
                            <div key={idx} className="flex flex-col min-w-[70px]">
                              <div className="flex items-center justify-between px-1 mb-0.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{entry.type}</span>
                                {peers.length > 0 && <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1 rounded-sm">{peers.length}</span>}
                              </div>
                              <span className="px-2 py-0.5 bg-white text-indigo-600 rounded-lg text-[10px] font-mono font-bold border border-indigo-100 truncate shadow-sm" title={entry.id}>
                                {entry.id || '...'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* CLASSIFICATION */}
              {activeTab === 'classification' && (
                <>
                  <FieldRow>
                    <Field id="category_reference_id" label="Category" isImproved={bloomHistory.has('category_reference_id')} aiWarning={aiWarnings.category_reference_id || aiWarnings.category}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <DynamicReferenceSelect label="" referenceType="CATEGORY" value={form.category_reference_id}
                        isImproved={bloomHistory.has('category_reference_id')}
                        onChange={(id, label) => {
                          const hasChanged = id !== form.category_reference_id;
                          set('category_reference_id', id);
                          if (hasChanged) {
                            set('sub_category_reference_id', null);
                            setDriveDraft(prev => ({ ...prev, category_name: sanitizeFolderName(label), sub_category_name: '' }));
                          } else {
                            setDriveDraft(prev => ({ ...prev, category_name: sanitizeFolderName(label) }));
                          }
                        }} placeholder="Select or add category…" />
                    </Field>
                    <Field id="sub_category_reference_id" label="Sub-Category" isImproved={bloomHistory.has('sub_category_reference_id')} aiWarning={aiWarnings.sub_category_reference_id || aiWarnings.sub_category}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <DynamicReferenceSelect label="" referenceType="SUB_CATEGORY" value={form.sub_category_reference_id}
                        parentId={form.category_reference_id}
                        isImproved={bloomHistory.has('sub_category_reference_id')}
                        onChange={(id, label) => {
                          set('sub_category_reference_id', id);
                          setDriveDraft(prev => ({ ...prev, sub_category_name: sanitizeFolderName(label) }));
                        }} placeholder="Select or add sub-category…" />
                    </Field>
                  </FieldRow>
                  <Field id="status_reference_id" label="Product Status" isImproved={bloomHistory.has('status_reference_id')}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <DynamicReferenceSelect label="" referenceType="STATUS" value={form.status_reference_id}
                      isImproved={bloomHistory.has('status_reference_id')}
                      onChange={(v) => set('status_reference_id', v)} placeholder="Active / Inactive / Draft…" />
                  </Field>
                  <Field id="product_type" label="Product Type" isImproved={bloomHistory.has('product_type')}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <input type="text" name="product_type" value={form.product_type} onChange={handleChange}
                      className={inputCls(false)} placeholder="e.g. Finished Good / Raw Material" />
                  </Field>
                </>
              )}

              {/* CONTENT */}
              {activeTab === 'content' && (
                <>
                  <Field label="Catalog / Product Page URL">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 group min-h-[40px]">
                        {!showDrivePreview ? (
                          <>
                            <input
                              type="url"
                              name="catalog_url"
                              value={form.catalog_url}
                              onChange={handleChange}
                              className={cn(inputCls(false), "w-full sm:grow font-mono text-[11px] h-10")}
                              placeholder="https://drive.google.com/..."
                            />

                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                              {form.catalog_url ? (
                                <>
                                  <a
                                    href={form.catalog_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-1 sm:flex-none items-center justify-center w-auto sm:w-10 h-10 px-4 sm:px-0 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-95 transition-all shrink-0 shadow-sm gap-2"
                                    title="Open Drive Link"
                                  >
                                    <ExternalLink size={15} />
                                    <span className="sm:hidden text-xs font-bold uppercase tracking-wider">Open</span>
                                  </a>

                                  {pendingAction?.type === 'regenerate' ? (
                                    <div className="flex items-center gap-1.5 animate-in zoom-in-95 duration-200">
                                      <button
                                        type="button"
                                        onClick={(e) => handleRegenerateClick(e, true)}
                                        className="h-10 px-4 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all border-none text-[10px] font-black uppercase shadow-md shadow-amber-500/20"
                                      >
                                        Confirm Re-gen
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPendingAction(null)}
                                        className="h-10 px-4 rounded-xl bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all text-[10px] font-bold uppercase"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleRegenerateClick}
                                      disabled={generatingUrl}
                                      className="flex flex-1 sm:flex-none items-center justify-center w-auto sm:w-10 h-10 px-4 sm:px-0 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 active:scale-95 transition-all shrink-0 gap-2"
                                      title="Re-generate Google Drive Folder"
                                    >
                                      <RefreshCw size={15} className={generatingUrl ? "animate-spin" : ""} />
                                      <span className="sm:hidden text-xs font-bold uppercase tracking-wider">Reset</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleGenerateDriveFolder}
                                  disabled={generatingUrl || !form.sku_code || !form.brand_reference_id || !form.category_reference_id || !form.sub_category_reference_id}
                                  className={cn(
                                    "flex flex-1 sm:flex-none items-center justify-center gap-2 px-6 sm:px-4 h-10 rounded-xl text-xs font-bold transition-all border shrink-0 shadow-sm w-full sm:w-auto",
                                    (generatingUrl || !form.sku_code || !form.brand_reference_id || !form.category_reference_id || !form.sub_category_reference_id)
                                      ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                      : "bg-white border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-95"
                                  )}
                                >
                                  <FolderPlus size={15} />
                                  Preview Path
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="grow flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1.5 p-3 sm:p-0 sm:px-3 sm:py-1 rounded-2xl sm:rounded-xl bg-amber-50/50 border border-amber-200 shadow-sm animate-in slide-in-from-right-2 duration-300 h-auto sm:h-11">
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1 grow min-w-0">
                               <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">Brand</span>
                                <input
                                  className="min-w-0 flex-1 bg-white/90 hover:bg-white border border-transparent focus:border-amber-300 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-600 text-[11px] truncate shadow-sm sm:shadow-none"
                                  value={driveDraft.brand_name}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, brand_name: sanitizeFolderName(e.target.value) }))}
                                  placeholder="brand"
                                />
                              </div>

                              <span className="hidden sm:inline text-amber-300 shrink-0 select-none">/</span>

                              <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">Category</span>
                                <input
                                  className="min-w-0 flex-1 bg-white/90 hover:bg-white border border-transparent focus:border-amber-300 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-600 text-[11px] truncate shadow-sm sm:shadow-none"
                                  value={driveDraft.category_name}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, category_name: sanitizeFolderName(e.target.value) }))}
                                  placeholder="category"
                                />
                              </div>

                              <span className="hidden sm:inline text-amber-300 shrink-0 select-none">/</span>

                              <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">Sub-Cat</span>
                                <input
                                  className="min-w-0 flex-1 bg-white/90 hover:bg-white border border-transparent focus:border-amber-300 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-600 text-[11px] truncate shadow-sm sm:shadow-none"
                                  value={driveDraft.sub_category_name}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, sub_category_name: sanitizeFolderName(e.target.value) }))}
                                  placeholder="subcategory"
                                />
                              </div>

                              <span className="hidden sm:inline text-amber-300 shrink-0 select-none">/</span>

                              <div className="flex flex-col gap-1 sm:contents">
                                <span className="sm:hidden text-[9px] font-bold text-amber-600 uppercase tracking-tighter ml-1 opacity-70">SKU Code</span>
                                <input
                                  className="min-w-0 flex-1 bg-white font-bold border border-amber-200 focus:border-amber-400 rounded-lg sm:rounded-md px-2.5 py-1.5 sm:py-1 outline-none transition-all text-slate-900 text-[11px] truncate shadow-inner"
                                  value={driveDraft.sku_code}
                                  onChange={(e) => setDriveDraft(prev => ({ ...prev, sku_code: sanitizeFolderName(e.target.value) }))}
                                  placeholder="sku"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-1.5 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-amber-200 sm:pl-2">
                               <button
                                 type="button"
                                 onClick={handleGenerateDriveFolder}
                                 disabled={generatingUrl}
                                 className="flex grow sm:grow-0 items-center justify-center gap-2 sm:gap-0 px-4 sm:px-0 w-auto sm:w-8 h-10 sm:h-8 rounded-xl sm:rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                               >
                                 {generatingUrl ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                                 <span className="sm:hidden text-xs font-bold uppercase tracking-widest">Confirm & Create</span>
                               </button>
                               <button
                                 type="button"
                                 onClick={() => setShowDrivePreview(false)}
                                 className="flex items-center justify-center w-12 sm:w-8 h-10 sm:h-8 rounded-xl sm:rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-100 active:scale-95 transition-all"
                               >
                                 <X size={16} />
                               </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {initialData?.id && isDirty && !form.catalog_url && !showDrivePreview && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 ml-1 mt-1">
                          <AlertCircle size={10} /> Save product first
                        </p>
                      )}
                      {!initialData?.id && !form.catalog_url && !showDrivePreview && (!form.sku_code || !form.brand_reference_id || !form.category_reference_id || !form.sub_category_reference_id) && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 ml-1 mt-1">
                          <AlertCircle size={10} /> Complete Identity first
                        </p>
                      )}
                    </div>
                  </Field>

                  <Field id="description" label="Description" hint="Main product description shown on listings" isImproved={bloomHistory.has('description')} aiWarning={aiWarnings.description}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <AutoTextarea name="description" value={form.description} onChange={handleChange} isImproved={bloomHistory.has('description')}
                      placeholder="Describe the product clearly for customers and search engines…" rows={3} />
                  </Field>
                  <Field id="key_feature" label="Key Features / USPs" hint="One feature per line" isImproved={bloomHistory.has('key_feature')} aiWarning={aiWarnings.key_feature}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <AutoTextarea name="key_feature" value={form.key_feature} onChange={handleChange} isImproved={bloomHistory.has('key_feature')}
                      placeholder={"Sulphate-free\npH balanced\nSuitable for all skin types"} rows={3} />
                  </Field>
                  <FieldRow>
                    <Field id="key_ingredients" label="Key Ingredients" isImproved={bloomHistory.has('key_ingredients')} aiWarning={aiWarnings.key_ingredients}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <AutoTextarea name="key_ingredients" value={form.key_ingredients} onChange={handleChange} isImproved={bloomHistory.has('key_ingredients')}
                        placeholder="Rose Water, Aloe Vera…" />
                    </Field>
                    <Field id="ingredients" label="Full Ingredients" isImproved={bloomHistory.has('ingredients')} aiWarning={aiWarnings.ingredients}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <AutoTextarea name="ingredients" value={form.ingredients} onChange={handleChange} isImproved={bloomHistory.has('ingredients')}
                        placeholder="Aqua, Glycerin, Rosa Damascena…" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field id="how_to_use" label="How to Use" isImproved={bloomHistory.has('how_to_use')} aiWarning={aiWarnings.how_to_use}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <AutoTextarea name="how_to_use" value={form.how_to_use} onChange={handleChange} isImproved={bloomHistory.has('how_to_use')}
                        placeholder="Apply on wet face, massage gently, rinse." />
                    </Field>
                    <Field id="product_care" label="Product Care" isImproved={bloomHistory.has('product_care')} aiWarning={aiWarnings.product_care}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <AutoTextarea name="product_care" value={form.product_care} onChange={handleChange} isImproved={bloomHistory.has('product_care')}
                        placeholder="Store in a cool, dry place." />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field id="caution" label="Caution / Warnings" isImproved={bloomHistory.has('caution')} aiWarning={aiWarnings.caution}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <AutoTextarea name="caution" value={form.caution} onChange={handleChange} isImproved={bloomHistory.has('caution')}
                        placeholder="Keep out of reach of children. For external use only." />
                    </Field>
                  </FieldRow>
                  <Field id="seo_keywords" label="SEO Keywords" hint="Comma-separated" isImproved={bloomHistory.has('seo_keywords')} aiWarning={aiWarnings.seo_keywords}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <input type="text" name="seo_keywords" value={form.seo_keywords} onChange={handleChange}
                      className={inputCls(false)} placeholder="rose face wash, sulphate free" />
                  </Field>
                </>
              )}

              {/* PRICING & SPECS */}
              {activeTab === 'pricing' && (
                <>
                  <FieldRow>
                    <Field id="mrp" label="MRP (₹)" hint="Maximum Retail Price" isImproved={bloomHistory.has('mrp')} aiWarning={aiWarnings.mrp}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="number" name="mrp" value={form.mrp} onChange={handleChange}
                        className={inputCls(false)} placeholder="499.00" min="0" step="0.01" />
                    </Field>
                    <Field id="purchase_cost" label="Purchase Cost (₹)" isImproved={bloomHistory.has('purchase_cost')} aiWarning={aiWarnings.purchase_cost}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="number" name="purchase_cost" value={form.purchase_cost} onChange={handleChange}
                        className={inputCls(false)} placeholder="148.00" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field id="net_quantity" label="Net Quantity" isImproved={bloomHistory.has('net_quantity')} aiWarning={aiWarnings.net_quantity}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="number" name="net_quantity" value={form.net_quantity} onChange={handleChange}
                        className={inputCls(false)} placeholder="100" min="0" step="0.01" />
                    </Field>
                    <Field id="net_quantity_unit_reference_id" label="Net Quantity Unit" isImproved={bloomHistory.has('net_quantity_unit_reference_id')} aiWarning={aiWarnings.net_quantity_unit_reference_id || aiWarnings.net_quantity_unit}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                       <DynamicReferenceSelect label="" referenceType="NET_QUANTITY_UNIT" value={form.net_quantity_unit_reference_id}
                        onChange={(v) => set('net_quantity_unit_reference_id', v)} placeholder="ml / g / pcs…" />
                    </Field>
                  </FieldRow>
                  <Field id="size_reference_id" label="Size Specification" isImproved={bloomHistory.has('size_reference_id')} aiWarning={aiWarnings.size_reference_id}
                    onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                    <DynamicReferenceSelect label="" referenceType="SIZE" value={form.size_reference_id}
                      onChange={(v) => set('size_reference_id', v)} placeholder="Standard / Large / Custom Size…" />
                  </Field>
                  <FieldRow>
                    <Field id="color" label="Color / Shade" isImproved={bloomHistory.has('color')} aiWarning={aiWarnings.color || aiWarnings.colour}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="text" name="color" value={form.color} onChange={handleChange}
                        className={inputCls(false)} placeholder="e.g. Rose Pink" />
                    </Field>
                    <Field id="raw_product_size" label="Raw Product Size" isImproved={bloomHistory.has('raw_product_size')} aiWarning={aiWarnings.raw_product_size}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="text" name="raw_product_size" value={form.raw_product_size} onChange={handleChange}
                        className={inputCls(false)} placeholder="e.g. 15x5x5 cm" />
                      {/* raw info removed */}
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field id="package_size" label="Package Size" isImproved={bloomHistory.has('package_size')} aiWarning={aiWarnings.package_size}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="text" name="package_size" value={form.package_size} onChange={handleChange}
                        className={inputCls(false)} placeholder="e.g. 16x6x6 cm" />
                      {/* package info removed */}
                    </Field>
                    <Field id="package_weight" label="Package Weight (g)" isImproved={bloomHistory.has('package_weight')} aiWarning={aiWarnings.package_weight || aiWarnings.package_weight_g}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="number" name="package_weight" value={form.package_weight} onChange={handleChange}
                        className={inputCls(false)} placeholder="25" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field id="raw_product_weight" label="Raw Product Weight (g)" isImproved={bloomHistory.has('raw_product_weight')} aiWarning={aiWarnings.raw_product_weight || aiWarnings.raw_product_weight_g}
                      onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                      <input type="number" name="raw_product_weight" value={form.raw_product_weight} onChange={handleChange}
                        className={inputCls(false)} placeholder="100" min="0" step="0.01" />
                    </Field>
                    <Field label="Finished Product Weight (g)" hint="Auto-calculated (Raw + Package)">
                      <input type="number" name="finished_product_weight" value={form.finished_product_weight} readOnly
                        className={cn(inputCls(false), "bg-[var(--color-muted)]/50 cursor-not-allowed font-semibold")} placeholder="125" min="0" step="0.01" />
                    </Field>
                  </FieldRow>
                </>
              )}

              {/* PRODUCT & BUNDLE */}
              {activeTab === 'bundling' && (
                <FieldRow>
                  <Field label="Bundle Type">
                    <DynamicReferenceSelect label="" referenceType="BUNDLE_TYPE" value={form.bundle_type}
                      onChange={(v) => set('bundle_type', v)} placeholder="Single / Combo / Pack…" />
                  </Field>
                  <Field label="Pack Type">
                    <DynamicReferenceSelect label="" referenceType="PACK_TYPE" value={form.pack_type}
                      onChange={(v) => set('pack_type', v)} placeholder="Mono Carton / Glass Bottle…" />
                  </Field>
                </FieldRow>
              )}

               {/* TAX & COMPLIANCE */}
               {activeTab === 'tax' && (
                 <FieldRow>
                   <Field id="tax_rule_code" label="Tax Rule Code (HSN)" error={errors.tax_rule_code} isImproved={bloomHistory.has('tax_rule_code')} aiWarning={aiWarnings.tax_rule_code}
                     onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                     <input type="text" name="tax_rule_code" value={form.tax_rule_code} onChange={handleChange}
                       className={cn(inputCls(errors.tax_rule_code), "font-mono")} placeholder="HSN-8517" />
                   </Field>
                   <Field id="tax_percent" label="Tax %" isImproved={bloomHistory.has('tax_percent')} aiWarning={aiWarnings.tax_percent}
                     onAccept={handleAcceptField} onDiscard={handleDiscardField} onRegenerate={handleRegenerateField}>
                     <input type="number" name="tax_percent" value={form.tax_percent} onChange={handleChange}
                       className={inputCls(false)} placeholder="18" min="0" max="100" step="0.1" />
                   </Field>
                 </FieldRow>
               )}

               {/* PLATFORMS */}
               {activeTab === 'platforms' && (
                 <div className="flex flex-col gap-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="text-sm font-bold text-[var(--color-foreground)] uppercase tracking-tight">Ecommerce Channel Identifiers</h3>
                       <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Map this SKU to external marketplace IDs (e.g. Amazon ASIN, Myntra Style ID)</p>
                     </div>
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         const next = [...(form.platform_identifiers || []), { id: '', channel_name: '', type: '' }];
                         set('platform_identifiers', next);
                         setExpandedPlatIdx(next.length - 1);
                       }}
                       className="gap-2 h-8 text-[10px] font-bold uppercase tracking-wider"
                     >
                       <PlusCircle size={14} /> Add Channel
                     </Button>
                   </div>

                   <div className="space-y-4">
                     {(form.platform_identifiers || []).length === 0 ? (
                       <div className="p-10 border-2 border-dashed border-[var(--color-border)] rounded-3xl flex flex-col items-center justify-center text-center gap-3 bg-[var(--color-muted)]/5">
                         <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                           <ExternalLink size={24} />
                         </div>
                         <div>
                           <p className="font-bold text-[var(--color-foreground)]">No channel IDs linked</p>
                           <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Add identifiers to help with marketplace synchronization and tracking.</p>
                         </div>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 gap-4">
                         {(form.platform_identifiers || []).map((plat, idx) => {
                            const isExpanded = expandedPlatIdx === idx;
                            const baseUrl = channelUrls[plat.channel_name];
                            const finalUrl = baseUrl && plat.id ? (baseUrl.includes('{id}') ? baseUrl.replace('{id}', plat.id) : `${baseUrl}${plat.id}`) : '';

                            let faviconUrl = null;
                            if (baseUrl) {
                              try {
                                const u = new URL(baseUrl);
                                faviconUrl = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
                              } catch(e) {}
                            }

                            return (
                              <div key={idx} className="group relative bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all animate-in zoom-in-95 duration-200">
                                <button
                                  type="button"
                                  onClick={() => set('platform_identifiers', form.platform_identifiers.filter((_, i) => i !== idx))}
                                  className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                  <X size={14} />
                                </button>

                                <div className="flex items-center gap-4">
                                  {/* Avatar Icon */}
                                  <div className="w-[62px] h-[62px] shrink-0 self-end mb-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 shadow-sm overflow-hidden">
                                    {channelIcons[plat.channel_name] ? (
                                      <img 
                                        src={channelIcons[plat.channel_name]} 
                                        alt={`${plat.channel_name} icon`} 
                                        className="w-full h-full object-contain drop-shadow-sm" 
                                      />
                                    ) : faviconUrl ? (
                                      <img src={faviconUrl} alt={`${plat.channel_name} icon`} className="w-full h-full object-contain drop-shadow-sm" />
                                    ) : (
                                      <Store size={24} className="text-slate-300" />
                                    )}
                                  </div>

                                  {/* Main 2 columns: Channel & ID */}
                                  <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ecommerce Channel</label>
                                      <DynamicReferenceSelect
                                        referenceType="ECOMMERCE_CHANNEL"
                                        value={plat.channel_name}
                                        placeholder="Select Channel"
                                        onChange={(id, label) => {
                                          const next = [...form.platform_identifiers];
                                          next[idx].channel_name = label;
                                          set('platform_identifiers', next);
                                        }}
                                        disabled={!isExpanded}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identifier Value</label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          placeholder="e.g. B08N5WRWNW"
                                          value={plat.id}
                                          onChange={(e) => {
                                            const next = [...form.platform_identifiers];
                                            next[idx].id = e.target.value;
                                            set('platform_identifiers', next);
                                          }}
                                          className={cn(inputCls(false), "font-mono disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed")}
                                          disabled={!isExpanded}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-end gap-2 shrink-0 h-[62px] pb-1">
                                     {plat.id && finalUrl && (
                                       <a
                                         href={finalUrl}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                                         title="View Live Listing"
                                       >
                                         View <ExternalLink size={14} />
                                       </a>
                                     )}
                                     <button
                                       type="button"
                                       onClick={() => setExpandedPlatIdx(isExpanded ? null : idx)}
                                       className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all border", isExpanded ? "bg-slate-100 border-slate-200 text-slate-700 shadow-inner" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm")}
                                       title="Advanced Settings"
                                     >
                                       <Settings size={16} />
                                     </button>
                                  </div>
                                </div>

                                {/* Expanded Settings */}
                                {isExpanded && (
                                  <div className="mt-4 pt-4 border-t border-slate-100/60 grid grid-cols-1 sm:grid-cols-12 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="flex flex-col gap-1.5 sm:col-span-4">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Type (Metadata)</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. ASIN, FSIN, Style ID"
                                        value={plat.type}
                                        onChange={(e) => {
                                          const next = [...form.platform_identifiers];
                                          next[idx].type = e.target.value;
                                          set('platform_identifiers', next);
                                        }}
                                        className={inputCls(false)}
                                      />
                                    </div>

                                    <div className="flex flex-col gap-1.5 sm:col-span-8">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
                                         <span>Listing Base URL</span>
                                         {plat.channel_name && (
                                           <button
                                             type="button"
                                             onClick={() => handleUpdateChannelUrl(plat.channel_name, channelUrls[plat.channel_name])}
                                             className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-tighter bg-transparent border-none flex items-center gap-1"
                                           >
                                             <Globe size={10} /> Save Global URL
                                           </button>
                                         )}
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          placeholder="e.g. amazon.in/gp/product/{id}?th=1"
                                          value={channelUrls[plat.channel_name] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setChannelUrls(prev => ({ ...prev, [plat.channel_name]: val }));
                                          }}
                                          className={cn(inputCls(false), "pr-10")}
                                          disabled={!plat.channel_name}
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-300">
                                           <Link size={14} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                       </div>
                     )}
                   </div>
                 </div>
               )}

              {/* SHARED POOLS */}
              {activeTab === 'components' && (
                <div className="flex flex-col gap-6">
                  {!initialData?.id ? (
                    <div className="p-8 border-2 border-dashed border-[var(--color-border)] rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-[var(--color-foreground)]">Create Product First</p>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Linking to shared component pools is only available for existing products.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-6">

                        <div className="bg-slate-50/50 rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                        {['raw', 'package', 'label', 'sticker', 'monocarton'].map(type => {
                          const mapping = form?.product_component_group_code || [];
                          const entry = Array.isArray(mapping) ? mapping.find(m => m.type === type) : null;
                          const groupCode = entry?.id;
                          const hasDiscovery = (poolDiscovery?.[type] || []).length > 0;
                          const peers = (Array.isArray(poolInfo) ? poolInfo : []).filter(peer => {
                            const peerCodes = parsePoolMapping(peer.product_component_group_code);
                            return peerCodes.some(c => c.type === type && c.id === groupCode);
                          });

                          return (
                            <div key={type} className="bg-white hover:bg-slate-50/30 transition-all">
                              {/* --- COMPACT ROW HEADER --- */}
                              <div className="p-4 flex items-center gap-4">
                                <div className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                                  groupCode ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white border-slate-200 text-slate-400"
                                )}>
                                  {type === 'raw' && <Layers size={16} />}
                                  {type === 'package' && <Package size={16} />}
                                  {type === 'label' && <Tag size={16} />}
                                  {type === 'monocarton' && <FileText size={16} />}
                                  {type === 'sticker' && <Bookmark size={16} />}
                                </div>

                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{type}</h4>
                                    {groupCode ? (
                                      <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Shared Pool</span>
                                    ) : (
                                      <span className="text-[8px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Standalone</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                                    {groupCode ? groupCode : `Unique ID: ${form.sku_code || 'TBD'}_${type}`}
                                  </p>
                                </div>

                                {/* --- INLINE ACTIONS --- */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {!groupCode && !linkingType && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={scanningTypes.has(type)}
                                        onClick={() => fetchPoolDiscovery(type)}
                                        className="h-8 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border-none flex items-center gap-1.5"
                                      >
                                        {scanningTypes.has(type) ? <RefreshCw size={12} className="animate-spin" /> : <Compass size={12} />}
                                        <span className="text-[10px] font-bold uppercase">{scanningTypes.has(type) ? 'Scanning...' : 'Scan Synergy'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setLinkingType(type); setSearchQuery(""); setSearchResults([]); }}
                                        className="h-8 px-3 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border-none flex items-center gap-1.5"
                                      >
                                        <PlusCircle size={12} />
                                        <span className="text-[10px] font-bold uppercase">Connect</span>
                                      </button>
                                    </>
                                  )}

                                  {groupCode && !linkingType && (
                                    <>
                                      {pendingAction?.type === 'unlink' && pendingAction?.payload === type ? (
                                        <div className="flex items-center gap-1.5 animate-in zoom-in-95 duration-200">
                                          <button
                                            type="button"
                                            onClick={() => handleUnlinkComponent(type, true)}
                                            className="h-8 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all border-none text-[10px] font-black uppercase shadow-sm"
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setPendingAction(null)}
                                            className="h-8 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border-none text-[10px] font-bold uppercase"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => { setLinkingType(type); setSearchQuery(""); setSearchResults([]); }}
                                            className="h-8 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border-none flex items-center gap-1.5"
                                            title="Switch Pool"
                                          >
                                            <RefreshCw size={12} />
                                            <span className="text-[10px] font-bold uppercase">Switch</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUnlinkComponent(type)}
                                            className="h-8 px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all border-none flex items-center gap-1.5"
                                            title="Disconnect"
                                          >
                                            <Trash2 size={12} />
                                            <span className="text-[10px] font-bold uppercase">Unlink</span>
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              {/* --- EXPANDED DETAILS (PEERS OR SUGGESTIONS) --- */}
                              {(groupCode || hasDiscovery || linkingType === type) && (
                                <div className="px-4 pb-4 border-t border-slate-50 pt-3 bg-slate-50/30">
                                  {/* Suggestions List */}
                                  {hasDiscovery && !groupCode && (
                                    <div className="mb-3">
                                      <p className="text-[9px] font-black text-indigo-600/60 uppercase mb-2 ml-1 tracking-widest">Synergy Matches Found:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(poolDiscovery?.[type] || []).map(suggest => (
                                          <div key={suggest.id} className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
                                            <div className="min-w-0">
                                              <p className="text-[10px] font-black text-slate-800 truncate uppercase tracking-tight leading-none mb-0.5">{suggest.product_name}</p>
                                              <p className="text-[9px] font-mono text-indigo-50 leading-none">{suggest.sku_code || 'N/A'}</p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleLinkComponent(suggest.id)}
                                              className="h-6 px-2.5 rounded-lg bg-indigo-600 text-white text-[9px] font-bold hover:bg-indigo-700 transition-all border-none uppercase shadow-sm"
                                            >
                                              Join
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Peers List */}
                                  {groupCode && peers.length > 0 && (
                                    <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Connected Ecosystem ({peers.length}):</p>
                                      <div className="flex flex-wrap gap-2">
                                        {peers.map(peer => (
                                          <div key={peer.id} className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                            <div className="flex flex-col min-w-0">
                                              <p className="text-[9px] font-bold text-slate-700 truncate max-w-[120px] uppercase leading-none">{peer.product_name || 'Unnamed'}</p>
                                              <p className="text-[8px] font-mono text-slate-400 leading-none mt-1 uppercase tracking-tighter">{peer.sku_code || 'No SKU'}</p>
                                            </div>
                                            <span className="text-slate-200 shrink-0 ml-1">|</span>
                                            <button
                                              type="button"
                                              onClick={() => onSwitchProduct?.(peer.sku_code || peer.id)}
                                              className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 bg-transparent border-none uppercase tracking-tighter shrink-0"
                                            >
                                              View
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* --- Search Overlay --- */}
                                  {linkingType === type && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-2">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Establish Connection</h5>
                                        <button onClick={() => setLinkingType(null)} className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none">
                                          <X size={12} />
                                        </button>
                                      </div>
                                      <div className="relative group/id">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                          autoFocus
                                          type="text"
                                          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder:text-slate-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                                          placeholder="Type SKU code..."
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                        />

                                        {(searchResults || []).length > 0 && (
                                          <div className="mt-2 max-h-[150px] overflow-y-auto bg-white rounded-lg border border-slate-100 divide-y divide-slate-50 shadow-xl overflow-hidden z-[100]">
                                            {(searchResults || []).map(sku => (
                                              <button
                                                key={sku.id}
                                                type="button"
                                                onClick={() => handleLinkComponent(sku.id)}
                                                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between group border-none bg-transparent"
                                              >
                                                <div className="min-w-0 pr-4">
                                                  <p className="text-[10px] font-bold text-slate-800 truncate uppercase">{sku.product_name}</p>
                                                  <p className="text-[9px] text-slate-400 font-mono">{sku.sku_code || 'N/A'}</p>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--color-muted-foreground)] mb-2">How it works</p>
                        <ul className="text-[11px] text-[var(--color-muted-foreground)] space-y-2 list-disc pl-4">
                          <li>Linking a component creates a shared <strong>Group ID</strong> based on the target product's specs.</li>
                          <li>Example: <code>{`{uuid}_{color}_{subcategory}_{size}_raw`}</code></li>
                          <li>Any updates to the shared pool ID will propagate to all linked products.</li>
                          <li>You can un-link a component at any time to give it a unique ID or move it to another pool.</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </form>
        </div>


        {/* ── Sticky footer ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-muted)] flex-shrink-0">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {isDirty ? (
              <span className="text-amber-600 font-medium">● Unsaved changes</span>
            ) : (
              <span className="text-[var(--color-muted-foreground)]">All changes saved</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button size="sm" type="submit" form="skuForm" disabled={saving}>
              {saving ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
              ) : (
                <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Product'}</>
              )}
            </Button>
          </div>
        </div>
          </>
        )}
      </div>

    </>
  );
}
