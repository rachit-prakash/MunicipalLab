export type ConfidenceLevel = "high" | "medium" | "low"

export type ConcernEntry = {
  label: string
  count: number
  deltaVsLastWeek: number
}

export type TrustMetaWindow = {
  sampleSize: number
  coveragePct: number
  windowStart: string
  windowEnd: string
  trendSummary?: string
  confidence?: ConfidenceLevel
}

export type PriorityCase = {
  category: string
  title: string
  detail: string
  insight: string
}

export type PriorityMeta = {
  rulesUsed: string[]
  sampleSize: number
  signals: string[]
}

export type PhraseStat = {
  phrase: string
  mentions: number
}

export type PhraseMeta = {
  sampleSize: number
  minFrequency: number
  filtersApplied: string[]
}

export type TriggerStat = {
  phrase: string
  avgSentiment: number
  mentions: number
}

export type TriggerMeta = {
  sampleSize: number
  minFrequency: number
  sentimentThreshold: number
  calibrationNotes: string
}

export type DigestBlock = {
  headline: string
  whatChanged: string[]
  whySentimentShift: string[]
  nextTownHall: string[]
}

export type DigestMeta = {
  sourceMetrics: Array<keyof DistrictPulseData>
  emailsAnalyzed: number
  coveragePct: number
  windowStart: string
  windowEnd: string
  focus: string
}

export type DistrictPulseData = {
  updatedAt: string
  topConcerns: {
    data: ConcernEntry[]
    meta: TrustMetaWindow
  }
  priorityCases: {
    data: PriorityCase[]
    meta: PriorityMeta
  }
  keyPhrases: {
    data: PhraseStat[]
    meta: PhraseMeta
  }
  negativeTriggers: {
    data: TriggerStat[]
    meta: TriggerMeta
  }
  positiveTriggers: {
    data: TriggerStat[]
    meta: TriggerMeta
  }
  digest: {
    data: DigestBlock
    meta: DigestMeta
  }
}

export const districtPulseSnapshot: DistrictPulseData = {
  updatedAt: "2025-11-27T08:00:00Z",
  topConcerns: {
    data: [
      { label: "Transit delays", count: 124, deltaVsLastWeek: 34 },
      { label: "Trash & sanitation", count: 77, deltaVsLastWeek: 12 },
      { label: "Zoning / development", count: 51, deltaVsLastWeek: 39 },
    ],
    meta: {
      sampleSize: 612,
      coveragePct: 0.78,
      windowStart: "2025-11-20T00:00:00Z",
      windowEnd: "2025-11-27T00:00:00Z",
      trendSummary: "Transit complaints increased 38% vs last week.",
      confidence: "high",
    },
  },
  priorityCases: {
    data: [
      {
        category: "Urgent legal / deadline-driven",
        title: "FOIA request re: police body cams",
        detail: "Reply due in 2 days",
        insight: "Deadline alert",
      },
      {
        category: "High-risk PR",
        title: "Viral post about unsafe crosswalk at Elm & 3rd",
        detail: "14 similar emails",
        insight: "Escalating visibility",
      },
      {
        category: "Immediate safety",
        title: "Repeated reports of streetlight outages near schools",
        detail: "9 emails, high anger",
        insight: "High anger + proximity to schools",
      },
    ],
    meta: {
      rulesUsed: ["deadline_keywords", "safety_keywords", "anger_threshold"],
      sampleSize: 233,
      signals: [
        "9 emails with high negative sentiment",
        "Mentions of deadline / lawsuit / FOIA",
        "3+ emails referencing the same location",
      ],
    },
  },
  keyPhrases: {
    data: [
      { phrase: "unsafe crossing", mentions: 31 },
      { phrase: "missed trash pickup", mentions: 25 },
      { phrase: "late bus to school", mentions: 19 },
    ],
    meta: {
      sampleSize: 842,
      minFrequency: 5,
      filtersApplied: ["Removed greetings", "Removed signatures"],
    },
  },
  negativeTriggers: {
    data: [
      { phrase: "police brutality", avgSentiment: -0.82, mentions: 9 },
      { phrase: "tax hike", avgSentiment: -0.74, mentions: 17 },
      { phrase: "unsafe at night", avgSentiment: -0.69, mentions: 12 },
    ],
    meta: {
      sampleSize: 233,
      minFrequency: 5,
      sentimentThreshold: -0.4,
      calibrationNotes: "Sentiment calibrated on historical constituent email set.",
    },
  },
  positiveTriggers: {
    data: [
      { phrase: "after-school program", avgSentiment: 0.71, mentions: 11 },
      { phrase: "new playground", avgSentiment: 0.65, mentions: 8 },
      { phrase: "school bus improvements", avgSentiment: 0.59, mentions: 7 },
    ],
    meta: {
      sampleSize: 187,
      minFrequency: 3,
      sentimentThreshold: 0.4,
      calibrationNotes: "Same sentiment calibration as negative triggers.",
    },
  },
  digest: {
    data: {
      headline: "Transit and sanitation dominate inbox volume, with a new spike in zoning anxiety.",
      whatChanged: [
        "Complaints about late buses and unsafe crossings rose 38% WoW, driven by parents near Elm & 3rd.",
        "Trash and missed pickup complaints increased after the holiday weekend.",
        "Zoning emails tripled, many referencing luxury development and displacement.",
      ],
      whySentimentShift: [
        "Negative sentiment is concentrated around transit reliability and perceived unfair zoning.",
        "Positive sentiment clusters around after-school programs and playground upgrades.",
      ],
      nextTownHall: [
        "Expect questions on transit reliability, zoning fairness, and trash delays.",
        "Use after-school programs and playground improvements as proof points.",
      ],
    },
    meta: {
      sourceMetrics: ["topConcerns", "negativeTriggers", "positiveTriggers", "keyPhrases"],
      emailsAnalyzed: 1024,
      coveragePct: 0.81,
      windowStart: "2025-11-20T00:00:00Z",
      windowEnd: "2025-11-27T00:00:00Z",
      focus: "Highlights the largest week-over-week shifts.",
    },
  },
}


