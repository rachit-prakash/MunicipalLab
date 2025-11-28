"use client"

import { Info } from "lucide-react"
import { districtPulseSnapshot, type DistrictPulseData, type PriorityMeta, type TrustMetaWindow, type TriggerMeta, type DigestMeta } from "@/data/district-pulse"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type DistrictPulseSectionProps = {
  data?: DistrictPulseData
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatDateRange(start: string, end: string) {
  const startDate = dateFormatter.format(new Date(start))
  const endDate = dateFormatter.format(new Date(end))
  return `${startDate}–${endDate}`
}

function formatPercent(decimal: number) {
  return `${Math.round(decimal * 100)}%`
}

function formatSigned(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value}`
}

function formatSentiment(value: number) {
  const rounded = Math.round(value * 100) / 100
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)}`
}

function getTopConcernsTrust(meta: TrustMetaWindow) {
  return [
    `Based on ${meta.sampleSize.toLocaleString()} resident emails between ${formatDateRange(meta.windowStart, meta.windowEnd)}.`,
    `Covers ${formatPercent(meta.coveragePct)} of tagged issue emails this week.`,
    meta.trendSummary ? `Trend: ${meta.trendSummary}` : null,
  ].filter(Boolean) as string[]
}

function getPriorityTrust(meta: PriorityMeta) {
  return [
    "Tagged as “priority” based on:",
    ...meta.signals.map((signal) => `• ${signal}`),
    `Rules used: ${meta.rulesUsed.join(", ")}`,
  ]
}

function getTriggerTrust(meta: TriggerMeta, polarity: "positive" | "negative") {
  const sentimentDescriptor = polarity === "negative" ? `≤ ${meta.sentimentThreshold}` : `≥ ${meta.sentimentThreshold}`
  const audience = polarity === "negative" ? "negative emails" : "positive emails"
  return [
    `Built from ${meta.sampleSize.toLocaleString()} ${audience} this week.`,
    `Includes phrases in ${meta.minFrequency}+ emails with avg sentiment ${sentimentDescriptor}.`,
    meta.calibrationNotes,
  ]
}

function getDigestTrust(meta: DigestMeta) {
  return [
    `Generated from ${meta.emailsAnalyzed.toLocaleString()} emails (${formatPercent(meta.coveragePct)} coverage).`,
    `Window: ${formatDateRange(meta.windowStart, meta.windowEnd)}.`,
    `Source metrics: ${meta.sourceMetrics.join(", ")}.`,
    meta.focus,
  ]
}

type TrustIndicatorProps = {
  title: string
  lines: string[]
}

function TrustIndicator({ title, lines }: TrustIndicatorProps) {
  if (!lines.length) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Trust indicators for ${title}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8} className="max-w-xs text-left">
        <p className="font-semibold text-sm">{title}</p>
        <ul className="mt-1 space-y-1 text-xs leading-snug">
          {lines.map((line, idx) => (
            <li key={`${title}-${idx}`}>{line}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

export function DistrictPulseSection({ data = districtPulseSnapshot }: DistrictPulseSectionProps) {
  const updatedAt = timeFormatter.format(new Date(data.updatedAt))
  const topConcernsTrust = getTopConcernsTrust(data.topConcerns.meta)
  const priorityTrust = getPriorityTrust(data.priorityCases.meta)
  const negTrust = getTriggerTrust(data.negativeTriggers.meta, "negative")
  const posTrust = getTriggerTrust(data.positiveTriggers.meta, "positive")
  const digestTrust = getDigestTrust(data.digest.meta)

  return (
    <section className="border border-gray-200 rounded-2xl bg-white/60 p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">District Pulse</p>
          <h2 className="text-2xl font-semibold text-gray-900">District Pulse</h2>
          <p className="text-sm text-gray-600">Updated every 24 hours</p>
        </div>
        <p className="text-xs text-gray-500">Last refreshed {updatedAt} ET</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-0">
            <div>
              <CardTitle className="text-base">Top 3 Concerns This Week</CardTitle>
              <CardDescription>Share of inbox volume by topic</CardDescription>
            </div>
            <CardAction>
              <TrustIndicator title="Top concerns" lines={topConcernsTrust} />
            </CardAction>
          </CardHeader>
          <CardContent className="mt-4 space-y-3">
            {data.topConcerns.data.map((concern) => (
              <div key={concern.label} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{concern.label}</p>
                  <p className="text-xs text-gray-500">{formatSigned(concern.deltaVsLastWeek)} vs last week</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{concern.count.toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-0">
            <div>
              <CardTitle className="text-base">Priority Cases This Week</CardTitle>
              <CardDescription>Threads staff should not drop</CardDescription>
            </div>
            <CardAction>
              <TrustIndicator title="Priority logic" lines={priorityTrust} />
            </CardAction>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            {data.priorityCases.data.map((priority) => (
              <div key={priority.title} className="rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{priority.category}</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{`“${priority.title}”`}</p>
                <p className="text-sm text-gray-600">{priority.detail}</p>
                <p className="mt-2 text-xs font-medium text-amber-700">{priority.insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-0">
            <div>
              <CardTitle className="text-base">Top Negative Sentiment Triggers</CardTitle>
              <CardDescription>What’s making people upset</CardDescription>
            </div>
            <CardAction>
              <TrustIndicator title="Negative sentiment" lines={negTrust} />
            </CardAction>
          </CardHeader>
          <CardContent className="mt-4 space-y-3">
            {data.negativeTriggers.data.map((trigger) => (
              <div key={trigger.phrase} className="rounded-lg bg-rose-50/70 px-4 py-3">
                <p className="text-sm font-semibold text-rose-900">“{trigger.phrase}”</p>
                <p className="text-xs text-rose-700">Avg sentiment: {formatSentiment(trigger.avgSentiment)}</p>
                <p className="text-xs text-rose-700">{trigger.mentions} emails this week</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-0">
            <div>
              <CardTitle className="text-base">Top Positive Sentiment Triggers</CardTitle>
              <CardDescription>Proof points that resonate</CardDescription>
            </div>
            <CardAction>
              <TrustIndicator title="Positive sentiment" lines={posTrust} />
            </CardAction>
          </CardHeader>
          <CardContent className="mt-4 space-y-3">
            {data.positiveTriggers.data.map((trigger) => (
              <div key={trigger.phrase} className="rounded-lg bg-emerald-50/80 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-900">“{trigger.phrase}”</p>
                <p className="text-xs text-emerald-800">Avg sentiment: {formatSentiment(trigger.avgSentiment)}</p>
                <p className="text-xs text-emerald-800">{trigger.mentions} emails this week</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-0">
          <div>
            <CardTitle className="text-base">This Week in Your District (AI Digest)</CardTitle>
            <CardDescription>Explain-it-like-a-town-hall briefing</CardDescription>
          </div>
          <CardAction>
            <TrustIndicator title="AI digest" lines={digestTrust} />
          </CardAction>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <p className="text-gray-900 font-semibold">{data.digest.data.headline}</p>
          <div>
            <p className="text-sm font-semibold text-gray-800">What changed</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {data.digest.data.whatChanged.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Why sentiment shifted</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {data.digest.data.whySentimentShift.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Going into your next town hall</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {data.digest.data.nextTownHall.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}


