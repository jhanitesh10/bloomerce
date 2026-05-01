import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Plus, Search, Filter, 
  ArrowUpRight, Download, Upload,
  ShoppingBag, RotateCcw, TrendingUp,
  FileSpreadsheet, Globe, 
  ShoppingCart, Sparkles, Package, Layers, Store, Zap, Tag, Clock, Flower2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import SalesImportSlideOver from './SalesImportSlideOver';
import { salesApi, refApi } from '../api';

const ICON_MAP = {
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'sparkles': Sparkles,
  'package': Package,
  'layers': Layers,
  'store': Store,
  'zap': Zap,
  'tag': Tag,
  'clock': Clock,
  'flower-2': Flower2,
  'globe': Globe
};

function ChannelIcon({ name, size = 12, className }) {
  if (name && (name.startsWith('http') || name.startsWith('/'))) {
    return (
      <div 
        className={cn("flex items-center justify-center overflow-hidden bg-white rounded-sm border border-slate-200/50 shadow-sm", className)} 
        style={{ width: size, height: size }}
      >
        <img src={name} alt="channel" className="w-full h-full object-contain p-0.5 opacity-80 hover:opacity-100 transition-opacity" />
      </div>
    );
  }
  const Icon = ICON_MAP[name] || Globe;
  return <Icon size={size} className={className} />;
}

export default function SalesDashboard({ isMobile }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    loadData();
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await refApi.getAll('ECOMMERCE_CHANNEL');
      setPlatforms(data);
    } catch (err) {
      console.error("Failed to load channels", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getAll();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load sales data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-foreground)] flex items-center gap-3">
             <BarChart3 className="text-[var(--color-primary)]" size={28} />
             Sales Analytics
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] font-medium mt-1">Multi-platform data ingestion and performance tracking.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             className="hidden sm:flex items-center gap-2 h-10 px-4 font-bold text-xs uppercase tracking-widest border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
           >
              <Download size={14} /> Export Report
           </Button>
           <Button 
             onClick={() => setIsImportOpen(true)}
             className="flex items-center gap-2 h-10 px-5 font-bold text-xs uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all"
           >
              <FileSpreadsheet size={16} /> Import Sales
           </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-24">
           <div className="w-10 h-10 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center bg-[var(--color-card)] rounded-[2rem] border border-[var(--color-border)] border-dashed">
           <div className="w-24 h-24 bg-[var(--color-muted)] rounded-[2rem] flex items-center justify-center text-[var(--color-muted-foreground)] mb-6 shadow-inner">
              <ShoppingBag size={42} strokeWidth={1} />
           </div>
           <div className="max-w-md">
             <h2 className="text-xl font-bold tracking-tight mb-2">Build Your Sales Engine</h2>
             <p className="text-[var(--color-muted-foreground)] text-sm mb-8 leading-relaxed font-medium">
               Import your sales reports from Amazon, Flipkart, Myntra, Nykaa, and more to start visualizing your business performance across all your ecommerce channels.
             </p>
             <div className="flex flex-wrap justify-center gap-4 mb-4">
                {platforms.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-muted)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)]/20 transition-all">
                    <ChannelIcon name={p.icon} className="opacity-70" /> {p.label}
                  </div>
                ))}
             </div>
             <Button onClick={() => setIsImportOpen(true)} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">
                Get Started
             </Button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
           <p className="text-sm font-medium text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2">System Ready</p>
           <h3 className="text-xl font-bold">{orders.length} Records Loaded</h3>
           <p className="max-w-sm text-xs text-[var(--color-muted-foreground)] mt-2">Visualization dashboards are currently being prepared to display your {orders.length} order records.</p>
           <Button onClick={() => setIsImportOpen(true)} variant="link" className="mt-4 text-[var(--color-primary)] font-bold">Import More Data</Button>
        </div>
      )}

      {isImportOpen && (
        <SalesImportSlideOver 
          onClose={() => setIsImportOpen(false)} 
          onSuccess={() => {
            setIsImportOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
