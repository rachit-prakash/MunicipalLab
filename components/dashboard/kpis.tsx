"use client"

interface DashboardKPIsProps {
  total: number
  caseworkPct: number
}

export function DashboardKPIs({ total, caseworkPct }: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total emails */}
      <div className="border border-gray-200 rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total emails</p>
        <p className="text-3xl font-semibold text-gray-900 mt-2">{total.toLocaleString()}</p>
      </div>

      {/* Casework % */}
      <div className="border border-gray-200 rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Casework</p>
        <p className="text-3xl font-semibold text-gray-900 mt-2">{caseworkPct}%</p>
      </div>
    </div>
  )
}
