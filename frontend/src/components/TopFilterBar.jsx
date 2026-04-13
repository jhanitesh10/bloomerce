import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Filter, ChevronDown, Search, Check, 
  ImageIcon, StickyNote, IndianRupee, Tag, 
  Layers, Package, LayoutGrid, XCircle, RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export default function TopFilterBar({ 
  filters, 
  onFilterChange, 
  onClearAll,
  references,
  refLists,
  matchCount,
  totalCount
}) {
  const isAnyFilterActive = useMemo(() => 
    filters.brandIds.length > 0 || 
    filters.categoryIds.length > 0 || 
    filters.subCategoryIds?.length > 0 ||
    filters.statusIds?.length > 0 || 
    filters.minPrice !== '' || 
    filters.maxPrice !== '' || 
    filters.hasImage !== null || 
    filters.hasNotes !== null
  , [filters]);

  if (!filters) return null;

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-3 z-[50]">
      
      {/* Row 1: Controls */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:overflow-visible sm:flex-wrap sm:pb-0 sm:mx-0 sm:px-0">
          
          {/* Brand Filter */}
          <FilterDropdown
            label="Brand"
            icon={Tag}
            options={refLists.BRAND || []}
            selectedIds={filters.brandIds}
            onChange={(ids) => onFilterChange({ brandIds: ids })}
          />

          {/* Category Filter */}
          <FilterDropdown
            label="Category"
            icon={Layers}
            options={refLists.CATEGORY || []}
            selectedIds={filters.categoryIds}
            onChange={(ids) => onFilterChange({ categoryIds: ids, subCategoryIds: [] })}
          />

          {/* Sub-Category Filter */}
          <FilterDropdown
            label="Sub-Category"
            icon={LayoutGrid}
            options={
              filters.categoryIds.length > 0 
                ? (refLists.SUB_CATEGORY || []).filter(sc => filters.categoryIds.includes(sc.parent_reference_id))
                : (refLists.SUB_CATEGORY || [])
            }
            selectedIds={filters.subCategoryIds || []}
            onChange={(ids) => onFilterChange({ subCategoryIds: ids })}
          />

          <FilterDropdown
            label="Status"
            icon={RefreshCcw}
            options={refLists.STATUS || []}
            selectedIds={filters.statusIds || []}
            onChange={(ids) => onFilterChange({ statusIds: ids })}
          />



          {/* Price Range */}
          <PriceRangeFilter 
            min={filters.minPrice}
            max={filters.maxPrice}
            onChange={(min, max) => onFilterChange({ minPrice: min, maxPrice: max })}
          />

          {/* Quality Toggles */}
          <QualityToggle 
            label="Image" 
            icon={ImageIcon}
            state={filters.hasImage}
            onClick={() => {
              const updated = filters.hasImage === null ? true : filters.hasImage === true ? false : null;
              onFilterChange({ hasImage: updated });
            }}
          />
          <QualityToggle 
            label="Notes" 
            icon={StickyNote}
            state={filters.hasNotes}
            onClick={() => {
              const updated = filters.hasNotes === null ? true : filters.hasNotes === true ? false : null;
              onFilterChange({ hasNotes: updated });
            }}
          />

          {/* Fallback Results Pill (Only if no filters active) */}
          {!isAnyFilterActive && (
            <div className="ml-auto flex items-center gap-2 px-3 h-[34px] bg-[var(--color-muted)] border border-[var(--color-border)] rounded-xl shadow-sm whitespace-nowrap">
               <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Total</span>
               <span className="text-sm font-bold text-[var(--color-primary)] tabular-nums">{totalCount}</span>
            </div>
          )}
        </div>

      {/* Row 2: Active Chips & Result Actions */}
      {isAnyFilterActive && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-[var(--color-border)]/50 animate-in fade-in slide-in-from-top-1 duration-300 gap-3">
          
          {/* Left: Active Chips */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mr-1 hidden sm:block">Active:</span>
            
            {(filters.brandIds || []).map(id => {
              const b = (refLists.BRAND || []).find(x => x.id === id);
              return b ? <ActiveChip key={`b-${id}`} label={b.label} variant="primary" onRemove={() => onFilterChange({ brandIds: filters.brandIds.filter(x => x !== id) })} /> : null;
            })}
            
            {(filters.categoryIds || []).map(id => {
              const c = (refLists.CATEGORY || []).find(x => x.id === id);
              return c ? <ActiveChip key={`c-${id}`} label={c.label} onRemove={() => onFilterChange({ categoryIds: filters.categoryIds.filter(x => x !== id) })} /> : null;
            })}

            {(filters.subCategoryIds || []).map(id => {
              const sc = (refLists.SUB_CATEGORY || []).find(x => x.id === id);
              return sc ? <ActiveChip key={`sc-${id}`} label={sc.label} onRemove={() => onFilterChange({ subCategoryIds: filters.subCategoryIds.filter(x => x !== id) })} /> : null;
            })}

            {(filters.statusIds || []).map(id => {
              const s = (refLists.STATUS || []).find(x => x.id === id);
              return s ? <ActiveChip key={`s-${id}`} label={s.label} variant="primary" onRemove={() => onFilterChange({ statusIds: filters.statusIds.filter(x => x !== id) })} /> : null;
            })}



            {(filters.minPrice || filters.maxPrice) && (
              <ActiveChip 
                label={`₹${filters.minPrice || '0'} - ${filters.maxPrice ? '₹'+filters.maxPrice : 'Max'}`} 
                onRemove={() => onFilterChange({ minPrice: '', maxPrice: '' })} 
              />
            )}

            {filters.hasImage !== null && (
              <ActiveChip label={filters.hasImage ? "Has Image" : "No Image"} onRemove={() => onFilterChange({ hasImage: null })} />
            )}

            {filters.hasNotes !== null && (
              <ActiveChip label={filters.hasNotes ? "Has Notes" : "No Notes"} onRemove={() => onFilterChange({ hasNotes: null })} />
            )}
          </div>

          {/* Right: Results & Clear */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l border-[var(--color-border)]/50 sm:ml-auto w-full sm:w-auto pt-1 sm:pt-0">
            <div className="flex items-center gap-2 px-3 h-[34px] bg-[var(--color-muted)] border border-[var(--color-border)] rounded-xl shadow-sm">
               <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Matches</span>
               <span className="text-sm font-bold text-[var(--color-primary)] tabular-nums">{matchCount}</span>
               <span className="text-[10px] font-bold text-[var(--color-muted-foreground)]/50">/ {totalCount}</span>
            </div>
            <button 
              onClick={onClearAll}
              className="group flex items-center gap-1.5 px-3 h-[34px] rounded-xl font-bold text-xs text-red-600 bg-[var(--color-card)] border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-300 transition-all shadow-sm shadow-red-500/10"
            >
              <RefreshCcw size={13} className="group-hover:-rotate-180 transition-transform duration-500 text-red-500" />
              Clear
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function FilterDropdown({ label, icon: Icon, options, selectedIds, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  // Measure position when opening or when window changes
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8, // 8px margin
        left: rect.left,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      // Also update on any scroll in the app to keep it pinned
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Also check if click is inside the portal content
        const portalContent = document.getElementById(`portal-${label}`);
        if (portalContent && portalContent.contains(e.target)) return;
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [label]);

  const filtered = useMemo(() => 
    options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  , [options, search]);

  const toggleOption = (id) => {
    const updated = selectedIds.includes(id) 
      ? selectedIds.filter(x => x !== id) 
      : [...selectedIds, id];
    onChange(updated);
  };

  const activeCount = selectedIds.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "h-[34px] px-3 rounded-xl border flex items-center gap-2 transition-all text-xs font-bold whitespace-nowrap overflow-hidden",
          activeCount > 0 
            ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]" 
            : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]/30 hover:bg-[var(--color-muted)]",
          disabled && "opacity-40 cursor-not-allowed bg-[var(--color-muted)]"
        )}
      >
        <Icon size={14} strokeWidth={2.5} />
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[var(--color-primary)] text-white text-[10px] font-black rounded-full tabular-nums">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={cn("text-[var(--color-muted-foreground)] transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && createPortal(
        <div 
          id={`portal-${label}`}
          style={{ 
            position: 'fixed', 
            top: coords.top, 
            left: coords.left,
            minWidth: '240px'
          }}
          className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top"
        >
          <div className="p-3 bg-[var(--color-muted)] border-b border-[var(--color-border)] flex items-center gap-2">
            <Search size={14} className="text-[var(--color-muted-foreground)]" />
            <input 
              autoFocus
              type="text" 
              placeholder={`Search ${label}...`}
              className="bg-transparent border-none outline-none text-xs w-full font-bold placeholder:font-normal placeholder:text-[var(--color-muted-foreground)] text-[var(--color-foreground)]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--color-muted-foreground)] italic opacity-60">No {label.toLowerCase()} found</div>
            ) : (
              filtered.map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all group mb-0.5",
                    selectedIds.includes(opt.id) ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/10" : "hover:bg-[var(--color-muted)]"
                  )}
                >
                  <span className={cn("text-xs font-bold", selectedIds.includes(opt.id) ? "text-white" : "text-[var(--color-foreground)] uppercase tracking-tight")}>
                    {opt.label}
                  </span>
                  {selectedIds.includes(opt.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
              ))
            )}
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={() => onChange([])}
              className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border-t border-red-100 dark:border-red-900/20"
            >
              Clear Selection
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}



function PriceRangeFilter({ min, max, onChange }) {
  return (
    <div className="flex items-center gap-2 px-3 h-[34px] bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)] rounded-xl group focus-within:ring-2 focus-within:ring-[var(--color-primary)]/10 focus-within:border-[var(--color-primary)]/30 focus-within:bg-[var(--color-card)] transition-all">
       <IndianRupee size={12} className="text-[var(--color-muted-foreground)]" />
       <input 
         type="number" 
         placeholder="Min"
         className="w-[42px] bg-transparent text-xs font-bold outline-none placeholder:font-normal placeholder:text-[var(--color-muted-foreground)]/50 text-[var(--color-foreground)] disabled:opacity-50"
         value={min}
         onChange={e => onChange(e.target.value, max)}
       />
       <div className="w-1.5 h-px bg-[var(--color-border)]" />
       <input 
         type="number" 
         placeholder="Max"
         className="w-14 bg-transparent text-xs font-bold outline-none placeholder:font-normal placeholder:text-[var(--color-muted-foreground)]/50 text-[var(--color-foreground)]"
         value={max}
         onChange={e => onChange(min, e.target.value)}
       />
    </div>
  );
}

function QualityToggle({ label, icon: Icon, state, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 h-[34px] rounded-xl border transition-all font-bold text-xs",
        state === true ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-sm" :
        state === false ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/20 text-red-600 shadow-sm" :
        "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]/30 hover:bg-[var(--color-muted)] opacity-80 hover:opacity-100"
      )}
    >
      <Icon size={14} className={cn("transition-transform group-hover:scale-110", state === true && "text-emerald-600", state === false && "text-red-600")} />
      <span className="text-[11px] font-bold uppercase tracking-tight">{label}</span>
      {state !== null && (
        <div className={cn(
          "absolute right-1 top-1 w-1.5 h-1.5 rounded-full border border-white",
          state === true ? "bg-emerald-500" : "bg-red-500"
        )} />
      )}
    </button>
  );
}

function ActiveChip({ label, onRemove, variant = "outline" }) {
  if (!label) return null;
  return (
    <div className={cn(
      "flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[10.5px] font-bold animate-in fade-in zoom-in-95 duration-200 border group/chip",
      variant === "primary" 
        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20" 
        : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)] shadow-sm hover:border-[var(--color-primary)]/40 transition-colors"
    )}>
      <span className="uppercase tracking-tight truncate max-w-[140px]">{label}</span>
      <button onClick={onRemove} className={cn(
        "flex items-center justify-center w-[18px] h-[18px] rounded-md transition-all active:scale-90",
        variant === "primary" 
          ? "bg-white/20 hover:bg-white text-white hover:text-[var(--color-primary)]" 
          : "bg-[var(--color-muted)] hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--color-muted-foreground)] hover:text-red-600"
      )}>
        <X size={11} strokeWidth={3} />
      </button>
    </div>
  );
}
