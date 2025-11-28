"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useMemo, useState } from "react"

interface StanceTrendChartProps {
  trendsByTopic: Record<string, Array<{ date: string; support: number; oppose: number; neutral: number }>>
  defaultTopic?: string
}

export function StanceTrendChart({ trendsByTopic, defaultTopic }: StanceTrendChartProps) {
  const topicKeys = Object.keys(trendsByTopic || {})
  const [selectedTopic, setSelectedTopic] = useState<string>(defaultTopic && topicKeys.includes(defaultTopic) ? defaultTopic : topicKeys[0] ?? "")
  const data = useMemo(() => trendsByTopic[selectedTopic] ?? [], [selectedTopic, trendsByTopic])

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Support vs. oppose 30d</h3>
        {topicKeys.length > 0 ? (
          <select
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            {topicKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="support" stroke="#4f77c6" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="oppose" stroke="#2fb6bc" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="neutral" stroke="#7a6ff0" strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
