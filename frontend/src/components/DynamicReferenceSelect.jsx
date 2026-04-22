import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { refApi } from '../api';
import { Plus, Check, ChevronsUpDown, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DynamicReferenceSelect({
  label,
  referenceType,
  value,
  onChange,
  onBlur,
  placeholder = "Select option...",
  preloadedOptions = null,
  parentId = null,
  className,
  autoOpen = false,
  variant = 'default', // 'default' or 'flat'
  usePortal = true,
  hideTrigger = false,
  isImproved = false
}) {
  const [options, setOptions] = useState(preloadedOptions || []);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const portalRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!preloadedOptions) {
      loadOptions();
    } else {
      setOptions(preloadedOptions);
    }
  }, [referenceType, preloadedOptions]);

  const lastReportedLabel = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const isInsidePortal = portalRef.current && portalRef.current.contains(event.target);
      
      if (!isInsideTrigger && !isInsidePortal) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };

    // Use a small delay to ensure the opening click isn't caught by this listener
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onBlur]);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    let raf, timer;
    if (isOpen) {
      updateCoords();
      raf = requestAnimationFrame(updateCoords);
      timer = setTimeout(updateCoords, 50);
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Report initial label back to parent once options load, so Drive preview can populate
  // Note: We use a separate logic or ignore if it's just reporting the same value to avoid loops
  useEffect(() => {
    if (value && options.length > 0) {
      const selected = options.find(opt => Number(opt.id) === Number(value));
      if (selected && selected.label !== lastReportedLabel.current) {
        lastReportedLabel.current = selected.label;
      }
    }
  }, [options, value]);

  const loadOptions = () => {
    setLoading(true);
    refApi.getAll(referenceType).then(data => {
      setOptions(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    try {
      setLoading(true);
      const newRef = await refApi.create({
        reference_data_type: referenceType,
        label: search.trim(),
        key: `${referenceType.toLowerCase()}_${Date.now()}`,
        parent_reference_id: parentId
      });
      setOptions([...options, newRef]);
      onChange(newRef.id, newRef.label);
      setSearch("");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to create ref", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = options.filter(opt => {
    const matchesSearch = opt.label.toLowerCase().includes(search.toLowerCase());
    const matchesParent = parentId ? Number(opt.parent_reference_id) === Number(parentId) : true;
    return matchesSearch && matchesParent;
  });

  const showCreateOption = search.trim() && !options.some(
    opt => opt.label.toLowerCase() === search.trim().toLowerCase()
  );

  const selectedOption = options.find(opt => Number(opt.id) === Number(value));

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">{label}</label>
      )}

      {/* Trigger */}
      {!hideTrigger && (
        <div
          ref={triggerRef}
          className={cn(
            "flex items-center justify-between w-full transition-all",
            variant === 'flat' 
              ? "bg-transparent border-none ring-0 px-0 py-0 h-full cursor-pointer" 
              : cn(
                  "rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all focus-within:ring-2",
                  isImproved
                    ? "border-emerald-400/30 bg-transparent text-emerald-900 focus-within:ring-emerald-500/10 font-bold"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50 focus-within:ring-[var(--color-ring)] focus-within:border-transparent"
                ),
            className
          )}
          onMouseDown={() => {
            setIsOpen(!isOpen);
          }}
        >
          <span className={cn("truncate", !selectedOption && "text-[var(--color-muted-foreground)]")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown size={15} className="text-[var(--color-muted-foreground)] flex-shrink-0 ml-1" />
        </div>
      )}

      {/* Dropdown Content */}
      {isOpen && (
        usePortal ? createPortal(
          <div 
            ref={portalRef}
            className="fixed z-[10000] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col animate-dropdown-enter"
            style={{ 
              top: coords.top + 6, 
              left: coords.left, 
              width: Math.max(coords.width, 240),
              maxWidth: '400px'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {renderDropdownCore()}
          </div>,
          document.body
        ) : (
          <div 
            ref={portalRef}
            className={cn(
               "z-[1000] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col animate-dropdown-enter",
               hideTrigger ? "relative w-full border-none shadow-none" : "absolute left-0 mt-1"
            )}
            style={!hideTrigger ? { 
              top: '100%',
              width: 'max(100%, 240px)',
              maxWidth: '400px'
            } : {}}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {renderDropdownCore()}
          </div>
        )
      )}
    </div>
  );

  function renderDropdownCore() {
    return (
      <>
        {/* Search container */}
        <div className="px-3 pt-3 pb-2 w-full text-left">
          <div className="relative flex items-center group w-full">
            <SearchIcon size={14} className="absolute left-3 text-[var(--color-muted-foreground)] opacity-40 group-focus-within:text-[var(--color-primary)] transition-colors" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-muted-foreground)]/60 text-[var(--color-foreground)]"
              placeholder={`Search or add ${referenceType.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
        </div>

        {/* Options list */}
        <div className="max-h-72 overflow-y-auto custom-scrollbar p-1 w-full text-left">
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--color-muted-foreground)]">
              <div className="w-4 h-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
            </div>
          )}

          {!loading && filteredOptions.length === 0 && !showCreateOption && (
            <div className="py-10 text-center">
              <p className="text-xs text-[var(--color-muted-foreground)] px-4">No results for "{search}"</p>
            </div>
          )}

          {!loading && filteredOptions.map(opt => {
            const isSelected = Number(value) === Number(opt.id);
            return (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 text-[13px] rounded-lg cursor-pointer transition-all mx-1 mb-0.5",
                  isSelected
                    ? "bg-[var(--color-primary)]/8 text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-foreground)]/80 hover:bg-slate-50 hover:text-[var(--color-foreground)]"
                )}
                onClick={() => { onChange(opt.id, opt.label); setIsOpen(false); setSearch(""); }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="text-[var(--color-primary)] flex-shrink-0" strokeWidth={3} />}
              </div>
            );
          })}

          {showCreateOption && !loading && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 mt-1 text-[13px] cursor-pointer text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 border-t border-[var(--color-border)] font-bold transition-all"
              onClick={(e) => { e.stopPropagation(); handleCreate(); }}
            >
              <div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Plus size={12} strokeWidth={3} />
              </div>
              <span>Create new "{search}"</span>
            </div>
          )}
        </div>
      </>
    );
  }
}

