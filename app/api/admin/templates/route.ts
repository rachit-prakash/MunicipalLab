import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withTenant, query } from "@/lib/db"
import { assertAdminRole } from "@/lib/userAccess"

type TemplatePayload = {
  id?: string
  topicId?: string | null
  stance?: string
  content?: string
}

export async function GET() {
  try {
    const { tenantId } = await getAdminContext()
    const templates = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `SELECT 
            temp.id,
            temp.topic_id,
            temp.stance,
            temp.version,
            temp.content,
            temp.updated_at,
            t.name AS topic_name
         FROM templates temp
         LEFT JOIN topics t ON t.id = temp.topic_id
         WHERE temp.tenant_id = $1
         ORDER BY temp.updated_at DESC`,
        [tenantId],
      )
      return rows
    })
    return NextResponse.json({ items: templates })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getAdminContext()
    const body: TemplatePayload = await request.json().catch(() => ({}))
    if (!body.content || !body.stance) {
      return NextResponse.json({ error: "content and stance are required" }, { status: 400 })
    }

    const template = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO templates (tenant_id, topic_id, stance, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, topic_id, stance, version, content, updated_at`,
        [tenantId, body.topicId || null, body.stance, body.content],
      )
      return rows[0]
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tenantId } = await getAdminContext()
    const body: TemplatePayload = await request.json().catch(() => ({}))
    if (!body.id) {
      return NextResponse.json({ error: "Template id is required" }, { status: 400 })
    }

    const updates: string[] = []
    const params: any[] = []

    if (typeof body.content === "string" && body.content.trim()) {
      updates.push(`content = $${updates.length + 3}`)
      params.push(body.content.trim())
    }
    if (typeof body.stance === "string" && body.stance.trim()) {
      updates.push(`stance = $${updates.length + 3}`)
      params.push(body.stance.trim())
    }
    if ("topicId" in body) {
      updates.push(`topic_id = $${updates.length + 3}`)
      params.push(body.topicId || null)
    }

    if (!updates.length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const template = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `UPDATE templates
         SET ${updates.join(", ")},
             version = version + 1,
             updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, topic_id, stance, version, content, updated_at`,
        [tenantId, body.id, ...params],
      )
      return rows[0]
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    return handleError(error)
  }
}

async function getAdminContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw unauthorized()

  const userId =
    (session.user as any)?.id ||
    (session as any)?.token?.sub ||
    (session.user as any)?.email
  if (!userId) throw unauthorized()

  const tenantId = await resolveTenantId(userId)
  if (!tenantId) throw unauthorized()

  await assertAdminRole(userId)
  return { tenantId }
}

async function resolveTenantId(userId: string): Promise<string | null> {
  const gmail = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
    [userId],
  )
  if (gmail.rows[0]?.tenant_id) return gmail.rows[0].tenant_id

  const userRow = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  )
  return userRow.rows[0]?.tenant_id ?? null
}

function handleError(error: unknown) {
  console.error("admin templates error:", error)
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



