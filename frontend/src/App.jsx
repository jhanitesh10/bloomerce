import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import MasterTab from './components/MasterTab';
import SalesDashboard from './components/SalesDashboard';
import { APP_PATHS } from './config';
import {
  Layers,
  Package,
  BarChart3,
  ChevronLeft,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import './index.css';

const NAV_ITEMS = [
  { key: 'prompt', path: APP_PATHS.CATALOG, label: 'Products Master', icon: Layers, description: 'Product Information & Catalog' },
  { key: 'inventory', path: APP_PATHS.INVENTORY, label: 'Inventory Management', icon: Package, description: 'Stock & Warehouse' },
  { key: 'sales', path: APP_PATHS.SALES, label: 'Sales Analysis', icon: BarChart3, description: 'Metrics & Insights' },
];

function App() {
  const [theme, setTheme] = useState('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Hover Intent Timers
  const hoverTimer = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const sidebarWidth = (isSidebarOpen || isHovered) ? "w-[240px]" : "w-20";

  // Determine active tab based on current path
  const currentNav = NAV_ITEMS.find(item => location.pathname.startsWith(item.path));
  const activeTab = currentNav ? currentNav.key : 'prompt';

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-background)] font-sans antialiased text-[var(--color-foreground)] overflow-x-hidden">

      {/* ── Mobile Header ── */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] z-[60] flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <img src="/bloomerce_logo.svg" alt="Bloomerce" className="h-7 w-7" />
            <div className="text-[17px] font-extrabold tracking-tight leading-none">
              <span className="text-[var(--color-primary)]">Bloom</span>
              <span className="text-[var(--color-foreground)]">erce</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)] transition-all active:scale-95"
          >
            <Menu size={22} />
          </button>
        </header>
      )}

      {/* ── Sidebar Backdrop (Mobile Only) ── */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[70] animate-[fade-in_0.2s_ease]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        onMouseEnter={() => {
          if (isMobile) return;
          if (leaveTimer.current) clearTimeout(leaveTimer.current);
          hoverTimer.current = setTimeout(() => setIsHovered(true), 200);
        }}
        onMouseLeave={() => {
          if (isMobile) return;
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          leaveTimer.current = setTimeout(() => setIsHovered(false), 100);
        }}
        className={cn(
          "flex flex-col flex-shrink-0 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-xl shadow-[var(--color-shadow)]",
          isMobile
            ? cn("fixed inset-y-0 left-0 z-[80] w-[280px] transform shadow-2xl ", isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")
            : cn("fixed inset-y-0 left-0 h-full", sidebarWidth)
        )}
      >
        {/* Brand Section */}
        <div className="flex items-center justify-between px-5 py-4 min-h-[72px]">
          <div className="flex items-center gap-3 overflow-hidden ml-1" onClick={() => navigate(APP_PATHS.CATALOG)} style={{ cursor: 'pointer' }}>
            <img src="/bloomerce_logo.svg" alt="Bloomerce" className="h-9 w-9 object-contain flex-shrink-0" />
            {(isSidebarOpen || isHovered || isMobile) && (
              <div className="flex flex-col leading-tight animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="text-[19px] font-extrabold tracking-tight leading-none">
                  <span className="text-[var(--color-primary)]">Bloom</span>
                  <span className="text-[var(--color-foreground)]">erce</span>
                </div>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-sidebar-accent)] text-[var(--color-muted-foreground)]">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-2 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-1">
            {(isSidebarOpen || isHovered || isMobile) && (
              <p className="px-4 text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-2 mt-4 opacity-40 animate-in fade-in duration-300">
                Menu
              </p>
            )}
            {NAV_ITEMS.map(({ key, path, label, icon: Icon, description }) => (
              <button
                key={key}
                onClick={() => {
                  navigate(path);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left",
                  activeTab === key
                    ? "bg-[var(--color-sidebar-accent)] text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)]/40 hover:text-[var(--color-foreground)]"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-9 h-9 transition-all duration-200",
                  activeTab === key ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
                )}>
                  <Icon size={20} strokeWidth={activeTab === key ? 2.5 : 2} />
                </div>

                {(isSidebarOpen || isHovered || isMobile) && (
                  <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-[13px] font-medium tracking-tight whitespace-nowrap">{label}</span>
                    <span className="text-[10px] opacity-40 font-medium truncate max-w-[140px] text-ellipsis">{description}</span>
                  </div>
                )}

                {/* Tooltip for collapsed mode */}
                {(!isSidebarOpen && !isHovered && !isMobile) && (
                  <div className="absolute left-16 px-2 py-1 bg-[var(--color-foreground)] text-[var(--color-background)] text-[11px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                    {label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 mt-auto border-t border-[var(--color-border)]/50 space-y-1">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full",
              "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-foreground)]",
              (!isSidebarOpen && !isHovered && !isMobile) && "justify-center"
            )}
          >
            {theme === 'light'
              ? <><Moon size={18} />{(isSidebarOpen || isHovered || isMobile) && <span className="animate-in fade-in duration-300">Dark Mode</span>}</>
              : <><Sun size={18} strokeWidth={2.5} />{(isSidebarOpen || isHovered || isMobile) && <span className="animate-in fade-in duration-300">Light Mode</span>}</>
            }
          </button>

          {!isMobile && (
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
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={cn(
        "flex-1 min-w-0 flex flex-col bg-[var(--color-background)] overflow-hidden",
        isMobile ? "pt-16" : cn("transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", (isSidebarOpen || isHovered) ? "ml-[240px]" : "ml-20")
      )}>
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar",
          isMobile ? "p-4" : "p-8"
        )}>
          <Routes>
            <Route path="/" element={<Navigate to={APP_PATHS.CATALOG} replace />} />
            <Route path={APP_PATHS.CATALOG} element={<MasterTab isMobile={isMobile} />} />
            <Route path={`${APP_PATHS.CATALOG}/new`} element={<MasterTab isMobile={isMobile} forcedSkuId="new" />} />
            <Route path={`${APP_PATHS.CATALOG}/new/:activeTab`} element={<MasterTab isMobile={isMobile} forcedSkuId="new" />} />
            <Route path={`${APP_PATHS.CATALOG}/edit/:skuId`} element={<MasterTab isMobile={isMobile} />} />
            <Route path={`${APP_PATHS.CATALOG}/edit/:skuId/:activeTab`} element={<MasterTab isMobile={isMobile} />} />
            <Route path={`${APP_PATHS.CATALOG}/import`} element={<MasterTab isMobile={isMobile} forcedMode="import" />} />
            <Route path={`${APP_PATHS.CATALOG}/export`} element={<MasterTab isMobile={isMobile} forcedMode="export" />} />
            <Route path={APP_PATHS.INVENTORY} element={
              <div className="flex flex-col items-center justify-center flex-1 h-full max-w-2xl mx-auto text-center gap-4 py-12 px-6">
                <div className="w-20 h-20 bg-[var(--color-muted)] rounded-3xl flex items-center justify-center text-[var(--color-muted-foreground)]">
                  <Package size={40} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
                <p className="text-[var(--color-muted-foreground)] text-sm">We are currently building the specialized inventory control system. This will include warehouse tracking, vendor shipments, and real-time stock alerts.</p>
                <Button className="mt-2" variant="secondary">Contact Support</Button>
              </div>
            } />
            <Route path={APP_PATHS.SALES} element={<SalesDashboard isMobile={isMobile} />} />
            <Route path="*" element={<Navigate to={APP_PATHS.CATALOG} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
