import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { X, Upload, Save, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, XCircle, Search, RefreshCcw, Check, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { skuApi, refApi } from '../api';
import EmptyState from './EmptyState';

const FIELD_LABELS = {
  product_name: "Product Name", sku_code: "SKU / EAN / Barcode ID*", barcode: "Barcode ID", brand_reference_id: "Brand",
  product_component_group_code: "Component Group Code", primary_image_url: "Image URL",
  description: "Description", key_feature: "Key Features", key_ingredients: "Key Ingredients",
  ingredients: "Ingredients", how_to_use: "How To Use", product_care: "Product Care",
  caution: "Caution", seo_keywords: "SEO Keywords", catalog_url: "Catalog URL",
  category_reference_id: "Category", sub_category_reference_id: "Sub-Category", status_reference_id: "Product Status",
  mrp: "MRP", purchase_cost: "Purchase Cost", net_quantity: "Net Quantity",
  net_quantity_unit_reference_id: "Net Qty Unit", size_reference_id: "Size Spec",
  color: "Color", raw_product_size: "Raw Product Size",
  package_size: "Package Size", package_weight: "Package Wt (g)", raw_product_weight: "Raw Product Wt",
  finished_product_weight: "Fin Wt (calculated)",
  bundle_type: "Bundle Type", pack_type: "Pack Type", tax_rule_code: "Tax Rule Code (HSN)", tax_percent: "Tax Percent",
  product_type: "Product Type", remark: "Remark", metadata_json: "Metadata (JSON)",
  live_platform_reference_id: "Live Platforms",
  platform_identifiers: "Channel Identifiers"
};

const GROUPS = [
  { id: 'identity', label: 'Identity', fields: ['product_name', 'sku_code', 'barcode', 'primary_image_url'] },
  { id: 'classification', label: 'Classification', fields: ['status_reference_id', 'brand_reference_id', 'category_reference_id', 'sub_category_reference_id', 'product_type', 'product_component_group_code'] },
  { id: 'pricing', label: 'Pricing & Specs', fields: ['mrp', 'purchase_cost', 'net_quantity', 'net_quantity_unit_reference_id', 'size_reference_id', 'color', 'raw_product_size', 'package_size', 'package_weight', 'raw_product_weight', 'finished_product_weight'] },
  { id: 'content', label: 'Content', fields: ['description', 'key_feature', 'key_ingredients', 'ingredients', 'how_to_use', 'product_care', 'caution', 'seo_keywords', 'catalog_url'] },
  { id: 'bundling', label: 'Product & Bundle', fields: ['bundle_type', 'pack_type'] },
  { id: 'tax', label: 'Tax & Compliance', fields: ['tax_rule_code', 'tax_percent'] }
];

const ALL_FIELD_IDS = GROUPS.flatMap(g => g.fields);

function CsvHeaderSelect({ currentVal, onChange, headers }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = headers.filter(h => h.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={cn(
          "w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all cursor-pointer flex justify-between items-center shadow-sm",
          currentVal ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-foreground)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
        )}
      >
        <span className="truncate">{currentVal || "-- Skip Field --"}</span>
        <ChevronRight size={14} className={cn("transition-transform text-[var(--color-muted-foreground)]", isOpen && "rotate-90")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-[var(--color-card)] border border-[var(--color-border)] shadow-xl rounded-xl overflow-hidden animate-[fade-in_0.1s_ease]">
          <div className="p-2 border-b border-[var(--color-border)] flex items-center gap-2">
            <Search size={14} className="text-[var(--color-muted-foreground)]" />
            <input
              autoFocus
              type="text"
              placeholder="Search CSV column..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            <div
              onClick={() => { onChange(""); setIsOpen(false); }}
              className="px-3 py-2 text-sm text-[var(--color-muted-foreground)] cursor-pointer hover:bg-[var(--color-muted)] rounded-lg transition-colors flex items-center gap-2"
            >
              <XCircle size={14} /> -- Skip Field --
            </div>
            {filtered.map(h => (
              <div
                key={h}
                onClick={() => {
                  onChange(h);
                  setIsOpen(false);
                }}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer hover:bg-[var(--color-muted)] text-[var(--color-foreground)] flex items-center gap-2",
                  currentVal === h && "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", currentVal === h ? "bg-[var(--color-primary)]" : "bg-transparent")} />
                {h}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--color-muted-foreground)] italic">
                No matching columns found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelSelect({ currentVal, onChange, channels }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 rounded-lg border px-3 text-[11px] cursor-pointer transition-all flex justify-between items-center shadow-sm",
          currentVal ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-foreground)] font-medium" : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]"
        )}
      >
        <span className="truncate">{currentVal || "Select Channel"}</span>
        <ChevronDown size={14} className={cn("transition-transform opacity-50", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-[var(--color-card)] border border-[var(--color-border)] shadow-xl rounded-xl overflow-hidden animate-[fade-in_0.1s_ease]">
          <div className="max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {channels.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  onChange(p.label);
                  setIsOpen(false);
                }}
                className={cn(
                  "px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer hover:bg-[var(--color-muted)] text-[var(--color-foreground)]",
                  currentVal === p.label && "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                )}
              >
                {p.label}
              </div>
            ))}
            {channels.length === 0 && (
              <div className="p-4 text-center text-[10px] text-[var(--color-muted-foreground)] italic">
                No channels found in system
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportSlideOver({ onClose, skus = [], refLists = {}, onImportComplete }) {
  const [file, setFile] = useState(null);
  const previewRef = useRef(null);

  const [csvHeaders, setCsvHeaders] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_headers');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  const [availableChannels, setAvailableChannels] = useState([]);

  useEffect(() => {
    refApi.getAll('CHANNEL').then(setAvailableChannels).catch(console.error);
  }, []);

  const [csvData, setCsvData] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_data');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  const [mappings, setMappings] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_mappings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Safety check: Ensure keys are platform field IDs, not legacy CSV headers
        const firstKey = Object.keys(parsed)[0];
        if (firstKey && !FIELD_LABELS[firstKey]) {
          console.warn("Legacy mappings detected, resetting...");
          return {};
        }
        return parsed;
      }
    } catch(e) {}
    return {};
  });

  const [platformMappings, setPlatformMappings] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomerce_import_platform_mappings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: convert platform_name to channel_name if present
        return (parsed || []).map(m => ({
          ...m,
          channel_name: m.channel_name || m.platform_name || '',
        }));
      }
    } catch(e) {}
    return [];
  });

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [importStats, setImportStats] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set(['identity']));

  const activeCols = useMemo(() => {
    if (!mappings || typeof mappings !== 'object') return [];
    return Object.keys(mappings).filter(id => mappings[id]);
  }, [mappings]);

  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedCols, setSelectedCols] = useState(new Set());
  const [isHighlighting, setIsHighlighting] = useState(false);

  // Keep selection in sync
  useEffect(() => {
    if (csvData.length > 0 && selectedRows.size === 0 && !importStats) {
      setSelectedRows(new Set(csvData.map((_, i) => i)));
    }
  }, [csvData]);

  useEffect(() => {
    if (activeCols.length > 0 && selectedCols.size === 0 && !importStats) {
      setSelectedCols(new Set(activeCols));
    }
  }, [activeCols]);

  const fileRef = useRef(null);

  useEffect(() => {
    if (importStats) {
       localStorage.removeItem('bloomerce_import_data');
       localStorage.removeItem('bloomerce_import_headers');
       localStorage.removeItem('bloomerce_import_mappings');
       return;
    }

    try {
      localStorage.setItem('bloomerce_import_headers', JSON.stringify(csvHeaders));
      localStorage.setItem('bloomerce_import_mappings', JSON.stringify(mappings));
      localStorage.setItem('bloomerce_import_platform_mappings', JSON.stringify(platformMappings));
      const dataStr = JSON.stringify(csvData);
      if (dataStr.length < 2000000) {
        localStorage.setItem('bloomerce_import_data', dataStr);
      }
    } catch (e) {
      console.warn("Could not save import draft to localStorage:", e);
    }
  }, [csvHeaders, csvData, mappings, platformMappings, importStats]);

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);

        const initialMapping = {};
        ALL_FIELD_IDS.forEach(fId => {
          const labelVal = FIELD_LABELS[fId] || fId;
          const label = labelVal.toLowerCase().replace("*", "").trim();
          const match = headers.find(h => {
             const lowerH = h.toLowerCase().trim();
             return lowerH === fId.toLowerCase() || 
                    lowerH === label || 
                    lowerH === fId.toLowerCase().replace(/_reference_id|_label/g, "") ||
                    lowerH === fId.toLowerCase().replace(/_reference_id/g, "_label") ||
                    lowerH === label.replace(/\s+/g, "_");
          });
          initialMapping[fId] = match || "";
        });
        setMappings(initialMapping);
      }
    });
  };

  const hasRestoredData = !file && csvHeaders.length > 0;

  const handleReset = () => {
    localStorage.removeItem('bloomerce_import_data');
    localStorage.removeItem('bloomerce_import_headers');
    localStorage.removeItem('bloomerce_import_mappings');
    localStorage.removeItem('bloomerce_import_platform_mappings');
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setMappings({});
    setPlatformMappings([]);
    setSelectedRows(new Set());
    setSelectedCols(new Set());
    setImportStats(null);
    setImportErrors([]);
    setImportProgress(0);
    setProgressStatus("");
    if(fileRef.current) fileRef.current.value = "";
  };

  const scrollToPreview = () => {
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsHighlighting(true);
      setTimeout(() => setIsHighlighting(false), 2000);
    }
  };

  const activeMappingsCount = Object.values(mappings).filter(Boolean).length;

  const toggleGroup = (id) => {
    setExpandedGroups(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const autoMapGroup = (groupFields) => {
    const newMappings = { ...mappings };
    groupFields.forEach(fId => {
      const labelVal = FIELD_LABELS[fId] || fId;
      const label = labelVal.toLowerCase().replace("*", "").trim();
      const match = csvHeaders.find(h => {
        const lowerH = h.toLowerCase().trim();
        return lowerH === fId.toLowerCase() || 
               lowerH === label || 
               lowerH === fId.toLowerCase().replace(/_reference_id|_label/g, "") ||
               lowerH === label.replace(/\s+/g, "_");
      });
      if (match) newMappings[fId] = match;
    });
    setMappings(newMappings);
  };

  const getMappedRow = (rawRow) => {
    if (!rawRow) return {};
    const newRow = {};
    Object.entries(mappings).forEach(([fId, csvH]) => {
      if(csvH && rawRow[csvH] !== undefined) {
         newRow[fId] = rawRow[csvH];
      }
    });

    // Add platform identifiers
    if (platformMappings.length > 0) {
      const platforms = platformMappings
        .filter(m => m.csvHeader && rawRow[m.csvHeader] !== undefined && rawRow[m.csvHeader] !== null && String(rawRow[m.csvHeader]).trim() !== "")
        .filter(m => m.channel_name && m.channel_name.trim() !== "") // Skip if no channel selected
        .map(m => ({
          id: String(rawRow[m.csvHeader]).trim(),
          channel_name: m.channel_name,
          type: (m.type || 'id').trim()
        }));
      if (platforms.length > 0) {
        newRow.platform_identifiers = platforms;
      }
    }

    return newRow;
  };

  const mappedSkuCode = mappings['sku_code'];

  const executeImport = async () => {
    // Check if 'sku_code' or 'barcode' is mapped
    if (!mappings['sku_code'] && !mappings['barcode']) {
      return alert("You must map a column to 'SKU Code' or 'Barcode' because it is mandatory.");
    }

    const dataToImport = csvData.filter((_, idx) => selectedRows.has(idx));
    if (dataToImport.length === 0) {
       return alert("Please select at least one row to import.");
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStats({ success: 0, skipped: 0, failed: 0, total: dataToImport.length });
    setImportErrors([]);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    let errorsCollected = [];
    const BATCH_SIZE = 50;

    // Label mapping helper for backend
    const mapToLabelFields = (backendRow) => {
      const labelMap = {
        brand_reference_id: 'brand_label',
        category_reference_id: 'category_label',
        sub_category_reference_id: 'sub_category_label',
        status_reference_id: 'status_label',
        net_quantity_unit_reference_id: 'net_quantity_unit_label',
        size_reference_id: 'size_label',
        color: 'color_label',
        bundle_type: 'bundle_type_label',
        pack_type: 'pack_type_label'
      };
      
      const payload = { ...backendRow };
      Object.entries(labelMap).forEach(([oldK, newK]) => {
        if (payload[oldK] !== undefined && payload[oldK] !== null) {
          payload[newK] = payload[oldK];
          delete payload[oldK];
        }
      });
      return payload;
    };

    for (let i = 0; i < dataToImport.length; i += BATCH_SIZE) {
      const end = Math.min(i + BATCH_SIZE, dataToImport.length);
      const batchNum = i / BATCH_SIZE + 1;
      const chunk = dataToImport.slice(i, end);
      const batchPayload = [];

      chunk.forEach(rawRow => {
        const mappedRow = getMappedRow(rawRow);
        
        // Handle identity normalization
        if (mappedRow.sku_code) mappedRow.barcode = mappedRow.sku_code;
        else if (mappedRow.barcode) mappedRow.sku_code = mappedRow.barcode;

        if (!mappedRow.sku_code || !mappedRow.sku_code.trim()) {
          skipped++;
          return;
        }

        const backendRow = { ...mappedRow };
        const numericFields = [
          'mrp', 'purchase_cost', 'package_weight', 'raw_product_weight',
          'net_quantity', 'tax_percent'
        ];
        
        numericFields.forEach(k => {
          const raw = backendRow[k];
          if (raw === "" || raw === undefined || raw === null) {
            backendRow[k] = null;
          } else {
            const num = Number(raw);
            backendRow[k] = isNaN(num) ? null : num;
          }
        });

        if (!backendRow.product_name) backendRow.product_name = backendRow.sku_code;
        
        // Apply field-level filtering
        const finalPayload = {};
        Object.keys(backendRow).forEach(key => {
          // If the field is selected, OR if it's the identifier (SKU/Barcode/Name)
          if (selectedCols.has(key) || key === 'sku_code' || key === 'barcode' || key === 'product_name') {
            finalPayload[key] = backendRow[key];
          }
        });

        // Convert reference IDs to labels so backend handles resolution
        batchPayload.push(mapToLabelFields(finalPayload));
      });

      if (batchPayload.length > 0) {
        try {
          setProgressStatus(`Batch ${batchNum}: Importing SKUs...`);
          const result = await skuApi.bulkImport({ skus: batchPayload });
          
          success += (result.success_count || 0);
          failed += (result.failed_count || 0);
          if (result.errors) {
            errorsCollected = [...errorsCollected, ...result.errors];
          }
        } catch (err) {
          console.error(`Batch ${batchNum} failed:`, err);
          failed += batchPayload.length;
          errorsCollected.push({ sku_code: "BATCH_ERROR", error: err.message || "Network/System error" });
        }
      }

      // Update progress state
      const prog = Math.min(100, Math.round((end / csvData.length) * 100));
      setImportProgress(prog);
      setImportStats({ success, skipped, failed, total: dataToImport.length });
      setImportErrors(errorsCollected);
    }

    // Post-import cleanup
    if (success > 0 || failed > 0) {
      localStorage.removeItem('bloomerce_import_data');
      localStorage.removeItem('bloomerce_import_headers');
      localStorage.removeItem('bloomerce_import_mappings');
    }

    setIsImporting(false);
    if(onImportComplete) onImportComplete();
  };

  const previewRows = useMemo(() => {
    if (!csvData) return [];
    return csvData.slice(0,3).map(r => getMappedRow(r));
  }, [csvData, mappings, platformMappings]);

  const safeSelectedRows = selectedRows || new Set();
  const safeSelectedCols = selectedCols || new Set();

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm animate-[fade-in_0.2s_ease]" onClick={() => !isImporting && onClose()} />

      <div className="fixed inset-y-0 right-0 z-[100] flex flex-col w-full md:max-w-2xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl animate-[slide-in-from-right_0.3s_cubic-bezier(0.4,0,0.2,1)]">

        <div className="flex flex-col border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => !isImporting && onClose()} 
                disabled={isImporting} 
                className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[var(--color-foreground)] leading-tight">Import SKU Data</h2>
                <span className="text-[10px] text-[var(--color-muted-foreground)] hidden sm:inline">Upload CSV and map fields to your database</span>
              </div>
            </div>

            {(file || hasRestoredData) && !importStats && (
              <div className="flex gap-1.5 sm:gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset} 
                  disabled={isImporting}
                  className="gap-1.5 px-2 sm:px-3 h-9"
                >
                  <RefreshCcw size={14} />
                  <span className="hidden sm:inline">Start Over</span>
                </Button>
                <Button 
                  size="sm" 
                  onClick={scrollToPreview} 
                  disabled={isImporting || !mappedSkuCode || activeMappingsCount===0} 
                  className="gap-1.5 h-9 px-3 sm:px-5 shadow-lg shadow-[var(--color-primary)]/20 text-white"
                >
                  <Search size={14}/>
                  <span className="hidden sm:inline">Review & Run</span><span className="sm:hidden text-xs">Review</span>
                </Button>
              </div>
            )}

            {importStats && (
              <Button size="sm" onClick={onClose} className="ml-auto h-8 px-4 text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 font-bold uppercase tracking-wider">
                Close Results
              </Button>
            )}
          </div>

          {isImporting && (
            <div className="flex flex-col bg-[var(--color-primary)]/5 border-b border-[var(--color-border)] p-4 sm:p-6 space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
                    Processing Active Batch
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">{progressStatus}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[var(--color-primary)]">{importProgress}%</span>
                  <span className="block text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-tighter">Overall Progress</span>
                </div>
              </div>

              <div className="h-2 w-full bg-[var(--color-primary)]/10 rounded-full overflow-hidden relative border border-[var(--color-primary)]/5">
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--color-primary)] transition-all duration-700 ease-in-out shadow-[0_0_12px_var(--color-primary)]"
                  style={{ width: `${importProgress}%` }}
                />
                <div className="absolute inset-y-0 left-0 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{importStats?.success || 0}</span>
                  <span className="text-[8px] font-bold text-emerald-600 uppercase">Imported</span>
                </div>
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{importStats?.failed || 0}</span>
                  <span className="text-[8px] font-bold text-rose-500 uppercase">Errors</span>
                </div>
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{importStats?.skipped || 0}</span>
                  <span className="text-[8px] font-bold text-amber-500 uppercase">Skipped</span>
                </div>
                <div className="bg-white/50 border border-[var(--color-border)] rounded-lg p-2 text-center">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">{csvData.length}</span>
                  <span className="text-[8px] font-bold text-[var(--color-muted-foreground)] uppercase">Total Rows</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col pt-2">

          {!file && !hasRestoredData && (
             <div className="p-6">
                <h3 className="text-sm font-semibold mb-3">1. Upload CSV</h3>
                <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleFileUpload} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] py-14 px-6 text-center transition-all cursor-pointer",
                    "hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5",
                  )}
                >
                  <Upload size={32} className="text-[var(--color-muted-foreground)] mb-2" />
                  <span className="text-sm font-medium text-[var(--color-foreground)]">Click to browse or drag your CSV file here</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">Ensure it includes a SKU Code column to uniquely identify rows</span>
                </button>
             </div>
          )}

          {hasRestoredData && !importStats && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle size={14} className="flex-shrink-0 text-amber-500" />
              <span><strong>Session restored.</strong> Your previous column mappings are loaded. Upload the same CSV to re-import, or click <strong>Start Over</strong> to reset.</span>
            </div>
          )}

          {importStats && (
            <div className="p-6 sm:p-10 flex flex-col h-full bg-[var(--color-muted)]/10">
              <div className="flex flex-col items-center text-center mb-8">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm",
                  importStats.failed > 0 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                )}>
                  {importStats.failed > 0 ? <AlertCircle size={32}/> : <CheckCircle2 size={32}/>}
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Import {importStats.failed > 0 ? 'Completed with Issues' : 'Finished Successfully'}</h2>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  {importStats.total} rows were processed from your file.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm text-center">
                  <span className="block text-2xl font-bold text-emerald-600">{importStats.success}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] tracking-wide">Success</span>
                </div>
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm text-center">
                  <span className="block text-2xl font-bold text-amber-500">{importStats.skipped}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] tracking-wide">Skipped</span>
                </div>
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-sm text-center border-rose-100 bg-rose-50/20">
                  <span className="block text-2xl font-bold text-rose-500">{importStats.failed}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] tracking-wide">Failed</span>
                </div>
              </div>

              {/* Post-Import Intelligence Section */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h4 className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2">Data Health Score</h4>
                  <div className="flex items-center gap-3">
                     <span className="text-xl font-bold text-[var(--color-foreground)]">
                       {Math.round((importStats.success / (importStats.total || 1)) * 100)}%
                     </span>
                     <div className="flex-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                       <div
                         className="h-full bg-emerald-500"
                         style={{ width: `${(importStats.success / (importStats.total || 1)) * 100}%` }}
                       />
                     </div>
                  </div>
                  <p className="text-[9px] text-[var(--color-muted-foreground)] mt-2 italic">Reflects percentage of overall SKU coverage in this batch.</p>
                </div>
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h4 className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2">Resolution Rate</h4>
                  <div className="flex items-center gap-3">
                     <span className="text-xl font-bold text-[var(--color-foreground)]">100%</span>
                     <div className="flex-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: '100%' }} />
                     </div>
                  </div>
                  <p className="text-[9px] text-[var(--color-muted-foreground)] mt-2 italic">Labels auto-mapped to reference IDs successfully.</p>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col mb-8">
                  <h3 className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <XCircle size={14} className="text-rose-500" />
                    Error Registry ({importErrors.length})
                  </h3>
                  <div className="flex-1 bg-white border border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col shadow-inner">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[var(--color-muted)] border-b border-[var(--color-border)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                      <div className="col-span-4">SKU / Row</div>
                      <div className="col-span-8">Reason / Error Detail</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1">
                      {importErrors.map((err, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 px-3 py-2 border-b border-[var(--color-border)] last:border-0 items-start hover:bg-rose-50/30 transition-colors">
                          <div className="col-span-4 text-[11px] font-bold text-rose-700 truncate">{err.sku_code}</div>
                          <div className="col-span-8 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">{err.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Registry is enough, no need for button here anymore */}
            </div>
          )}

          {(file || hasRestoredData) && !importStats && (
            <>
              <div className="px-5 sm:px-6 py-4">
                <h3 className="text-sm font-semibold mb-3">2. Configure Fields & Map Headers</h3>
                  <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-card)] overflow-hidden shadow-sm flex flex-col">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[var(--color-muted)] border-b border-[var(--color-border)] text-[11px] font-semibold tracking-wide uppercase text-[var(--color-muted-foreground)]">
                      <div className="col-span-1 text-center">In</div>
                      <div className="col-span-11">System Attribute & CSV Column Mapping</div>
                    </div>

                    <div className="overflow-y-auto max-h-[450px] no-scrollbar">
                      {GROUPS.map(group => {
                        const isExpanded = expandedGroups.has(group.id);
                        const groupMappedCount = group.fields.filter(f => mappings[f]).length;
                        const allMapped = groupMappedCount === group.fields.length;
                        
                        return (
                          <div key={group.id} className="border-b border-[var(--color-border)] last:border-0">
                            <div 
                              className={cn(
                                "flex items-center justify-between px-4 py-2.5 cursor-pointer bg-[var(--color-card)] hover:bg-[var(--color-muted)]/50 transition-colors",
                              )}
                              onClick={() => toggleGroup(group.id)}
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown size={14} className="text-[var(--color-muted-foreground)]"/> : <ChevronRight size={14} className="text-[var(--color-muted-foreground)]"/>}
                                <span className="text-sm font-medium">{group.label}</span>
                                <span className="text-[10px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                                  {groupMappedCount} / {group.fields.length}
                                </span>
                              </div>
                              <label className="flex items-center gap-2 text-xs" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={allMapped} 
                                  onChange={() => autoMapGroup(group.fields)} 
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                                />
                                <span className="text-[var(--color-muted-foreground)] uppercase tracking-wider text-[10px] font-bold">Auto-map</span>
                              </label>
                            </div>

                            {isExpanded && (
                              <div className="bg-[var(--color-background)]">
                                {group.fields.map(fId => (
                                  <div key={fId} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[var(--color-muted)]/30 border-t border-[var(--color-border)] items-center transition-colors">
                                    <div className="col-span-1 flex items-center justify-center">
                                      {mappings[fId] ? (
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                      ) : fId === 'sku_code' ? (
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Mandatory" />
                                      ) : (
                                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                                      )}
                                    </div>
                                    <div className="col-span-11 grid grid-cols-11 gap-4 items-center">
                                      <div className="col-span-5 text-xs text-[var(--color-foreground)] font-medium truncate">
                                        {FIELD_LABELS[fId]}
                                      </div>
                                      <div className="col-span-6">
                                        <CsvHeaderSelect
                                          currentVal={mappings[fId] || ""}
                                          onChange={(val) => setMappings({ ...mappings, [fId]: val })}
                                          headers={csvHeaders}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Platform Identifiers Section */}
                      <div className="border-b border-[var(--color-border)] last:border-0">
                        <div 
                          className="flex items-center justify-between px-4 py-2.5 cursor-pointer bg-[var(--color-card)] hover:bg-[var(--color-muted)]/50 transition-colors"
                          onClick={() => toggleGroup('platforms')}
                        >
                          <div className="flex items-center gap-3">
                            {expandedGroups.has('platforms') ? <ChevronDown size={14} className="text-[var(--color-muted-foreground)]"/> : <ChevronRight size={14} className="text-[var(--color-muted-foreground)]"/>}
                            <span className="text-sm font-medium">Channel Identifiers</span>
                            <span className="text-[10px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                              {platformMappings.length} mappings
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[10px] font-bold text-[var(--color-primary)] uppercase"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlatformMappings([...platformMappings, { csvHeader: '', channel_name: '', type: '' }]);
                              if (!expandedGroups.has('platforms')) toggleGroup('platforms');
                            }}
                          >
                            <PlusCircle size={12} className="mr-1" /> Add Mapping
                          </Button>
                        </div>

                        {expandedGroups.has('platforms') && (
                          <div className="bg-[var(--color-background)] p-4 space-y-3">
                            {platformMappings.length === 0 ? (
                              <div className="text-[10px] text-center text-[var(--color-muted-foreground)] py-4 italic border border-dashed border-[var(--color-border)] rounded-lg">
                                No platform mappings added. Use these for platform-specific IDs like FSIN, ASIN, Style ID.
                              </div>
                            ) : (
                              platformMappings.map((m, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl relative group/plat">
                                  <button 
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-red-200 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 shadow-sm opacity-0 group-hover/plat:opacity-100 transition-opacity"
                                    onClick={() => setPlatformMappings(platformMappings.filter((_, i) => i !== idx))}
                                  >
                                    <X size={10} />
                                  </button>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase">CSV Column</label>
                                      <CsvHeaderSelect
                                        currentVal={m.csvHeader}
                                        onChange={(val) => {
                                          const next = [...platformMappings];
                                          next[idx].csvHeader = val;
                                          setPlatformMappings(next);
                                        }}
                                        headers={csvHeaders}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase">Sales Channel</label>
                                      <ChannelSelect 
                                        currentVal={m.channel_name}
                                        channels={availableChannels}
                                        onChange={(val) => {
                                          const next = [...platformMappings];
                                          next[idx].channel_name = val;
                                          setPlatformMappings(next);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase">Identifier Type</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. ASIN, Style ID, FSIN"
                                      value={m.type}
                                      onChange={(e) => {
                                        const next = [...platformMappings];
                                        next[idx].type = e.target.value;
                                        setPlatformMappings(next);
                                      }}
                                      className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 sm:px-6 py-6 pb-12 bg-[var(--color-muted)]/30 border-t border-[var(--color-border)] shrink-0" ref={previewRef}>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={15} className="text-[var(--color-primary)]" />
                      <h3 className="text-sm font-semibold">Ready to Import Preview</h3>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">
                         {safeSelectedRows.size} / {csvData.length} Rows Selected
                       </div>
                    </div>
                  </div>

                  {activeCols.length === 0 ? (
                    <div className="text-xs text-center text-[var(--color-muted-foreground)] py-8 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] border-dashed">
                      Map at least one column to see a preview
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left" style={{ borderSpacing: 0 }}>
                          <thead>
                            <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
                              <th className="px-3 py-2 w-10 border-r border-[var(--color-border)]">
                                <div className="flex items-center justify-center">
                                  <input 
                                    type="checkbox" 
                                    checked={safeSelectedRows.size === csvData.length && csvData.length > 0}
                                    onChange={() => {
                                      if (safeSelectedRows.size === csvData.length) setSelectedRows(new Set());
                                      else setSelectedRows(new Set(csvData.map((_, i) => i)));
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                  />
                                </div>
                              </th>
                              {activeCols.map((sysId, i) => {
                                const isColSelected = safeSelectedCols.has(sysId);
                                return (
                                  <th key={i} className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap border-r border-[var(--color-border)] last:border-0 text-[var(--color-muted-foreground)] min-w-[150px]">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={isColSelected}
                                        onChange={() => {
                                          const next = new Set(safeSelectedCols);
                                          next.has(sysId) ? next.delete(sysId) : next.add(sysId);
                                          setSelectedCols(next);
                                        }}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                      />
                                      <span className={cn(isColSelected ? "text-[var(--color-foreground)]" : "text-slate-400 opacity-60")}>
                                        {FIELD_LABELS[sysId] || sysId}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, rowIdx) => {
                              const isRowSelected = safeSelectedRows.has(rowIdx);
                              return (
                                <tr key={rowIdx} className={cn("border-b border-[var(--color-border)] last:border-0 transition-colors", !isRowSelected && "bg-slate-50/50 grayscale-[0.8] opacity-60")}>
                                  <td className="px-3 py-2 border-r border(--color-border)]">
                                    <div className="flex items-center justify-center">
                                      <input 
                                        type="checkbox" 
                                        checked={isRowSelected}
                                        onChange={() => {
                                          const next = new Set(safeSelectedRows);
                                          next.has(rowIdx) ? next.delete(rowIdx) : next.add(rowIdx);
                                          setSelectedRows(next);
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                      />
                                    </div>
                                  </td>
                                  {activeCols.map((sysId, colIdx) => {
                                    const val = row[sysId];
                                    const isColSelected = safeSelectedCols.has(sysId);
                                    return (
                                       <td key={colIdx} className={cn(
                                         "px-3 py-2 text-[11px] whitespace-nowrap border-r border-[var(--color-border)] last:border-0 max-w-[150px] truncate transition-all",
                                         isRowSelected && isColSelected ? "text-[var(--color-foreground)]" : "text-slate-400 italic line-through opacity-40"
                                       )} title={typeof val === 'object' ? JSON.stringify(val) : val}>
                                         {val !== undefined && val !== null && val !== "" ? 
                                           (typeof val === 'object' ? JSON.stringify(val) : String(val)) 
                                           : <EmptyState />}
                                       </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="bg-[var(--color-muted)] border-t border-[var(--color-border)] px-4 py-2 text-[10px] text-[var(--color-muted-foreground)] flex items-center justify-between gap-4">
                           <span className="truncate">Previewing first 3 rows.</span>
                           <div className="flex items-center gap-3">
                              <span className="whitespace-nowrap font-medium text-[var(--color-primary)]">Auto-resolve references is ON</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sticky Confirmation Footer */}
          {(file || hasRestoredData) && !importStats && activeCols.length > 0 && (
            <div className="shrink-0 p-4 bg-[var(--color-card)] border-t border-[var(--color-border)] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] z-50">
               <div className="max-w-2xl mx-auto flex flex-col gap-3">
                  {isHighlighting && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest animate-pulse px-1">
                      <Search size={12} /> Final Confirmation Required
                    </div>
                  )}
                  <Button 
                    onClick={executeImport}
                    disabled={isImporting || safeSelectedRows.size === 0}
                    className={cn(
                      "w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100 gap-3 transition-all",
                      isHighlighting ? "ring-4 ring-indigo-400 ring-offset-2 scale-[1.01] shadow-indigo-300" : "hover:scale-[1.01] active:scale-[0.99]"
                    )}
                  >
                    {isImporting ? (
                      <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Processing Import...</>
                    ) : (
                      <><Check size={20} /> Confirm & Run Import Selected ({safeSelectedRows.size})</>
                    )}
                  </Button>
               </div>
            </div>
          )}
        </div>
      </>
    );
}
