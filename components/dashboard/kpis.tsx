"use client"

interface DashboardKPIsProps {
  total: number
  caseworkPct: number
}

export function DashboardKPIs({ total, caseworkPct }: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total emails */}
      <div className="border border-border rounded-lg bg-surface p-6 shadow-sm">
        <p className="text-xs font-medium text-ink-500 uppercase">Total emails</p>
        <p className="text-3xl font-semibold text-ink-900 mt-2">{total.toLocaleString()}</p>
      </div>

      {/* Casework % */}
      <div className="border border-border rounded-lg bg-surface p-6 shadow-sm">
        <p className="text-xs font-medium text-ink-500 uppercase">Casework</p>
        <p className="text-3xl font-semibold text-ink-900 mt-2">{caseworkPct}%</p>
      </div>
    </div>
  )
}
