"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "primary"
  size?: "default" | "sm" | "lg" | "icon"
  children: React.ReactNode
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, loadingText, icon, children, ...props }, ref) => {
    return (
      <Button
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          isLoading && "cursor-not-allowed",
          variant === "primary" && "bg-purple-600 hover:bg-purple-700 text-white",
          className,
        )}
        variant={variant === "primary" ? "default" : variant}
        size={size}
        disabled={isLoading || props.disabled}
        ref={ref}
        {...props}
      >
        <span className={cn("flex items-center gap-2 transition-all duration-300", isLoading && "opacity-0")}>
          {icon && <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>}
          {children}
        </span>

        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {loadingText || "Loading..."}
          </span>
        )}
      </Button>
    )
  },
)

AnimatedButton.displayName = "AnimatedButton"

export { AnimatedButton }

