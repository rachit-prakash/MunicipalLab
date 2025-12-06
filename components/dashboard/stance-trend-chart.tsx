"use client"

import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"
import { useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react"

interface StanceTrendChartProps {
  trendsByTopic: Record<string, Array<{ date: string; support: number; oppose: number; neutral: number }>>
  defaultTopic?: string
}

type ChartType = 'line' | 'bar' | 'pie'
type TimeRange = '7d' | '30d' | '90d' | 'all'
type MetricType = 'count' | 'percentage'

const COLORS = {
  support: '#10b981',
  oppose: '#ef4444', 
  neutral: '#8b5cf6'
}

export function StanceTrendChart({ trendsByTopic, defaultTopic }: StanceTrendChartProps) {
  const topicKeys = Object.keys(trendsByTopic || {})
  const [selectedTopic, setSelectedTopic] = useState<string>(defaultTopic && topicKeys.includes(defaultTopic) ? defaultTopic : topicKeys[0] ?? "")
  const [chartType, setChartType] = useState<ChartType>('pie')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [metricType, setMetricType] = useState<MetricType>('count')
  
  const rawData = useMemo(() => trendsByTopic[selectedTopic] ?? [], [selectedTopic, trendsByTopic])
  
  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return rawData
    
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
    const days = daysMap[timeRange]
    
    return rawData.slice(-days)
  }, [rawData, timeRange])
  
  // Transform data based on metric type
  const data = useMemo(() => {
    if (metricType === 'count') return filteredData
    
    // Convert to percentages
    return filteredData.map(d => {
      const total = d.support + d.oppose + d.neutral
      if (total === 0) return { ...d, support: 0, oppose: 0, neutral: 0 }
      
      return {
        date: d.date,
        support: Math.round((d.support / total) * 100),
        oppose: Math.round((d.oppose / total) * 100),
        neutral: Math.round((d.neutral / total) * 100)
      }
    })
  }, [filteredData, metricType])
  
  // Prepare pie chart data (aggregate latest data)
  const pieData = useMemo(() => {
    if (data.length === 0) return []
    
    const totals = data.reduce((acc, curr) => ({
      support: acc.support + curr.support,
      oppose: acc.oppose + curr.oppose,
      neutral: acc.neutral + curr.neutral
    }), { support: 0, oppose: 0, neutral: 0 })
    
    return [
      { name: 'Support', value: totals.support, color: COLORS.support },
      { name: 'Oppose', value: totals.oppose, color: COLORS.oppose },
      { name: 'Neutral', value: totals.neutral, color: COLORS.neutral }
    ].filter(d => d.value > 0)
  }, [data])

  const chartTitle = `${selectedTopic} - ${timeRange.toUpperCase()}`
  const yAxisLabel = metricType === 'percentage' ? '%' : 'Count'

  return (
    <div className="border border-border rounded-xl bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{chartTitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">Constituent sentiment over time</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="h-8 w-8 p-0"
              title="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="h-8 w-8 p-0"
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('pie')}
              className="h-8 w-8 p-0"
              title="Pie Chart"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Topic Selector */}
          {topicKeys.length > 1 && (
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topicKeys.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Time Range Selector */}
          {chartType !== 'pie' && (
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[100px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Metric Type Selector */}
          <Select value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Area */}
      <ResponsiveContainer width="100%" height={350}>
        {chartType === 'line' ? (
          <LineChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))"
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="support" 
              stroke={COLORS.support}
              strokeWidth={3}
              dot={{ fill: COLORS.support, r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={800}
            />
            <Line 
              type="monotone" 
              dataKey="oppose" 
              stroke={COLORS.oppose}
              strokeWidth={3}
              dot={{ fill: COLORS.oppose, r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={800}
            />
            <Line 
              type="monotone" 
              dataKey="neutral" 
              stroke={COLORS.neutral}
              strokeWidth={3}
              dot={{ fill: COLORS.neutral, r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={800}
            />
          </LineChart>
        ) : chartType === 'bar' ? (
          <BarChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))"
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
            />
            <Bar dataKey="support" fill={COLORS.support} radius={[4, 4, 0, 0]} />
            <Bar dataKey="oppose" fill={COLORS.oppose} radius={[4, 4, 0, 0]} />
            <Bar dataKey="neutral" fill={COLORS.neutral} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              animationDuration={800}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--popover-foreground))"
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
            />
          </PieChart>
        )}
      </ResponsiveContainer>
      
      {/* Summary Stats */}
      {data.length > 0 && chartType !== 'pie' && (
        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.support }}>
              {data[data.length - 1].support}{metricType === 'percentage' ? '%' : ''}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Latest Support</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.oppose }}>
              {data[data.length - 1].oppose}{metricType === 'percentage' ? '%' : ''}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Latest Oppose</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.neutral }}>
              {data[data.length - 1].neutral}{metricType === 'percentage' ? '%' : ''}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Latest Neutral</div>
          </div>
        </div>
      )}
    </div>
  )
}
