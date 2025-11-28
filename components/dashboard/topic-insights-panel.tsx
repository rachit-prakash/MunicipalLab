"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"

type InsightCard = {
  id: string
  headline: string
  detail: string
  tag: string
  query: string
}

const INSIGHTS: InsightCard[] = [
  {
    id: "potholes",
    headline: "Potholes up 2.1× this week",
    detail: "Complaints clustered along North Ward arterials after freeze–thaw.",
    tag: "Infrastructure",
    query: "pothole OR road repair OR north ward",
  },
  {
    id: "schools",
    headline: "School funding concerns trending",
    detail: "Parents of school-aged kids drive 64% of mentions in the last 7 days.",
    tag: "Education",
    query: "\"school funding\" OR PTA OR \"education budget\"",
  },
  {
    id: "public-safety",
    headline: "Public safety sentiment +18%",
    detail: "Weekend patrol expansion calmed downtown nightlife chatter.",
    tag: "Public Safety",
    query: "\"public safety\" OR patrol OR crime",
  },
]

export function TopicInsightsPanel() {
  return (
    <section
      className="border border-gray-200 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label="Topic insights carousel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Topic insights</p>
          <p className="text-sm text-gray-600">Policy-relevant swings you can act on right now.</p>
        </div>
        <span className="text-xs text-gray-500">Scroll for more →</span>
      </div>

      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-3">
          {INSIGHTS.map((insight) => (
            <CarouselItem key={insight.id} className="pl-3 sm:basis-1/2 xl:basis-1/3">
              <InsightLinkCard {...insight} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}

function InsightLinkCard({ headline, detail, tag, query }: InsightCard) {
  const href = `/threads?q=${encodeURIComponent(query)}`
  return (
    <Link
      prefetch={false}
      href={href}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
    >
      <article className="h-full rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition shadow-sm group-hover:bg-white group-hover:shadow-md">
        <p className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block">{tag}</p>
        <h4 className="mt-3 text-lg font-semibold text-gray-900 leading-snug">{headline}</h4>
        <p className="mt-1 text-sm text-gray-600">{detail}</p>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
          Open filtered inbox
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </article>
    </Link>
  )
}


