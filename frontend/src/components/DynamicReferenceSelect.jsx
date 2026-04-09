import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { refApi } from '../api';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
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
  variant = 'default' // 'default' or 'flat'
}) {
  const [options, setOptions] = useState(preloadedOptions || []);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
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
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  // Update coordinates when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
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
      <div
        ref={triggerRef}
        className={cn(
          "flex items-center justify-between w-full transition-all",
          variant === 'flat' 
            ? "bg-transparent border-none ring-0 p-0 h-full cursor-pointer" 
            : "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm cursor-pointer hover:border-[var(--color-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:border-transparent",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <span className={cn("truncate", !selectedOption && "text-[var(--color-muted-foreground)]")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown size={15} className="text-[var(--color-muted-foreground)] flex-shrink-0 ml-1" />
      </div>

      {/* Portal for Dropdown */}
      {isOpen && createPortal(
        <div 
          className="fixed z-[9999] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-100"
          style={{ 
            top: coords.top, 
            left: coords.left, 
            width: coords.width,
            marginTop: '4px'
          }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          {/* Search */}
          <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
            <input
              type="text"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-all placeholder:text-[var(--color-muted-foreground)] text-[var(--color-foreground)]"
              placeholder="Search or add new…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">Loading…</div>
            )}

            {!loading && filteredOptions.length === 0 && !showCreateOption && (
              <div className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">No options found.</div>
            )}

            {!loading && filteredOptions.map(opt => (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors",
                  value === opt.id
                    ? "bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                )}
                onClick={() => { onChange(opt.id, opt.label); setIsOpen(false); setSearch(""); }}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.id && <Check size={13} className="text-[var(--color-primary)] flex-shrink-0" />}
              </div>
            ))}

            {showCreateOption && !loading && (
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8 border-t border-[var(--color-border)] font-medium transition-colors"
                onClick={(e) => { e.stopPropagation(); handleCreate(); }}
              >
                <Plus size={13} />
                <span>Add "{search}"</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
