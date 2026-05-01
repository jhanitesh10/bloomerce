import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, X, Check, RefreshCw, AlertCircle, 
  ExternalLink, MessageSquare, ListTodo,
  ChevronRight, BrainCircuit, Plus, Link, 
  Trash2, Image as ImageIcon, Send,
  CheckCircle2, Circle, Paperclip, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import { uploadApi, skuApi } from '../api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TARGET_FIELDS = [
  { id: 'primary_title', label: 'Primary Title', group: 'Basic' },
  { id: 'alt_title', label: 'Alt Title', group: 'Basic' },
  { id: 'colour_shade', label: 'Colour / Shade', group: 'Basic' },
  { id: 'category', label: 'Category', group: 'Taxonomy' },
  { id: 'sub_category', label: 'Sub-Category', group: 'Taxonomy' },
  { id: 'description', label: 'Description', group: 'Content' },
  { id: 'key_features', label: 'Key Features', group: 'Content' },
  { id: 'key_ingredients', label: 'Key Ingredients', group: 'Content' },
  { id: 'full_ingredients', label: 'Full Ingredients', group: 'Content' },
  { id: 'how_to_use', label: 'How to Use', group: 'Usage' },
  { id: 'care_instructions', label: 'Care Instructions', group: 'Usage' },
  { id: 'cautions', label: 'Cautions', group: 'Usage' },
  { id: 'purchase_cost_est', label: 'Purchase Cost (Est)', group: 'Logistics' },
  { id: 'net_quantity', label: 'Net Quantity', group: 'Logistics' },
  { id: 'quantity_unit', label: 'Quantity Unit', group: 'Logistics' },
  { id: 'raw_weight_g', label: 'Raw Weight (g)', group: 'Logistics' },
  { id: 'package_weight_g', label: 'Package Weight (g)', group: 'Logistics' },
  { id: 'hsn_code', label: 'HSN Code', group: 'Compliance' },
  { id: 'tax_percent', label: 'Tax %', group: 'Compliance' },
  { id: 'mrp_est', label: 'MRP (Est)', group: 'Compliance' },
  { id: 'selling_price_est', label: 'Selling Price (Est)', group: 'Compliance' },
  { id: 'seo_keywords', label: 'SEO Keywords', group: 'Marketing' },
  { id: 'sku_code', label: 'SKU Code', group: 'Basic' },
  { id: 'barcode', label: 'Barcode', group: 'Basic' },
  { id: 'brand', label: 'Brand Name', group: 'Basic' }
];

const IS_IMAGE_REGEX = /\.(jpeg|jpg|gif|png|webp|bmp)$/i;

const PRESETS = [
  { label: "✨ Luxury", text: "Write in a premium, elegant, and sophisticated tone. Focus on high-end benefits and luxury appeal." },
  { label: "🔍 SEO Focus", text: "Optimize for search engines using high-volume keywords. Maintain natural readability but focus on rankable terms." },
  { label: "⚡ Conversion", text: "Write high-impact, persuasive copy focused on driving immediate purchase decisions." },
  { label: "📈 Trend-Based", text: "Use modern marketing angles and trending terminology to make it sound current and social-media ready." },
  { label: "🌿 Clean Beauty", text: "Focus on purity, safety, natural ingredients, ethical sourcing, and 'free-from' claims." }
];

export default function BloomAIConsole({ initialData, currentForm, references, initialSelectedFields, onApply, onClose }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState(() => {
    const initial = [];
    if (currentForm.primary_image_url) {
      initial.push({
        id: 'default-img',
        type: 'image',
        url: currentForm.primary_image_url,
        selected: true,
        isDefault: true,
        label: 'Product Image'
      });
    }
    return initial;
  });
  
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [showTargets, setShowTargets] = useState(false);
  
  const [selectedFields, setSelectedFields] = useState(
    initialSelectedFields || TARGET_FIELDS.map(f => f.id)
  );
  
  const [selectedChips, setSelectedChips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-detect URLs in message
  useEffect(() => {
    const urlPattern = /https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*/g;
    const matches = message.match(urlPattern) || [];
    
    if (matches.length > 0) {
      setAttachments(prev => {
        let changed = false;
        const next = [...prev];
        
        matches.forEach(url => {
          if (!next.find(a => a.url === url)) {
            const isImage = IS_IMAGE_REGEX.test(url);
            next.push({
              id: `auto-${Math.random().toString(36).substr(2, 9)}`,
              type: isImage ? 'image' : 'link',
              url: url,
              selected: true,
              isAuto: true
            });
            changed = true;
          }
        });
        
        return changed ? next : prev;
      });
    }
  }, [message]);

  const addAttachmentManually = (input) => {
    const textToScan = typeof input === 'string' ? input : newAttachmentUrl;
    if (!textToScan) return;

    const urlPattern = /https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*/g;
    const matches = textToScan.match(urlPattern) || [];

    if (matches.length > 0) {
      setAttachments(prev => {
        let next = [...prev];
        matches.forEach(url => {
          if (!next.find(a => a.url === url)) {
            const isImage = IS_IMAGE_REGEX.test(url);
            next.push({
              id: `manual-${Math.random().toString(36).substr(2, 9)}`,
              type: isImage ? 'image' : 'link',
              url: url,
              selected: true,
              label: isImage ? 'Ext Image' : 'Ext Link'
            });
          }
        });
        return next;
      });
    }
    setNewAttachmentUrl('');
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const urlPattern = /https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*/g;
    const matches = pastedText.match(urlPattern) || [];

    if (matches.length > 0) {
      // Auto-extract links if they exist in the pasted text
      addAttachmentManually(pastedText);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.url;
      setAttachments(prev => [
        ...prev,
        {
          id: `upload-${Date.now()}`,
          type: 'image',
          url: url,
          selected: true,
          label: file.name
        }
      ]);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleAttachment = (id) => {
    setAttachments(prev => prev.map(a => 
      a.id === id ? { ...a, selected: !a.selected } : a
    ));
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id || a.isDefault));
  };

  const toggleField = (id) => {
    setSelectedFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleChip = (label) => {
    setSelectedChips(prev => 
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  const handleGenerate = async () => {
    if (selectedFields.length === 0) {
      setError("Please select at least one field to generate.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const selectedLinks = attachments.filter(a => a.type === 'link' && a.selected).map(a => a.url);
      const selectedImages = attachments.filter(a => a.type === 'image' && a.selected).map(a => a.url);

      let brandLabel = initialData?.brand_name || "";
      if (currentForm.brand_reference_id && Array.isArray(references?.BRAND)) {
        const found = references.BRAND.find(b => b.id === currentForm.brand_reference_id);
        if (found) brandLabel = found.label;
      }

      let categoryLabel = initialData?.category_name || "";
      if (currentForm.category_reference_id && Array.isArray(references?.CATEGORY)) {
        const found = references.CATEGORY.find(c => c.id === currentForm.category_reference_id);
        if (found) categoryLabel = found.label;
      }

      const chipInstructions = selectedChips.map(c => PRESETS.find(p => p.label === c)?.text).filter(Boolean);
      const finalMessage = [message, ...chipInstructions].filter(Boolean).join("\n\n");

      const payload = {
        product_name: currentForm.product_name || "",
        brand: brandLabel,
        category: categoryLabel,
        reference_urls: selectedLinks,
        image_urls: selectedImages,
        message: finalMessage || null,
        chips: selectedChips,
        target_fields: selectedFields,
        existing_data: currentForm
      };

      const res = await skuApi.generateAIContent(payload);
      onApply(res);
      onClose();
    } catch (err) {
      console.error("AI Generation Error:", err);
      setError(err.response?.data?.detail || err.message || "AI failed to generate content.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white/90 backdrop-blur-3xl border-b border-indigo-500/10 shadow-2xl animate-in slide-in-from-top duration-300 overflow-hidden relative">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between px-6 py-2.5 border-b border-indigo-500/5 bg-white/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-sm">
            <Zap size={12} fill="currentColor" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600/80">Bloom AI Intelligence</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-500/10 transition-colors"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Omni-Input Box */}
          {!showTargets && (
            <div className="flex flex-col gap-0 bg-white rounded-3xl border border-indigo-500/20 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-500/40 transition-all overflow-hidden">
              <div className="relative group/inputbox">
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Describe how to bloom this product (e.g. 'Make it sound luxurious') or paste URLs..."
                  rows={2}
                  className="w-full px-5 py-4 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-[100px]"
                />
                {message && (
                  <button 
                    onClick={() => {
                      setMessage('');
                      setAttachments(prev => prev.filter(a => a.isDefault));
                    }}
                    className="absolute right-4 top-4 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/inputbox:opacity-100"
                    title="Clear Input"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-3 bg-slate-50/50 border-t border-slate-100 overflow-x-auto no-scrollbar min-h-[52px]">
                <div className="flex items-center gap-2 shrink-0 mr-1">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center justify-center shrink-0"
                  >
                    {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  </button>
                  <div className="relative group/miniurl">
                    <input 
                      type="url" 
                      placeholder="Link..."
                      className="w-20 focus:w-32 text-[10px] pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-300 transition-all shadow-sm"
                      value={newAttachmentUrl}
                      onPaste={handlePaste}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAttachmentManually()}
                    />
                    <button onClick={addAttachmentManually} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-indigo-500"><Plus size={12} /></button>
                  </div>
                </div>

                {attachments.map(item => (
                  <div key={item.id} className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer",
                    item.selected ? "bg-white border-indigo-200 shadow-sm" : "bg-slate-100/50 border-transparent opacity-50"
                  )} onClick={() => toggleAttachment(item.id)}>
                    {item.type === 'image' ? (
                      <div className="w-6 h-6 rounded-lg overflow-hidden border border-slate-200"><img src={item.url} alt="" className="w-full h-full object-cover" /></div>
                    ) : (
                      <Link size={12} className="text-indigo-500" />
                    )}
                    <span className="text-[9px] font-bold text-slate-600 max-w-[60px] truncate uppercase tracking-tighter">{item.label || 'Item'}</span>
                    {!item.isDefault && (
                      <button onClick={(e) => { e.stopPropagation(); removeAttachment(item.id); }} className="p-0.5 text-slate-300 hover:text-rose-500"><X size={10} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Style Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 shrink-0">Style:</span>
            <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map(p => {
              const isSelected = selectedChips.includes(p.label);
              return (
                <button
                  key={p.label}
                  onClick={() => toggleChip(p.label)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                    isSelected 
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-sm"
                      : "bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
            </div>
          </div>

          {/* Refine Targets Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <button 
                onClick={() => setShowTargets(!showTargets)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all",
                  showTargets ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <ListTodo size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Refine Targets ({selectedFields.length})
                </span>
                {selectedFields.length === TARGET_FIELDS.length ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] flex items-center justify-center font-bold">
                    {selectedFields.length}
                  </div>
                )}
                {showTargets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {showTargets && (
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 px-1 pb-1 border-b border-slate-200/50">
                  <button 
                    onClick={() => setSelectedFields(TARGET_FIELDS.map(f => f.id))}
                    className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Select All
                  </button>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <button 
                    onClick={() => setSelectedFields([])}
                    className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {TARGET_FIELDS.map(field => {
                    const isSelected = selectedFields.includes(field.id);
                    return (
                      <button
                        key={field.id}
                        onClick={() => toggleField(field.id)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-2",
                          isSelected 
                            ? "bg-white border-indigo-500 text-indigo-600 shadow-sm" 
                            : "bg-transparent border-slate-200 text-slate-400"
                        )}
                      >
                        {isSelected ? <Check size={12} className="shrink-0" /> : <Circle size={12} className="shrink-0 opacity-20" />}
                        <span className="truncate">{field.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4 border-t border-slate-100">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner shrink-0">
                <BrainCircuit size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Product Intelligence Engine</span>
                <span className="text-[10px] font-bold text-indigo-500">Bloom v2 · AI-Powered Analysis</span>
              </div>
            </div>
            
            <Button 
              className="w-full sm:w-auto h-14 sm:h-12 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all group shrink-0"
              onClick={handleGenerate}
              disabled={loading || selectedFields.length === 0}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Blooming...</span>
                </>
              ) : (
                <>
                  <Zap size={18} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                  <span>Analyze & Bloom</span>
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 text-rose-700 shadow-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <div className="text-xs font-bold">{error}</div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
