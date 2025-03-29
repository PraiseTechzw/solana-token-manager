"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "idle" | "processing" | "success" | "error" | "warning"

interface TransactionStatusProps {
  status: Status
  message?: string
  className?: string
}

export function TransactionStatus({ status, message, className }: TransactionStatusProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(
      () => {
        setIsVisible(status === "processing")
      },
      status === "processing" ? 100000000 : 5000,
    )

    return () => clearTimeout(timer)
  }, [status])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-5",
        status === "processing" && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
        status === "success" && "bg-green-500/10 text-green-500 border border-green-500/20",
        status === "error" && "bg-red-500/10 text-red-500 border border-red-500/20",
        status === "warning" && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
        className,
      )}
    >
      {status === "processing" && <Loader2 className="h-5 w-5 animate-spin" />}
      {status === "success" && <CheckCircle className="h-5 w-5" />}
      {status === "error" && <XCircle className="h-5 w-5" />}
      {status === "warning" && <AlertCircle className="h-5 w-5" />}
      <span>{message || getDefaultMessage(status)}</span>
    </div>
  )
}

function getDefaultMessage(status: Status): string {
  switch (status) {
    case "processing":
      return "Transaction in progress..."
    case "success":
      return "Transaction completed successfully!"
    case "error":
      return "Transaction failed. Please try again."
    case "warning":
      return "Transaction completed with warnings."
    default:
      return ""
  }
}

