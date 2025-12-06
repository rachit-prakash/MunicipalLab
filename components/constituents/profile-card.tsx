"use client"

import { useState, useEffect } from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Mail,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  AlertCircle,
  Clock,
  MessageCircle,
} from "lucide-react"
import { ConstituentProfile } from "@/lib/constituent-intelligence"
import { cn } from "@/lib/utils"

interface ConstituentProfileCardProps {
  email: string
  children: React.ReactNode
  className?: string
}

export function ConstituentProfileCard({ email, children, className }: ConstituentProfileCardProps) {
  const [profile, setProfile] = useState<ConstituentProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open && !profile && !loading) {
      fetchProfile()
    }
  }, [open])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/constituents/${encodeURIComponent(email)}`)
      if (!res.ok) {
        throw new Error("Failed to load profile")
      }
      const data = await res.json()
      setProfile(data.profile)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <HoverCard openDelay={300} closeDelay={200} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <span className={cn("cursor-pointer hover:underline decoration-dotted underline-offset-2", className)}>
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-[380px] p-0" align="start">
        {loading ? (
          <ProfileCardSkeleton />
        ) : error ? (
          <div className="p-4 text-sm text-destructive">{error}</div>
        ) : profile ? (
          <ProfileCardContent profile={profile} email={email} />
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}

function ProfileCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

function ProfileCardContent({ profile, email }: { profile: ConstituentProfile; email: string }) {
  const sentimentEmoji = profile.avgSentiment
    ? profile.avgSentiment > 0.3
      ? "😊"
      : profile.avgSentiment < -0.3
        ? "😟"
        : "😐"
    : "—"

  const urgencyColor =
    profile.urgencyProfile === "usually_urgent"
      ? "text-red-600 dark:text-red-400"
      : profile.urgencyProfile === "mixed"
        ? "text-orange-600 dark:text-orange-400"
        : "text-green-600 dark:text-green-400"

  const urgencyLabel =
    profile.urgencyProfile === "usually_urgent"
      ? "Usually Urgent"
      : profile.urgencyProfile === "mixed"
        ? "Sometimes Urgent"
        : "Usually Calm"

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border-b">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-lg">
            {profile.name ? profile.name[0].toUpperCase() : email[0].toUpperCase()}
          </div>

          {/* Name and Email */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base leading-tight">
              {profile.name || "Unknown Constituent"}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                {profile.totalEmails} emails
              </Badge>
              {profile.firstContact && (
                <span className="text-xs text-muted-foreground">
                  Since {new Date(profile.firstContact).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Sentiment Insight */}
        {profile.avgSentiment !== undefined && (
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl">{sentimentEmoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Sentiment</span>
                {profile.sentimentTrend && (
                  <div className="flex items-center gap-1 text-xs">
                    {profile.sentimentTrend === "improving" ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-green-600 dark:text-green-400">Improving</span>
                      </>
                    ) : profile.sentimentTrend === "declining" ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                        <span className="text-red-600 dark:text-red-400">Declining</span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Stable</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average: {((profile.avgSentiment + 1) * 50).toFixed(0)}% positive
              </p>
            </div>
          </div>
        )}

        {/* Top Topics */}
        {profile.topTopics && profile.topTopics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Top Topics</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.topTopics.slice(0, 3).map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {topic.topic} <span className="ml-1 text-muted-foreground">×{topic.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Key Phrases */}
        {profile.keyPhrases && profile.keyPhrases.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">What they care about</span>
            </div>
            <div className="text-xs text-muted-foreground italic space-y-1">
              {profile.keyPhrases.slice(0, 3).map((phrase, i) => (
                <div key={i}>"{phrase}"</div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Pattern */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          {/* Urgency */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className={cn("h-3.5 w-3.5", urgencyColor)} />
              <span className="text-xs font-medium text-foreground">Urgency</span>
            </div>
            <p className={cn("text-xs", urgencyColor)}>{urgencyLabel}</p>
          </div>

          {/* Last Contact */}
          {profile.lastContact && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Last email</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(profile.lastContact)}</p>
            </div>
          )}
        </div>

        {/* Stance Summary */}
        {profile.stanceHistory && Object.keys(profile.stanceHistory).length > 0 && (
          <div className="pt-3 border-t">
            <span className="text-xs font-medium text-foreground mb-2 block">Position History</span>
            <div className="space-y-1.5">
              {Object.entries(profile.stanceHistory)
                .slice(0, 2)
                .map(([topic, stances]) => {
                  const total = stances.support + stances.oppose + stances.neutral
                  const supportPct = total > 0 ? Math.round((stances.support / total) * 100) : 0
                  const opposePct = total > 0 ? Math.round((stances.oppose / total) * 100) : 0

                  return (
                    <div key={topic} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">{topic}</span>
                        <span className="text-foreground font-medium">
                          {stances.support > stances.oppose
                            ? "Supports"
                            : stances.oppose > stances.support
                              ? "Opposes"
                              : "Mixed"}
                        </span>
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                        {supportPct > 0 && (
                          <div className="bg-green-500" style={{ width: `${supportPct}%` }} title={`${supportPct}% Support`} />
                        )}
                        {opposePct > 0 && (
                          <div className="bg-red-500" style={{ width: `${opposePct}%` }} title={`${opposePct}% Oppose`} />
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}
