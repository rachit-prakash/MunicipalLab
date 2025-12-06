import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { StanceTrendChart } from "@/components/dashboard/stance-trend-chart"
import { PolicyIntelligenceHeader } from "@/components/dashboard/policy-intelligence-header"
import { TopicInsightsPanel } from "@/components/dashboard/topic-insights-panel"
import { DistrictPulseSection } from "@/components/dashboard/district-pulse-section"
import { DashboardLayoutClient } from "./dashboard-layout-client"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/db"
import { getDashboardDataset } from "@/lib/dashboard-data"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardKPIs } from "@/components/dashboard/kpis"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/signin")
  }

  const userId =
    (session.user as any)?.id ||
    (session as any)?.token?.sub ||
    (session.user as any)?.email

  if (!userId) {
    redirect("/auth/signin")
  }

  const tenantId = await resolveTenantId(userId)
  if (!tenantId) {
    redirect("/auth/signin")
  }

  const dataset = await getDashboardDataset(tenantId)
  const total = dataset.topTopics.reduce((sum, t) => sum + (t.count || 0), 0)
  const topTopic = dataset.topTopics[0]?.topic ?? "Top topic share"
  const topShare = total > 0 ? Math.min(100, Math.round((dataset.topTopics[0]?.count || 0) * 100 / total)) : 0

  return (
    <DashboardLayoutClient>
      <div className="px-4 sm:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold text-foreground font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground">KPIs and trends at a glance</p>
        </div>

        <DashboardKPIs total={total} secondaryLabel={topTopic} secondaryPct={topShare} />

        <PolicyIntelligenceHeader />

        <TopicInsightsPanel topics={dataset.topTopics} />

        <DistrictPulseSection />

        <StanceTrendChart
          trendsByTopic={dataset.trendsByTopic}
          defaultTopic={Object.keys(dataset.trendsByTopic)[0]}
        />
      </div>
    </DashboardLayoutClient>
  )
}

async function resolveTenantId(userId: string): Promise<string | null> {
  const tenantFromGmail = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
    [userId],
  )
  if (tenantFromGmail.rows[0]?.tenant_id) {
    return tenantFromGmail.rows[0].tenant_id
  }

  const tenantFromUser = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  )
  return tenantFromUser.rows[0]?.tenant_id ?? null
}
