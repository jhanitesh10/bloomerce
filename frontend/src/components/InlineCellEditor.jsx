import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, Check, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DynamicReferenceSelect from './DynamicReferenceSelect';

const REF_MAP = {
  'brand_reference_id': 'BRAND',
  'category_reference_id': 'CATEGORY',
  'sub_category_reference_id': 'SUB_CATEGORY',
  'status_reference_id': 'STATUS',
  'bundle_type': 'BUNDLE_TYPE',
  'pack_type': 'PACK_TYPE',
  'net_quantity_unit_reference_id': 'NET_QUANTITY_UNIT',
  'size_reference_id': 'SIZE'
};

/**
 * Robust cell editor handling specific form factors (ComboBox, TextArea, Input)
 * to avoid data-grid CSS overflow clipping.
 */
export default function InlineCellEditor({
  col,
  initialValue,
  onSave,
  onCancel,
  refLists,
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const containerRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [rect, setRect] = useState(null);

  const isDropdown = !!REF_MAP[col.id];
  const hasChanges = value !== (initialValue ?? '');

  // Auto-focus input when mounted
  useEffect(() => {
    if (!isDropdown) {
      const el = containerRef.current?.querySelector('input, textarea');
      if (el) {
        el.focus();
        if (typeof el.select === 'function') el.select();
      }
    }
  }, [isDropdown]);

  // Handle portal positioning if needed
  useLayoutEffect(() => {
    if (col.isContent && containerRef.current) {
      const parentTd = containerRef.current.closest('td');
      if (parentTd) setRect(parentTd.getBoundingClientRect());
    }
  }, [col.isContent]);

  const handleKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    if (e.key === 'Enter' && !col.isContent && !(e.ctrlKey || e.metaKey)) { 
      e.preventDefault(); 
      onSave(value === '' ? null : value); 
    }
  };

  const handleContentSave = async () => {
    if (saving) return;
    if (!hasChanges) { onCancel(); return; }
    setSaving(true);
    await onSave(value);
    setSaving(false);
  };

  // Base typography to exactly match cell contents for seamless transition
  const typography = cn(
    col.isNum ? "font-semibold text-sm text-right tabular-nums" :
    col.isMono ? "font-mono text-xs text-[var(--color-foreground)]" :
    "text-sm text-[var(--color-foreground)]"
  );

  const baseOuter = "w-full h-full bg-transparent outline-none border-0 z-10 animate-editor-in";

  // ── 1. DROPDOWN (Reference Select) ──────────────────────────────────────────
  if (isDropdown) {
    return (
      <div className="w-full h-full flex items-center" ref={containerRef} onKeyDown={handleKey}>
        <DynamicReferenceSelect
          referenceType={REF_MAP[col.id]}
          value={value}
          preloadedOptions={refLists?.[REF_MAP[col.id]] || []}
          onChange={(v) => {
            if (v !== value) {
              setValue(v);
              onSave(v);
            }
          }}
          onBlur={() => onSave(value === '' ? null : value)}
          autoOpen={true}
          variant="flat"
          placeholder={`Select ${col.label}...`}
        />
      </div>
    );
  }

  // ── 2. LONG TEXT (Content Editor Card - Portaled) ───────────────────────────
  if (col.isContent) {
    if (!rect) return <div ref={containerRef} className="w-full h-full" />;

    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-200" 
          onClick={onCancel}
        />
        
        <div className="relative w-full max-w-[520px] bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-[var(--color-border)] overflow-hidden z-[1001] animate-[scale-in_0.2s_ease-out]">
          <div className="bg-slate-50 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
               <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
               <span className="text-[12px] font-black uppercase tracking-[0.15em] text-slate-500">Editing {col.label}</span>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors group">
              <X size={16} className="text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>

          <div className="p-6 bg-white">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${col.label}...`}
              className="w-full h-64 p-5 text-[14px] rounded-2xl border border-[var(--color-border)] bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/5 focus:border-[var(--color-primary)] transition-all resize-none text-[var(--color-foreground)] leading-relaxed placeholder:opacity-40"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleContentSave();
                if (e.key === 'Escape') onCancel();
              }}
            />

            <div className="flex items-center justify-between mt-6">
              <button 
                onClick={onCancel}
                className="text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors px-2"
              >
                Discard Changes
              </button>
              
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-slate-400 font-bold italic hidden sm:block opacity-60">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to Save
                </span>
                <Button
                  size="default"
                  onClick={handleContentSave}
                  disabled={saving}
                  className={cn(
                    "h-11 px-7 rounded-2xl font-black text-[12px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl",
                    hasChanges 
                      ? "bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/30 scale-105 active:scale-95" 
                      : "bg-slate-100 text-slate-400 shadow-none cursor-default"
                  )}
                >
                  {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Check size={18} />}
                  <span>Save {col.label}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── 3. STANDARD TEXT / NUMBER ───────────────────────────────────────────────
  return (
    <div className="w-full h-full relative flex flex-col group/editor animate-editor-in" ref={containerRef}>
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] -m-1 rounded-md border border-[var(--color-primary)]/30 shadow-sm pointer-events-none" />
      
      <input
        type={col.isNum ? 'number' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          onSave(value === '' ? null : value);
        }}
        onKeyDown={handleKey}
        autoFocus
        className={cn(
          "w-full h-full relative z-10 bg-white px-2 rounded border border-[var(--color-primary)]/40 focus:border-[var(--color-primary)] outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:ring-4 focus:ring-[var(--color-primary)]/10",
          typography
        )}
      />

      {/* Keyboard Shortcut Hint (Desktop only) */}
      <div className="absolute top-full left-0 mt-1.5 hidden group-focus-within/editor:flex flex-row items-center gap-2 px-2 py-1 bg-slate-800 text-white rounded-md text-[10px] font-bold z-[100] shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-top-1">
        <span className="flex items-center gap-1 opacity-80">
          <kbd className="bg-slate-700 px-1 rounded">Enter</kbd> to save
        </span>
        <div className="w-px h-2 bg-white/20" />
        <span className="flex items-center gap-1 opacity-80">
          <kbd className="bg-slate-700 px-1 rounded">Esc</kbd> to cancel
        </span>
      </div>
    </div>
  );
}
