import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, X, Check, RefreshCw, AlertCircle, 
  ExternalLink, MessageSquare, ListTodo,
  ChevronRight, BrainCircuit, Plus, Link, 
  Trash2, Image as ImageIcon, Send,
  CheckCircle2, Circle, Paperclip, ChevronDown, ChevronUp
} from 'lucide-react';
import { uploadApi, skuApi } from '../api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TARGET_FIELDS = [
  { id: 'product_name', label: 'Primary Title', group: 'Basic' },
  { id: 'alternate_product_name', label: 'Alt Title', group: 'Basic' },
  { id: 'category', label: 'Category', group: 'Taxonomy' },
  { id: 'sub_category', label: 'Sub-Category', group: 'Taxonomy' },
  { id: 'description', label: 'Description', group: 'Content' },
  { id: 'key_feature', label: 'Key Features', group: 'Content' },
  { id: 'key_ingredients', label: 'Key Ingredients', group: 'Content' },
  { id: 'ingredients', label: 'Full Ingredients', group: 'Content' },
  { id: 'how_to_use', label: 'How to Use', group: 'Usage' },
  { id: 'product_care', label: 'Care Instructions', group: 'Usage' },
  { id: 'caution', label: 'Cautions', group: 'Usage' },
  { id: 'tax_rule_code', label: 'HSN Code', group: 'Compliance' },
  { id: 'tax_percent', label: 'Tax %', group: 'Compliance' },
  { id: 'seo_keywords', label: 'SEO Keywords', group: 'Marketing' }
];

const IS_IMAGE_REGEX = /\.(jpeg|jpg|gif|png|webp|bmp)$/i;

const PRESETS = [
  { label: "✨ Luxurious", text: "Make the content sound luxurious and premium. Focus on the sensory experience." },
  { label: "🌿 Organic", text: "Emphasize organic, natural, and clean beauty aspects. Focus on ingredients." },
  { label: "🔍 SEO Focus", text: "Optimize for high-intent e-commerce search keywords. Focus on visibility." },
  { label: "⚡ Short", text: "Keep it concise, punchy, and direct. Best for quick reading." }
];

export default function BloomAIConsole({ initialData, currentForm, initialSelectedFields, onApply, onClose }) {
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
  
  const [selectedFields, setSelectedFields] = useState(
    initialSelectedFields || TARGET_FIELDS.filter(f => !currentForm[f.id]).map(f => f.id)
  );
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

  const addAttachmentManually = () => {
    if (!newAttachmentUrl || !newAttachmentUrl.startsWith('http')) return;
    if (attachments.find(a => a.url === newAttachmentUrl)) {
      setNewAttachmentUrl('');
      return;
    }
    
    const isImage = IS_IMAGE_REGEX.test(newAttachmentUrl);
    setAttachments([
      ...attachments,
      {
        id: `manual-${Date.now()}`,
        type: isImage ? 'image' : 'link',
        url: newAttachmentUrl,
        selected: true
      }
    ]);
    setNewAttachmentUrl('');
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

      const payload = {
        product_name: currentForm.product_name || "New Product",
        brand: initialData?.brand_name || "Bloom Botanics",
        category: initialData?.category_name || "Beauty",
        reference_urls: selectedLinks,
        image_urls: selectedImages,
        message: message || null,
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

  const groupNames = [...new Set(TARGET_FIELDS.map(f => f.group))];

  return (
    <div className="w-full bg-white/40 backdrop-blur-3xl border-b border-indigo-500/20 shadow-2xl animate-in slide-in-from-top duration-300 overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mini Toggle Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-indigo-500/10 bg-white/50">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-indigo-500" fill="currentColor" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800/60">Bloom AI Intelligence</span>
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
        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Instructions & Attachments (Span 12) */}
            <div className="lg:col-span-12 flex flex-col gap-5">
              <div className="flex flex-col md:flex-row gap-5 items-center">
                <div className="flex-1 w-full bg-white rounded-3xl p-1 border border-indigo-500/20 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how to bloom this product (e.g. 'Make it sound luxurious, focus on organic rose') or paste URLs..."
                    rows={2}
                    className="w-full px-5 py-4 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-[80px]"
                  />
                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-300 mr-1 shrink-0">Quick Bloom:</span>
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => setMessage(p.text)}
                        className="px-2 py-1 rounded-lg text-[9px] font-bold bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 shrink-0"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="shrink-0">
                  <Button 
                    className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-3 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all group"
                    onClick={handleGenerate}
                    disabled={loading || selectedFields.length === 0}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        <span className="text-xs uppercase tracking-widest">Blooming...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm uppercase tracking-wider">Analyze & Bloom</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Attachment Dock */}
              <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar px-1">
                <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-indigo-500/10">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-3 rounded-2xl bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm shrink-0"
                    title="Upload Image"
                  >
                    {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Paperclip size={16} />}
                  </button>
                  <div className="relative group/input">
                    <input 
                      type="url" 
                      placeholder="Paste link..."
                      className="text-[10px] pl-4 pr-10 py-3 bg-white border border-indigo-100 rounded-2xl outline-none focus:border-indigo-400 w-36 transition-all shadow-sm"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAttachmentManually()}
                    />
                    <button 
                      onClick={addAttachmentManually}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {attachments.map(item => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-2xl border transition-all shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer",
                        item.selected 
                          ? "bg-white border-indigo-400 shadow-md ring-1 ring-indigo-500/10" 
                          : "bg-slate-50/50 border-slate-100 grayscale opacity-40 hover:grayscale-0 hover:opacity-100"
                      )}
                      onClick={() => toggleAttachment(item.id)}
                    >
                      <div className={cn("shrink-0", item.selected ? "text-indigo-500" : "text-slate-300")}>
                        {item.selected ? <CheckCircle2 size={14} fill="currentColor" className="text-indigo-500 fill-white" /> : <Circle size={14} />}
                      </div>
                      {item.type === 'image' ? (
                        <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm"><img src={item.url} alt="" className="w-full h-full object-cover" /></div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm"><Link size={12} /></div>
                      )}
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="text-[10px] font-black text-slate-700 truncate max-w-[100px] leading-tight">{item.label || (item.type === 'image' ? 'Image' : 'Link')}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{item.isAuto ? 'Auto' : 'Manual'}</span>
                      </div>
                      {!item.isDefault && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeAttachment(item.id); }} 
                          className="p-1 rounded-full text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Selection Area (Span 12) */}
            <div className="lg:col-span-12 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-2">
                  <ListTodo size={12} className="text-indigo-600/50" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Attributes</span>
                </div>
                <button 
                  onClick={() => setSelectedFields(selectedFields.length === TARGET_FIELDS.length ? [] : TARGET_FIELDS.map(f => f.id))}
                  className="text-[9px] font-bold text-indigo-600/70 hover:text-indigo-600 transition-colors uppercase tracking-tight"
                >
                  {selectedFields.length === TARGET_FIELDS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {TARGET_FIELDS.map(field => {
                  const isSelected = selectedFields.includes(field.id);
                  const hasValue = !!currentForm[field.id];
                  return (
                    <button
                      key={field.id}
                      onClick={() => toggleField(field.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-2xl text-[10px] font-bold transition-all border flex items-center gap-2 relative",
                        isSelected 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                      )}
                    >
                      {isSelected ? <CheckCircle2 size={12} fill="white" className="text-indigo-600" /> : <Circle size={12} className="opacity-20" />}
                      {field.label}
                      {hasValue && !isSelected && (
                        <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_4px_rgba(79, 70, 229, 0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Messages Row */}
          {error && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex gap-3 text-rose-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <div className="text-[11px] font-bold">{error}</div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
