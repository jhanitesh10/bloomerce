import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A subtle, minimalist indicator for empty data states.
 * Replaces heavy hyphens with a premium, aesthetic dot or soft line.
 */
export default function EmptyState({ isLine = false, className }) {
  if (isLine) {
    return (
      <span className={cn("text-[var(--color-empty-text)] tracking-wider opacity-40 font-light", className)}>
        —
      </span>
    );
  }

  return (
    <div className={cn("flex items-center justify-center w-full h-full group/empty cursor-text", className)}>
       <div className={cn(
         "empty-dot transition-all duration-300",
         "group-hover/empty:scale-150 group-hover/empty:bg-[var(--color-primary)]/40"
       )} />
    </div>
  );
}
