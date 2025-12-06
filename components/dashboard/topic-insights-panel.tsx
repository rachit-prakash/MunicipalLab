"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"

type TopicInsightsPanelProps = {
  topics: Array<{ topic: string; count: number }>
}

export function TopicInsightsPanel({ topics }: TopicInsightsPanelProps) {
  const cards = topics.length ? topics : [{ topic: "Not enough data yet", count: 0 }]

  return (
    <section
      className="border border-border rounded-xl bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label="Topic insights carousel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic insights</p>
          <p className="text-sm text-muted-foreground">Top inbound issues from the past month.</p>
        </div>
        {cards.length > 1 ? <span className="text-xs text-muted-foreground">Scroll for more →</span> : null}
      </div>

      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-3">
          {cards.map((card) => (
            <CarouselItem key={card.topic} className="pl-3 sm:basis-1/2 xl:basis-1/3">
              <InsightCard topic={card.topic} count={card.count} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}

function InsightCard({ topic, count }: { topic: string; count: number }) {
  const query = `/threads?q=${encodeURIComponent(topic)}`
  return (
    <Link
      prefetch={false}
      href={query}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <article className="h-full rounded-xl border border-border bg-muted/60 p-4 transition shadow-sm group-hover:bg-card group-hover:shadow-md">
        <p className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block">
          {topic}
        </p>
        <h4 className="mt-3 text-lg font-semibold text-foreground leading-snug">{count} messages</h4>
        <p className="mt-1 text-sm text-muted-foreground">Tap to open the inbox filtered by “{topic}”.</p>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Open filtered inbox
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </article>
    </Link>
  )
}


