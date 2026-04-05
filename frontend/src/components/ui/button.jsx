import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)] hover:shadow-md hover:-translate-y-px active:translate-y-0",
        secondary:
          "bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] shadow-xs hover:bg-[var(--color-muted)] hover:border-[var(--color-input)]",
        ghost:
          "hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
        destructive:
          "bg-[var(--color-destructive)] text-white hover:bg-red-600",
        outline:
          "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-muted)]",
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
