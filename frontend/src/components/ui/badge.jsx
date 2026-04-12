import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors border",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-white border-transparent",
        secondary: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-transparent",
        outline: "border-[var(--color-border)] text-[var(--color-foreground)] bg-transparent",
        success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        destructive: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        draft: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
        development: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
      },
    },
    defaultVariants: { variant: "secondary" },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
