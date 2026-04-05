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
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        destructive: "bg-red-50 text-red-700 border-red-200",
        draft: "bg-slate-100 text-slate-600 border-slate-200",
        development: "bg-violet-50 text-violet-700 border-violet-200",
      },
    },
    defaultVariants: { variant: "secondary" },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
