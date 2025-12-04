"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock } from "lucide-react"

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { label: "America/New_York (Eastern)", value: "America/New_York" },
  { label: "America/Chicago (Central)", value: "America/Chicago" },
  { label: "America/Denver (Mountain)", value: "America/Denver" },
  { label: "America/Los_Angeles (Pacific)", value: "America/Los_Angeles" },
  { label: "America/Anchorage (Alaska)", value: "America/Anchorage" },
  { label: "Pacific/Honolulu (Hawaii)", value: "Pacific/Honolulu" },
  { label: "America/Phoenix (Arizona)", value: "America/Phoenix" },
  { label: "America/Toronto (Toronto)", value: "America/Toronto" },
  { label: "America/Vancouver (Vancouver)", value: "America/Vancouver" },
  { label: "Europe/London (London)", value: "Europe/London" },
  { label: "Europe/Paris (Paris)", value: "Europe/Paris" },
  { label: "Europe/Berlin (Berlin)", value: "Europe/Berlin" },
  { label: "Europe/Madrid (Madrid)", value: "Europe/Madrid" },
  { label: "Europe/Rome (Rome)", value: "Europe/Rome" },
  { label: "Europe/Athens (Athens)", value: "Europe/Athens" },
  { label: "Asia/Dubai (Dubai)", value: "Asia/Dubai" },
  { label: "Asia/Kolkata (India)", value: "Asia/Kolkata" },
  { label: "Asia/Shanghai (China)", value: "Asia/Shanghai" },
  { label: "Asia/Tokyo (Tokyo)", value: "Asia/Tokyo" },
  { label: "Asia/Seoul (Seoul)", value: "Asia/Seoul" },
  { label: "Asia/Singapore (Singapore)", value: "Asia/Singapore" },
  { label: "Australia/Sydney (Sydney)", value: "Australia/Sydney" },
  { label: "Australia/Melbourne (Melbourne)", value: "Australia/Melbourne" },
  { label: "Pacific/Auckland (Auckland)", value: "Pacific/Auckland" },
  { label: "UTC", value: "UTC" },
]

export default function SettingsPage() {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [currentTime, setCurrentTime] = useState("")
  const [timezoneMessage, setTimezoneMessage] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        setCurrentTime(formatter.format(new Date()))
      } catch (error) {
        setCurrentTime("Invalid timezone")
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [timezone])

  const handleTimezoneSave = async () => {
    setBusy(true)
    setTimezoneMessage(null)
    try {
      const res = await fetch("/api/user/timezone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timezone }),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = await res.json()
      setTimezoneMessage(data.updated ? "Timezone updated" : "No change needed")
    } catch (error: any) {
      setTimezoneMessage(error?.message ?? "Failed to update timezone")
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async () => {
    setExportStatus("Preparing export…")
    try {
      const res = await fetch("/api/user/export")
      if (!res.ok) throw new Error(await res.text())
      const payload = await res.json()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `legaside-export-${new Date().toISOString()}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setExportStatus("Export downloaded")
    } catch (error: any) {
      setExportStatus(error?.message ?? "Export failed")
    }
  }

  const handleDelete = async () => {
    if (!confirm("This will delete your account and data. Continue?")) return
    setDeleteStatus("Deleting account…")
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setDeleteStatus("Account deleted. Redirecting…")
      router.push("/auth/signin")
    } catch (error: any) {
      setDeleteStatus(error?.message ?? "Delete failed")
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <main className="mt-16 flex-1 overflow-auto">
          <div className="px-4 sm:px-6 py-6 space-y-8">
            <section className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Timezone</h2>
                <p className="text-sm text-gray-500">We use this to localize analytics windows.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="sm:max-w-md">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 sm:max-w-md">
                    <Clock className="h-4 w-4" />
                    <span>Current time: {currentTime}</span>
                  </div>
                )}
                <div>
                  <Button onClick={handleTimezoneSave} disabled={busy}>
                    Save timezone
                  </Button>
                </div>
              </div>
              {timezoneMessage ? <p className="text-sm text-gray-600">{timezoneMessage}</p> : null}
            </section>

            <section className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Data export</h2>
                <p className="text-sm text-gray-500">Download a machine-readable copy of your personal data.</p>
              </div>
              <Button variant="secondary" onClick={handleExport}>
                Download export
              </Button>
              {exportStatus ? <p className="text-sm text-gray-600">{exportStatus}</p> : null}
            </section>

            <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-red-700">Delete account</h2>
                <p className="text-sm text-red-700">This is permanent and removes your Gmail connection plus local data.</p>
              </div>
              <Button variant="destructive" onClick={handleDelete}>
                Delete my account
              </Button>
              {deleteStatus ? <p className="text-sm text-red-700">{deleteStatus}</p> : null}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

