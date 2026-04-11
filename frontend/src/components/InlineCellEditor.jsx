import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import DynamicReferenceSelect from './DynamicReferenceSelect';

/**
 * Robust cell editor handling specific form factors (ComboBox, TextArea, Input)
 * to avoid data-grid CSS overflow clipping.
 */
export default function InlineCellEditor({
  col,
  sku,
  initialValue,
  onSave,
  onCancel,
  refLists,
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const containerRef = useRef(null);

  // Save handler logic
  const handleSave = () => onSave(value === '' ? null : value);
  const handleKey  = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    if (e.key === 'Enter' && !col.isContent) { e.preventDefault(); handleSave(); }
  };

  // Auto-focus input when mounted
  useEffect(() => {
    const el = containerRef.current?.querySelector('input, textarea');
    if (el) {
      el.focus();
      if (typeof el.select === 'function') el.select();
    }
  }, []);

  // Base typography to exactly match cell contents for seamless transition
  const typography = cn(
    col.isNum ? "font-semibold text-sm text-right tabular-nums" :
    col.isMono ? "font-mono text-xs text-[var(--color-foreground)]" :
    "text-sm text-[var(--color-foreground)]"
  );

  // Revised baseOuter for a seamless, "in-place" feel (no manual padding, parent td handles it)
  const baseOuter = "w-full h-full bg-transparent outline-none border-0 z-10 animate-editor-in";

  // ── 1. DROPDOWN (Combobox) ──────────────────────────────────────────────────
  if (['brand_reference_id', 'category_reference_id', 'sub_category_reference_id', 'status_reference_id', 'bundle_type', 'pack_type'].includes(col.id)) {
    const listMap = {
      'brand_reference_id': 'BRAND',
      'category_reference_id': 'CATEGORY',
      'sub_category_reference_id': 'SUB_CATEGORY',
      'status_reference_id': 'STATUS',
      'bundle_type': 'BUNDLE_TYPE',
      'pack_type': 'PACK_TYPE'
    };
    const refType = listMap[col.id];

    return (
      <div className={cn("w-full h-full relative z-10 animate-editor-in flex items-center")} ref={containerRef} onKeyDown={handleKey}>
        <div className="w-full flex items-center justify-between px-2.5 py-1.5 bg-white border border-[var(--color-primary)]/20 rounded-lg shadow-sm">
          <DynamicReferenceSelect
            referenceType={refType}
            value={value}
            preloadedOptions={refLists?.[refType] || []}
            onChange={(v, lbl) => {
              if (v !== value) {
                setValue(v);
                onSave(v);
              }
            }}
            onBlur={handleSave}
            autoOpen={true}
            variant="flat"
            placeholder={`Select ${col.label}...`}
          />
        </div>
      </div>
    );
  }

  // ── 2. LONG TEXT (Content) ──────────────────────────────────────────────────
  if (col.isContent) {
    const popOutClass = cn(
      "absolute left-[-2px] top-[-2px] w-[calc(100%+4px)] min-h-[160px] p-4 bg-[var(--color-card)] outline-none border border-[var(--color-primary)]/20 rounded-lg shadow-premium-xl z-[200] resize-y leading-relaxed animate-editor-in",
      typography
    );
    return (
      <div className="relative w-full h-full" ref={containerRef}>
         <textarea
           value={value}
           onChange={(e) => setValue(e.target.value)}
           onBlur={handleSave}
           onKeyDown={handleKey}
           className={popOutClass}
           placeholder={`Enter ${col.label}...`}
         />
      </div>
    );
  }

  // ── 3. STANDARD TEXT / NUMBER ───────────────────────────────────────────────
  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <input
        type={col.isNum ? 'number' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKey}
        className={cn(baseOuter, typography)}
      />
    </div>
  );
}
