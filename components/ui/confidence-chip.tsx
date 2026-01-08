"use client"

import { getConfidenceTone } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ConfidenceChipProps {
  confidence: number
  className?: string
}

export function ConfidenceChip({ confidence, className }: ConfidenceChipProps) {
  const tone = getConfidenceTone(confidence)
  const percentage = Math.round(confidence * 100)

  const toneStyles = {
    ok: "bg-success/10 text-success border border-success/30",
    warn: "bg-warning/10 text-warning border border-warning/30",
    danger: "bg-destructive/10 text-destructive border border-destructive/30",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {percentage}%
    </div>
  )
}
