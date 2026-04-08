import React, { useEffect, useState } from 'react';
import MasterTab from './components/MasterTab';
import {
  Sparkles,
  Package,
  BarChart3,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import './index.css';

const NAV_ITEMS = [
  { key: 'prompt', label: 'Prompt Master', icon: Sparkles, description: 'LLM & Product Logic' },
  { key: 'inventory', label: 'Inventory Management', icon: Package, description: 'Stock & Warehouse' },
  { key: 'sales', label: 'Sales Analysis', icon: BarChart3, description: 'Metrics & Insights' },
];

function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('prompt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('bloomerce-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) setTheme(savedTheme);
    else if (prefersDark) setTheme('dark');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bloomerce-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-background)] font-sans antialiased text-[var(--color-foreground)]">
      {/* ── Sidebar ── */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "flex flex-col flex-shrink-0 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] h-screen sticky top-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-xl shadow-[var(--color-shadow)]",
          (isSidebarOpen || isHovered) ? "w-[240px]" : "w-20"
        )}
      >
        {/* Brand Section */}
        <div className="flex items-center justify-between px-6 py-4 min-h-[72px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <img src="/bloomerce_logo.svg" alt="Bloomerce" className="h-7 w-7 object-contain" />
            </div>
            {(isSidebarOpen || isHovered) && (
              <div className="flex flex-col leading-tight animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="text-[17px] font-semibold tracking-tight">
                  <span className="text-[var(--color-primary)]">Bloom</span>
                  <span className="text-[var(--color-foreground)]">erce</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-2 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-1">
            {(isSidebarOpen || isHovered) && (
              <p className="px-4 text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2 mt-4 opacity-40 animate-in fade-in duration-300">
                Menu
              </p>
            )}
            {NAV_ITEMS.map(({ key, label, icon: Icon, description }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left",
                  activeTab === key
                    ? "bg-[var(--color-sidebar-accent)] text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)]/40 hover:text-[var(--color-foreground)]"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                  activeTab === key ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
                )}>
                  <Icon size={19} strokeWidth={activeTab === key ? 2 : 1.5} />
                </div>

                {(isSidebarOpen || isHovered) && (
                  <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-[13px] font-medium tracking-tight whitespace-nowrap">{label}</span>
                    <span className="text-[10px] opacity-40 font-medium truncate max-w-[140px]">{description}</span>
                  </div>
                )}

                {/* Tooltip for collapsed mode */}
                {(!isSidebarOpen && !isHovered) && (
                  <div className="absolute left-16 px-2 py-1 bg-[var(--color-foreground)] text-[var(--color-background)] text-[11px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                    {label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 mt-auto border-t border-[var(--color-border)]/50 space-y-2">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full",
              "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-foreground)]",
              (!isSidebarOpen && !isHovered) && "justify-center"
            )}
          >
            {theme === 'light'
              ? <><Moon size={18} />{(isSidebarOpen || isHovered) && <span className="animate-in fade-in duration-300">Dark Mode</span>}</>
              : <><Sun size={18} strokeWidth={2.5} />{(isSidebarOpen || isHovered) && <span className="animate-in fade-in duration-300">Light Mode</span>}</>
            }
          </button>

          <button
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full",
              "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-foreground)] border border-transparent",
              isSidebarOpen && "bg-[var(--color-sidebar-accent)]/60 border-[var(--color-border)] text-[var(--color-primary)]",
              (!isSidebarOpen && !isHovered) && "justify-center"
            )}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {(isSidebarOpen || isHovered) ? <><ChevronLeft size={18} className={cn("transition-transform duration-300", !isSidebarOpen && "rotate-180")} /><span>{isSidebarOpen ? "Pinned" : "Pin Menu"}</span></> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 flex flex-col bg-[var(--color-background)] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'prompt' && <MasterTab />}
          {activeTab === 'inventory' && (
            <div className="flex flex-col items-center justify-center flex-1 h-full max-w-2xl mx-auto text-center gap-4">
              <div className="w-20 h-20 bg-[var(--color-muted)] rounded-3xl flex items-center justify-center text-[var(--color-muted-foreground)]">
                <Package size={40} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
              <p className="text-[var(--color-muted-foreground)]">We are currently building the specialized inventory control system. This will include warehouse tracking, vendor shipments, and real-time stock alerts.</p>
              <Button className="mt-2" variant="secondary">Contact Support</Button>
            </div>
          )}
          {activeTab === 'sales' && (
            <div className="flex flex-col items-center justify-center flex-1 h-full max-w-2xl mx-auto text-center gap-4">
              <div className="w-20 h-20 bg-[var(--color-muted)] rounded-3xl flex items-center justify-center text-[var(--color-muted-foreground)]">
                <BarChart3 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">Sales Analysis</h2>
              <p className="text-[var(--color-muted-foreground)]">The analytics engine is being fine-tuned to provide deep insights into your business performance. Coming soon.</p>
              <Button className="mt-2" variant="secondary">Request Early Access</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
