"use client"

import { useState } from "react"
import { Loader2, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "Sync failed")
      }
      
      toast.success("Sync completed successfully")
      router.refresh()
    } catch (error: any) {
      console.error("Sync failed:", error)
      toast.error(error.message || "Failed to sync messages")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-subtle disabled:opacity-50 transition-colors"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCcw className="h-4 w-4" />
      )}
      {isSyncing ? "Syncing..." : "Sync Now"}
    </button>
  )
}
