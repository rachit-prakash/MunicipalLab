"use client"

interface DashboardKPIsProps {
  total: number
  secondaryLabel: string
  secondaryPct: number
}

export function DashboardKPIs({ total, secondaryLabel, secondaryPct }: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total emails */}
      <div className="border border-border rounded-[var(--radius)] bg-card p-6 shadow-sm hover:bg-muted/40 transition-colors">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total emails</p>
        <p className="text-3xl font-semibold text-foreground mt-2">{total.toLocaleString()}</p>
      </div>

      {/* Secondary metric */}
      <div className="border border-border rounded-[var(--radius)] bg-card p-6 shadow-sm hover:bg-muted/40 transition-colors">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{secondaryLabel}</p>
        <p className="text-3xl font-semibold text-foreground mt-2">{secondaryPct.toFixed(0)}%</p>
      </div>
    </div>
  )
}
