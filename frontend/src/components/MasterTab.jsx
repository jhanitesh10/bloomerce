import React, { useState, useEffect, useMemo } from 'react';
import SkuMasterForm from './SkuMasterForm';
import { skuApi, refApi } from '../api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Plus, Search, Image as ImageIcon,
  ChevronLeft, ChevronRight, ArrowUpDown, Minimize2, Maximize2, Pin, PinOff, GripVertical,
  LayoutGrid, Rocket, FileEdit, Filter, Download
} from 'lucide-react';

const STATUS_BADGE_VARIANT = {
  active: 'success',
  inactive: 'destructive',
  draft: 'draft',
  development: 'development',
  'in development': 'development',
};

function StatusBadge({ label }) {
  const key = label?.toLowerCase();
  const variant = STATUS_BADGE_VARIANT[key] || 'secondary';
  const display = key === 'in development' || key === 'development' ? 'New Launch' : label;
  return <Badge variant={variant}>{display || 'Unknown'}</Badge>;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Column definition: id = internal React key & DB field, key = stable export/import mapping identifier, label = UI display name
const ALL_COLUMNS = [
  { id: 'primary_image_url',            key: 'image_url',            label: 'Image',           width: 64,  align: 'center', sortable: false },
  { id: 'product_name',                 key: 'product_name',         label: 'Product Name',    width: 260, sortable: true },
  { id: 'sku_code',                     key: 'sku_code',             label: 'SKU Code',        width: 140, sortable: true },
  { id: 'barcode',                      key: 'barcode',              label: 'Barcode / EAN',   width: 140, sortable: true,  isMono: true },
  { id: 'product_component_group_code', key: 'group_code',           label: 'Group Code',      width: 120, sortable: true,  isMono: true },
  { id: 'brand_reference_id',           key: 'brand',                label: 'Brand',           width: 140, sortable: false },
  { id: 'category_reference_id',        key: 'category',             label: 'Category',        width: 140, sortable: false },
  { id: 'sub_category_reference_id',    key: 'sub_category',         label: 'Sub-Category',    width: 140, sortable: false },
  { id: 'status_reference_id',          key: 'status',               label: 'Status',          width: 110, sortable: false },
  { id: 'mrp',                          key: 'mrp',                  label: 'MRP (₹)',         width: 100, align: 'right', sortable: true,  isNum: true },
  { id: 'purchase_cost',                key: 'purchase_cost',        label: 'Cost (₹)',        width: 100, align: 'right', sortable: true,  isNum: true },
  { id: 'net_content',                  key: 'net_content',          label: 'Net Content',     width: 110, align: 'right', sortable: false },
  { id: 'color',                        key: 'color',                label: 'Color',           width: 120, sortable: false },
  { id: 'raw_product_size',             key: 'raw_size',             label: 'Raw Size',        width: 120, sortable: false },
  { id: 'package_size',                 key: 'package_size',         label: 'Pack Size',       width: 120, sortable: false },
  { id: 'package_weight',               key: 'package_weight_g',     label: 'Pack Wt (g)',     width: 110, align: 'right', sortable: false },
  { id: 'raw_product_weight',           key: 'raw_weight_g',         label: 'Raw Wt (g)',      width: 110, align: 'right', sortable: false },
  { id: 'finished_product_weight',      key: 'finished_weight_g',    label: 'Fin Wt (g)',      width: 110, align: 'right', sortable: false },
  { id: 'product_type',                 key: 'product_type',         label: 'Prod Type',       width: 120, sortable: false },
  { id: 'bundle_type',                  key: 'bundle_type',          label: 'Bundle Type',     width: 120, sortable: false },
  { id: 'pack_type',                    key: 'pack_type',            label: 'Pack Type',       width: 120, sortable: false },
  { id: 'tax_rule_code',                key: 'tax_rule',             label: 'Tax Rule',        width: 110, sortable: false, isMono: true },
  { id: 'tax_percent',                  key: 'tax_pct',              label: 'Tax %',           width: 90,  align: 'right', sortable: false },
  { id: 'content_trigger',              key: 'catalog_url',          label: 'Catalog URL',     width: 140, sortable: false },
  // Content columns (shown only when expanded)
  { id: 'description',                  key: 'description',          label: 'Description',     width: 240, isContent: true },
  { id: 'key_feature',                  key: 'key_features',         label: 'Key Features',    width: 240, isContent: true },
  { id: 'ingredients',                  key: 'ingredients',          label: 'Ingredients',     width: 240, isContent: true },
  { id: 'how_to_use',                   key: 'how_to_use',           label: 'How to Use',      width: 240, isContent: true },
  { id: 'product_care',                 key: 'product_care',         label: 'Product Care',    width: 240, isContent: true },
  { id: 'caution',                      key: 'caution',              label: 'Caution',         width: 240, isContent: true },
  { id: 'seo_keywords',                 key: 'seo_keywords',         label: 'SEO Keywords',    width: 180, isContent: true },
];

const FILTER_TABS = [
  { key: 'all', icon: LayoutGrid, label: (counts, total) => `All (${total})` },
  { key: 'draft', icon: FileEdit, label: (counts) => `Draft (${counts['draft'] || 0})` },
  { key: 'in development', icon: Rocket, label: (counts) => `New Launches (${counts['in development'] || counts['development'] || 0})` },
];

export default function MasterTab() {
  const [skus, setSkus] = useState([]);
  const [references, setReferences] = useState({ BRAND: {}, CATEGORY: {}, STATUS: {}, SUB_CATEGORY: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortCol, setSortCol] = useState('product_name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  const [pinnedCols, setPinnedCols] = useState(['primary_image_url', 'product_name', 'sku_code']);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [skuData, brands, cats, statuses] = await Promise.all([
        skuApi.getAll(), refApi.getAll('BRAND'), refApi.getAll('CATEGORY'), refApi.getAll('STATUS'),
      ]);
      setSkus(skuData);
      const toMap = (arr) => arr.reduce((acc, r) => ({ ...acc, [r.id]: r.label }), {});
      let subcats = [];
      try { subcats = await refApi.getAll('SUB_CATEGORY'); } catch (e) {}
      setReferences({ BRAND: toMap(brands), CATEGORY: toMap(cats), STATUS: toMap(statuses), SUB_CATEGORY: toMap(subcats) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (colId) => {
    setPinnedCols(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
  };

  const finalColumns = useMemo(() => {
    const baseCols = ALL_COLUMNS.filter(c => !c.isContent || isContentExpanded);
    const pinned = [];
    pinnedCols.forEach(pid => { const col = baseCols.find(c => c.id === pid); if (col) pinned.push(col); });
    const unpinned = baseCols.filter(c => !pinnedCols.includes(c.id));
    const merged = [...pinned, ...unpinned];
    let currentLeft = 0;
    return merged.map((col) => {
      const isPinned = pinnedCols.includes(col.id);
      const isLastPinned = isPinned && pinned.length > 0 && pinned[pinned.length - 1].id === col.id;
      const leftOffset = isPinned ? currentLeft : undefined;
      if (isPinned) currentLeft += col.width;
      return { ...col, isPinned, leftOffset, isLastPinned };
    });
  }, [pinnedCols, isContentExpanded]);

  const filtered = skus
    .filter(s => {
      const q = search.toLowerCase();
      const matches = !q || s.product_name?.toLowerCase().includes(q) || s.sku_code?.toLowerCase().includes(q) || s.barcode?.toLowerCase().includes(q);
      const statusLabel = references.STATUS[s.status_reference_id]?.toLowerCase() || '';
      const statusMatch = statusFilter === 'all' || statusLabel === statusFilter;
      return matches && statusMatch;
    })
    .sort((a, b) => {
      let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (colId) => {
    const col = ALL_COLUMNS.find(c => c.id === colId);
    if (!col?.sortable) return;
    if (sortCol === colId) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(colId); setSortDir('asc'); }
    setPage(1);
  };

  const statusCounts = skus.reduce((acc, s) => {
    const label = references.STATUS[s.status_reference_id]?.toLowerCase() || 'unknown';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const renderCell = (col, sku) => {
    const val = sku[col.id];
    switch (col.id) {
      case 'primary_image_url':
        return val
          ? <img src={val} alt="sku" className="w-9 h-9 object-cover rounded-lg border border-[var(--color-border)] mx-auto block" />
          : <div className="w-9 h-9 rounded-lg border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted-foreground)] mx-auto bg-[var(--color-muted)]"><ImageIcon size={16} /></div>;
      case 'product_name':
        return <span className="font-semibold text-[var(--color-foreground)] text-sm">{val || '—'}</span>;
      case 'sku_code':
        return <span className="font-mono text-xs bg-[var(--color-muted)] border border-[var(--color-border)] rounded-md px-1.5 py-0.5 text-[var(--color-muted-foreground)]">{val || '—'}</span>;
      case 'brand_reference_id': return <span className="text-xs text-[var(--color-muted-foreground)]">{references.BRAND[val] || '—'}</span>;
      case 'category_reference_id': return <span className="text-xs text-[var(--color-muted-foreground)]">{references.CATEGORY[val] || '—'}</span>;
      case 'sub_category_reference_id': return <span className="text-xs text-[var(--color-muted-foreground)]">{references.SUB_CATEGORY[val] || '—'}</span>;
      case 'status_reference_id': {
        const lbl = references.STATUS[val];
        return lbl ? <StatusBadge label={lbl} /> : <span className="text-xs text-[var(--color-muted-foreground)]">—</span>;
      }
      case 'net_content':
        return <span className="text-xs text-[var(--color-muted-foreground)]">{sku.net_content_value ? `${sku.net_content_value} ${sku.net_content_unit || ''}` : '—'}</span>;
      case 'tax_percent':
        return <span className="text-xs text-[var(--color-muted-foreground)]">{val != null ? `${val}%` : '—'}</span>;
      case 'content_trigger':
        return sku.catalog_url
          ? <a href={sku.catalog_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-[var(--color-primary)] underline underline-offset-2">Link ↗</a>
          : <span className="text-xs text-[var(--color-muted-foreground)]">—</span>;
      default:
        if (val == null || val === '') return <span className="text-xs text-[var(--color-muted-foreground)]">—</span>;
        if (col.isNum) return <span className="font-semibold text-sm tabular-nums">₹{Number(val).toLocaleString('en-IN')}</span>;
        if (col.isMono) return <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{val}</span>;
        if (col.isContent) return <span className="text-xs" title={val}>{val}</span>;
        return <span className="text-xs text-[var(--color-muted-foreground)]">{val}</span>;
    }
  };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce((acc, n, idx, arr) => {
      if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">Product Master</h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Double-click any row to edit.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => alert('Filter UI pending')}>
            <Filter size={14} /> Filters
          </Button>
          <Button variant="secondary" size="sm" onClick={() => alert('Exporting...')}>
            <Download size={14} /> Export
          </Button>
          <Button size="sm" onClick={() => { setEditingSku(null); setIsFormOpen(true); }}>
            <Plus size={14} /> Add Product
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center border-b border-[var(--color-border)] px-1">
          {FILTER_TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium relative transition-colors whitespace-nowrap",
                statusFilter === key
                  ? "text-[var(--color-primary)] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--color-primary)] after:rounded-t"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Icon size={14} className={statusFilter === key ? "opacity-100" : "opacity-60"} />
              {label(statusCounts, skus.length)}
            </button>
          ))}

          {/* Search — pushed right */}
          <div className="ml-auto flex items-center gap-1.5 border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-[var(--color-card)] mx-3 my-2 min-w-[220px] focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:border-transparent transition-all">
            <Search size={14} className="text-[var(--color-muted-foreground)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search product, SKU, barcode..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="border-none outline-none bg-transparent text-xs w-full text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
          <table className="w-full border-collapse text-sm" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="bg-[var(--color-muted)]">
                {finalColumns.map(col => {
                  const isContentTrigger = col.id === 'content_trigger';
                  return (
                    <th
                      key={col.id}
                      className={cn(
                        "px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] whitespace-nowrap select-none",
                        col.isPinned && "sticky z-10 bg-[var(--color-muted)]",
                        col.isLastPinned && "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]",
                        col.isContent && "bg-orange-50 text-orange-700"
                      )}
                      style={{
                        width: col.width, minWidth: col.width, maxWidth: col.width,
                        left: col.leftOffset, textAlign: col.align || 'left'
                      }}
                    >
                      <div className="flex items-start gap-1.5 w-full">
                        {!col.isContent && !isContentTrigger && (
                          <GripVertical size={13} className="text-[var(--color-border)] opacity-60 flex-shrink-0 mt-0.5" />
                        )}

                        {/* Label + Key stacked */}
                        <div
                          className={cn("flex-1 min-w-0 flex flex-col gap-0", col.sortable && "cursor-pointer")}
                          onClick={() => handleSort(col.id)}
                        >
                          <span className={cn(
                            "truncate leading-tight font-semibold text-[11px] tracking-wide uppercase",
                            col.sortable && "hover:text-[var(--color-primary)] transition-colors"
                          )}>
                            {col.label}
                            {col.sortable && sortCol === col.id && <ArrowUpDown size={10} className="inline ml-1 text-[var(--color-primary)]" />}
                            {col.sortable && sortCol !== col.id && <ArrowUpDown size={10} className="inline ml-1 opacity-20" />}
                          </span>
                          {col.key && (
                            <span className="font-mono text-[9px] text-[var(--color-muted-foreground)] opacity-70 truncate leading-tight mt-0.5">
                              {col.key}
                            </span>
                          )}
                        </div>

                        {isContentTrigger && (
                          <button
                            className="p-0.5 rounded text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors flex-shrink-0 mt-0.5"
                            onClick={e => { e.stopPropagation(); setIsContentExpanded(v => !v); }}
                            title={isContentExpanded ? "Collapse" : "Expand Content"}
                          >
                            {isContentExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                          </button>
                        )}
                        {!col.isContent && !isContentTrigger && (
                          <button
                            className={cn(
                              "p-0.5 rounded transition-all flex-shrink-0 mt-0.5",
                              col.isPinned
                                ? "opacity-100 text-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                : "opacity-0 text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)]"
                            )}
                            style={{ opacity: col.isPinned ? 1 : undefined }}
                            onClick={e => { e.stopPropagation(); togglePin(col.id); }}
                            title={col.isPinned ? `Unpin column (${col.key})` : `Pin column (${col.key})`}
                          >
                            {col.isPinned ? <Pin size={11} fill="currentColor" /> : <PinOff size={11} />}
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={finalColumns.length} className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">Loading products…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={finalColumns.length} className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">No products found. Try adjusting your filters.</td></tr>
              ) : paginated.map(sku => (
                <tr
                  key={sku.id}
                  className="bg-[var(--color-card)] hover:bg-[var(--color-muted)]/50 transition-colors cursor-default group"
                  onDoubleClick={() => { setEditingSku(sku); setIsFormOpen(true); }}
                  title="Double-click to edit"
                >
                  {finalColumns.map(col => (
                    <td
                      key={`${sku.id}-${col.id}`}
                      className={cn(
                        "px-3 py-3 border-b border-[var(--color-border)]",
                        col.isPinned && "sticky z-10 bg-[var(--color-card)]",
                        col.isLastPinned && "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]",
                        col.isContent && "bg-orange-50/60 max-w-[200px] overflow-hidden text-ellipsis"
                      )}
                      style={{
                        width: col.width, minWidth: col.width, maxWidth: col.width,
                        left: col.leftOffset, textAlign: col.align || 'left',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}
                    >
                      {renderCell(col, sku)}
                      {col.isLastPinned && <div className="edge-shadow-layer" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-[var(--color-border)] rounded-md bg-[var(--color-card)] text-[var(--color-foreground)] text-xs px-1.5 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-[var(--color-ring)]"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
            >
              <ChevronLeft size={15} />
            </button>
            {pageNums.map((n, i) =>
              n === '…'
                ? <span key={`gap-${i}`} className="px-1 text-xs text-[var(--color-muted-foreground)]">…</span>
                : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg border text-xs transition-colors",
                      page === n
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-semibold"
                        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    )}
                  >
                    {n}
                  </button>
                )
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Form Sheet */}
      {isFormOpen && (
        <SkuMasterForm
          initialData={editingSku}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); loadAll(); }}
        />
      )}
    </div>
  );
}
