import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-argus-secondary/20 text-argus-secondary",
        critical: "bg-argus-critical/20 text-argus-critical animate-pulse",
        high: "bg-argus-high/20 text-argus-high",
        elevated: "bg-argus-elevated/20 text-argus-elevated",
        guarded: "bg-argus-guarded/20 text-argus-guarded",
        low: "bg-argus-low/20 text-argus-low",
        outline: "border border-argus-dark-border text-argus-dark-text",
        // Status variants
        new: "bg-blue-500/20 text-blue-400",
        analyzing: "bg-yellow-500/20 text-yellow-400",
        confirmed: "bg-red-500/20 text-red-400",
        resolved: "bg-green-500/20 text-green-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

