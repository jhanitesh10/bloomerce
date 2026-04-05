import React, { useEffect, useState } from 'react';
import MasterTab from './components/MasterTab';
import { Box, CircleDollarSign, Package, ChevronLeft, Menu, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import './index.css';

const NAV_ITEMS = [
  { key: 'master', label: 'Product Master', icon: Box },
  { key: 'pricing', label: 'Pricing & Offers', icon: CircleDollarSign },
  { key: 'inventory', label: 'Inventory Management', icon: Package },
];

function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('master');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    <div className="flex min-h-screen w-full bg-[var(--color-background)]">
      {/* ── Sidebar ── */}
      <aside className={cn(
        "flex flex-col flex-shrink-0 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] h-screen sticky top-0 z-50 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isSidebarOpen ? "w-[240px]" : "w-16"
      )}>
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border)] min-h-[60px]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src="/boomerce_logo.svg" alt="Bloomerce" className="h-7 w-7 flex-shrink-0 object-contain rounded-md" />
            {isSidebarOpen && (
              <span className="text-sm font-bold text-[var(--color-foreground)] tracking-tight whitespace-nowrap">
                Bloomerce
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex-shrink-0 p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors border border-[var(--color-border)]"
            title={isSidebarOpen ? "Collapse" : "Expand"}
          >
            {isSidebarOpen ? <ChevronLeft size={15} /> : <Menu size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              title={!isSidebarOpen ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border border-transparent w-full text-left",
                isSidebarOpen ? "" : "justify-center",
                activeTab === key
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Icon size={16} className="flex-shrink-0" />
              {isSidebarOpen && <span className="whitespace-nowrap">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors w-full",
              !isSidebarOpen && "justify-center"
            )}
          >
            {theme === 'light'
              ? <><Moon size={15} />{isSidebarOpen && <span>Dark mode</span>}</>
              : <><Sun size={15} />{isSidebarOpen && <span>Light mode</span>}</>
            }
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 flex flex-col bg-[var(--color-background)] p-6">
        {activeTab === 'master' && <MasterTab />}
        {activeTab === 'pricing' && (
          <div className="flex items-center justify-center flex-1 text-[var(--color-muted-foreground)] text-sm">
            Pricing & Offers — Coming Soon
          </div>
        )}
        {activeTab === 'inventory' && (
          <div className="flex items-center justify-center flex-1 text-[var(--color-muted-foreground)] text-sm">
            Inventory Management — Coming Soon
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
