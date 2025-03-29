"use client"

import type * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function AnimatedCard({ className, children, ...props }: AnimatedCardProps) {
  return (
    <Card
      className={cn(
        "bg-gray-800 border-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 animate-in fade-in-50 slide-in-from-bottom-5",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  )
}

