import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
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
export default async function DashboardPage() {
  const cookieStore = await cookies()
  const demoMode = cookieStore.get("demo")?.value === "1"

  const session = await getServerSession(authOptions)
  console.log("🔍 Dashboard - Session user:", session?.user)
  console.log("🔍 Dashboard - Demo mode:", demoMode)

  // Allow access if either demo mode is enabled or user has valid session
  if (!demoMode && !session?.user) {
    console.log("❌ Dashboard - No session, redirecting to signin")
    redirect("/auth/signin")
  }

  // For demo mode, use demo tenant; otherwise use user's tenant
  let tenantId: string | null = null

  if (demoMode) {
    // Use demo tenant ID for demo users
    tenantId = "demo"
    console.log("✅ Dashboard - Using demo tenant")
  } else {
    // First, try to get tenant ID from the session (stored during sign-in)
    tenantId = (session!.user as any)?.tenantId || null
    console.log("🔍 Dashboard - Tenant ID from session:", tenantId)

    // Fallback: if not in session, try to resolve from database
    if (!tenantId) {
      const userId =
        (session!.user as any)?.id ||
        (session as any)?.token?.sub ||
        (session!.user as any)?.email

      console.log("🔍 Dashboard - Resolving tenant for user:", userId)

      if (!userId) {
        console.log("❌ Dashboard - No user ID found, redirecting to signin")
        redirect("/auth/signin")
      }

      tenantId = await resolveTenantId(userId)
      console.log("🔍 Dashboard - Tenant ID from database:", tenantId)
      if (!tenantId) {
        console.log("❌ Dashboard - No tenant ID found, redirecting to signin")
        redirect("/auth/signin")
      }
    }
  }

  console.log("✅ Dashboard - Loading dataset for tenant:", tenantId)
  const dataset = await getDashboardDataset(tenantId)
  console.log("✅ Dashboard - Dataset loaded successfully")

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
        </div>

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
  const tenantFromGmail = await query(
    `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
    [userId],
  )
  if (tenantFromGmail.rows[0]?.tenant_id) {
    return tenantFromGmail.rows[0].tenant_id
  }

  const tenantFromUser = await query(
    `SELECT tenant_id FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  )
  return tenantFromUser.rows[0]?.tenant_id ?? null
}
