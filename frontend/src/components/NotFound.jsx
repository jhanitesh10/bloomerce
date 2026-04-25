import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Ghost } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_PATHS } from '../config';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center animate-in fade-in duration-700">
      {/* Decorative Element */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-32 h-32 bg-[var(--color-card)] rounded-[2.5rem] flex items-center justify-center border border-[var(--color-border)] shadow-2xl rotate-12 transition-transform hover:rotate-0 duration-500">
          <Ghost size={64} className="text-[var(--color-primary)] animate-bounce" />
        </div>
      </div>

      {/* Text Content */}
      <h1 className="text-8xl font-black tracking-tighter text-[var(--color-foreground)] mb-2 select-none">
        404
      </h1>
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] mb-4">
        Page Not Found
      </h2>
      <p className="text-[var(--color-muted-foreground)] max-w-md mx-auto mb-10 leading-relaxed">
        It seems the resource you are looking for has been moved or doesn't exist in the catalog. 
        Don't worry, even the best SKUs get lost sometimes.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button 
          onClick={() => navigate(-1)} 
          variant="outline" 
          className="gap-2 h-12 px-6 rounded-xl font-semibold border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
          Go Back
        </Button>
        <Button 
          onClick={() => navigate(APP_PATHS.CATALOG)} 
          className="gap-2 h-12 px-8 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all"
        >
          <Home size={18} />
          Return to Dashboard
        </Button>
      </div>

      {/* Subtle background detail */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-50" />
    </div>
  );
}
