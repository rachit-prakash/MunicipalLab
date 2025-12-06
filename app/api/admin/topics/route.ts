import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withTenant, query } from "@/lib/db"
import { assertAdminRole } from "@/lib/userAccess"

export async function GET() {
  try {
    const { userId, tenantId } = await getAdminContext()
    const topics = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `SELECT id, name, status, created_at, updated_at
         FROM topics
         WHERE tenant_id = $1
         ORDER BY name ASC`,
        [tenantId],
      )
      return rows
    })
    return NextResponse.json({ items: topics })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getAdminContext()
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const topic = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO topics (tenant_id, name, status)
         VALUES ($1, $2, 'active')
         RETURNING id, name, status, created_at, updated_at`,
        [tenantId, name],
      )
      return rows[0]
    })
    return NextResponse.json({ topic }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tenantId } = await getAdminContext()
    const body = await request.json().catch(() => ({}))
    const id = body?.id as string | undefined
    if (!id) {
      return NextResponse.json({ error: "Topic id is required" }, { status: 400 })
    }

    const updates: string[] = []
    const params: any[] = []

    if (typeof body?.name === "string" && body.name.trim()) {
      updates.push("name = $" + (updates.length + 2))
      params.push(body.name.trim())
    }

    if (typeof body?.status === "string") {
      updates.push("status = $" + (updates.length + 2))
      params.push(body.status)
    }

    if (!updates.length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const topic = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `UPDATE topics
         SET ${updates.join(", ")}, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, name, status, updated_at`,
        [tenantId, id, ...params],
      )
      return rows[0]
    })

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    }

    return NextResponse.json({ topic })
  } catch (error) {
    return handleError(error)
  }
}

async function getAdminContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw unauthorized()
  }
  const userId =
    (session.user as any)?.id ||
    (session as any)?.token?.sub ||
    (session.user as any)?.email
  if (!userId) {
    throw unauthorized()
  }

  const tenantId = await resolveTenantId(userId)
  if (!tenantId) {
    throw unauthorized()
  }

  await assertAdminRole(userId)
  return { userId, tenantId }
}

async function resolveTenantId(userId: string): Promise<string | null> {
  const account = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
    [userId],
  )
  if (account.rows[0]?.tenant_id) return account.rows[0].tenant_id

  const userRow = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  )
  return userRow.rows[0]?.tenant_id ?? null
}

function handleError(error: unknown) {
  console.error("admin topics error:", error)
  if ((error as any)?.code === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if ((error as Error)?.message === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  )
}

function unauthorized() {
  return Object.assign(new Error("unauthorized"), { code: "UNAUTHORIZED" })
}



