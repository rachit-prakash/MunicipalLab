'use client'

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface InsightCardProps {
  title: string
  value: string | number
  insight?: string
  delay?: number
  className?: string
  children?: ReactNode
  insightTone?: "up" | "down" | "neutral" | "default"
}

export function InsightCard({
  title,
  value,
  insight,
  delay = 0,
  className,
  children,
  insightTone = "default",
}: InsightCardProps) {
  const prefersReducedMotion = useReducedMotion()

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay, ease: "easeOut" },
      }

  const hoverAnimation = prefersReducedMotion ? undefined : { y: -4 }
  const tapAnimation = prefersReducedMotion ? undefined : { scale: 0.98 }
  const insightColor =
    insightTone === "up"
      ? "text-success"
      : insightTone === "down"
        ? "text-destructive"
        : "text-muted-foreground"

  return (
    <motion.article
      data-slot="insight-card"
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm hover:bg-muted/40 transition duration-300 ease-out",
        "flex flex-col gap-2",
        className,
      )}
      {...animationProps}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{title}</div>
      <div className="text-3xl font-semibold text-foreground leading-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {insight ? <div className={cn("text-sm font-medium", insightColor)}>{insight}</div> : null}
      {children}
    </motion.article>
  )
}


