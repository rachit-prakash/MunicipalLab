import { query } from "@/lib/db"

export type AppRole = "viewer" | "agent" | "admin"

export async function getUserRole(userId: string): Promise<AppRole | null> {
  const { rows } = await query(
    `SELECT role_id FROM memberships WHERE user_id = $1 LIMIT 1`,
    [userId],
  )
  const record = rows[0] as { role_id: AppRole } | undefined
  return record?.role_id ?? null
}

export async function assertAdminRole(userId: string) {
  const role = await getUserRole(userId)
  if (role !== "admin") {
    const error = new Error("forbidden")
    ;(error as any).code = "FORBIDDEN"
    throw error
  }
}

