import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getConfidenceTone(confidence: number) {
  if (confidence >= 0.9) return "ok"
  if (confidence >= 0.75) return "warn"
  return "danger"
}

// Color helpers for topics across charts and badges
const TOPIC_COLOR_MAP: Record<
  string,
  { hex: string; badgeBg: string; badgeText: string }
> = {
  Healthcare: {
    hex: "#F43F5E", // rose-500
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
  },
  Immigration: {
    hex: "#F59E0B", // amber-500
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  Infrastructure: {
    hex: "#0EA5E9", // sky-500
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
  },
  Education: {
    hex: "#8B5CF6", // violet-500
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
  },
  Environment: {
    hex: "#10B981", // emerald-500
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
}

export function getTopicColorHex(topic: string) {
  return TOPIC_COLOR_MAP[topic]?.hex ?? "#64748B" // slate-500 default
}

export function getTopicBadgeClasses(topic: string) {
  const entry =
    TOPIC_COLOR_MAP[topic] ?? { badgeBg: "bg-slate-100", badgeText: "text-slate-700" }
  return `${entry.badgeBg} ${entry.badgeText}`
}

export function formatDate(isoString: string) {
  const date = new Date(isoString)
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return formatter.format(date)
}
