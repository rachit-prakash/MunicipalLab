"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { format as formatDateFn } from "date-fns"
import type { ThreadRow } from "@/lib/types"
import { ReplyDrawer } from "@/components/threads/reply-drawer"

type InboxListResponse = {
	messages?: Array<{ id: string; threadId: string }>
	nextPageToken?: string
	resultSizeEstimate?: number
}

type GmailMessageHeader = { name?: string; value?: string }
type GmailMessage = {
	id?: string
	threadId?: string
	snippet?: string
	internalDate?: string
	payload?: {
		headers?: GmailMessageHeader[]
	}
}

type EmailRow = {
	id: string
	threadId: string
	subject: string
	from: string
	date: string
	rawDate?: string
	snippet: string
}

async function summarizeText(subject: string, from: string, snippet: string): Promise<string> {
	const system = "Summarize the email in 1 short sentence (≤16 words). No emojis."
	const content = [
		`Subject: ${subject}`,
		from ? `From: ${from}` : null,
		snippet ? `Snippet: ${snippet.slice(0, 300)}` : null,
	]
		.filter(Boolean)
		.join("\n")

	const res = await fetch("/api/assistant/chat", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: system },
				{ role: "user", content },
			],
		}),
	})
	if (!res.ok) {
		throw new Error(await res.text())
	}
	const data = await res.json().catch(() => ({} as any))
	return (data?.content as string) || ""
}

function getHeader(headers: GmailMessageHeader[] | undefined, key: string): string {
	if (!headers?.length) return ""
	const found = headers.find((h) => (h?.name ?? "").toLowerCase() === key.toLowerCase())
	return (found?.value ?? "").trim()
}

async function fetchInbox(): Promise<InboxListResponse> {
	const res = await fetch("/api/gmail/inbox", { cache: "no-store" })
	if (!res.ok) {
		const message = await res.text().catch(() => res.statusText)
		throw new Error(message || "Failed to load inbox")
	}
	return (await res.json()) as InboxListResponse
}

async function fetchMessage(id: string): Promise<GmailMessage> {
	const res = await fetch(`/api/gmail/messages/${encodeURIComponent(id)}`, { cache: "no-store" })
	if (!res.ok) {
		const message = await res.text().catch(() => res.statusText)
		throw new Error(message || `Failed to load message ${id}`)
	}
	// The route returns either raw JSON or a debug wrapper; try to parse both
	const data = await res.json().catch(async () => {
		const txt = await res.text()
		try {
			return JSON.parse(txt)
		} catch {
			return {}
		}
	})
	// If debug wrapper, unwrap body
	if (data && typeof data === "object" && "body" in data && data.body) {
		return data.body as GmailMessage
	}
	return data as GmailMessage
}

function useInboxEmails() {
	const [emails, setEmails] = useState<EmailRow[] | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		async function run() {
			setLoading(true)
			setError(null)
			try {
				const list = await fetchInbox()
				const ids = (list.messages ?? []).map((m) => m.id).filter(Boolean) as string[]
				// Resolve a subset initially for speed
				const toResolve = ids.slice(0, 20)
				const resolved = await Promise.allSettled(toResolve.map((id) => fetchMessage(id)))
				const rows: EmailRow[] = resolved
					.filter((r): r is PromiseFulfilledResult<GmailMessage> => r.status === "fulfilled")
					.map((r) => r.value)
					.map((msg) => {
						const headers = msg?.payload?.headers ?? []
						const subject = getHeader(headers, "Subject") || "(No subject)"
						const from = getHeader(headers, "From") || ""
						const dateHeader = getHeader(headers, "Date")
						const dateObj = dateHeader ? new Date(dateHeader) : msg.internalDate ? new Date(Number(msg.internalDate)) : null
						const date = dateObj ? formatDateFn(dateObj, "EEE, dd MMM yyyy HH:mm") : ""
						return {
							id: (msg.id ?? "") as string,
							threadId: (msg.threadId ?? "") as string,
							subject,
							from,
							date,
							rawDate: dateHeader || (msg.internalDate ? new Date(Number(msg.internalDate)).toUTCString() : ""),
							snippet: (msg.snippet ?? "").trim(),
						}
					})
				if (!cancelled) {
					setEmails(rows)
				}
			} catch (e: any) {
				if (!cancelled) {
					setError(e?.message || "Failed to load inbox")
				}
			} finally {
				if (!cancelled) {
					setLoading(false)
				}
			}
		}
		void run()
		return () => {
			cancelled = true
		}
	}, [])

	return { emails, loading, error }
}

function InboxTable({ emails }: { emails: EmailRow[] }) {
	const [summaries, setSummaries] = useState<Record<string, string>>({})
	const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)

	// Summarize first 10 emails lazily after mount
	useEffect(() => {
		let cancelled = false
		async function run() {
			const targets = emails.slice(0, 10).filter((e) => !summaries[e.id])
			if (targets.length === 0) return
			const updates: Record<string, string> = {}
			await Promise.all(
				targets.map(async (e) => {
					try {
						const summary = await summarizeText(e.subject, e.from, e.snippet)
						updates[e.id] = summary?.trim() || e.snippet
					} catch {
						updates[e.id] = e.snippet
					}
				}),
			)
			if (!cancelled) {
				setSummaries((prev) => ({ ...prev, ...updates }))
			}
		}
		void run()
		return () => {
			cancelled = true
		}
		// we intentionally don't include summaries in deps to avoid re-summarizing on every update
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [emails])

	if (!emails.length) {
		return <div className="flex items-center justify-center h-64 text-ink-500">Inbox is empty.</div>
	}
	return (
		<>
		<div className="overflow-x-auto -mx-4 md:mx-0">
		<Table className="table-fixed min-w-0">
			<TableHeader>
				<TableRow hoverable={false}>
					<TableHead className="w-[28%]">Subject</TableHead>
					<TableHead className="w-[18%]">From</TableHead>
					<TableHead className="w-[12%] hidden sm:table-cell">Date</TableHead>
					<TableHead className="w-[42%] hidden sm:table-cell">Summary</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{emails.map((e) => (
					<TableRow key={e.id} className="group cursor-default">
						<TableCell className="w-[28%] truncate text-ink-900" title={e.subject}>
							{e.subject}
						</TableCell>
						<TableCell className="w-[18%] truncate text-ink-600" title={e.from}>
							{e.from}
						</TableCell>
						<TableCell className="w-[12%] text-xs text-ink-500 hidden sm:table-cell" title={e.rawDate || ""}>{e.date}</TableCell>
						<TableCell className="w-[42%] whitespace-pre-wrap break-words text-ink-600 hidden sm:table-cell">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									{summaries[e.id] ? summaries[e.id] : e.snippet || <span className="text-ink-400">—</span>}
								</div>
								<button
									onClick={() => {
										const receivedAt =
											(e.rawDate ? new Date(e.rawDate) : new Date()).toISOString()
										const thread: ThreadRow = {
											id: e.threadId || e.id,
											subject: e.subject || "(No subject)",
											sender: e.from || "",
											receivedAt,
											type: "CORRESPONDENCE",
											topic: "General",
											summary: summaries[e.id] || e.snippet || "",
											confidence: 0.7,
											unread: false,
										}
										setSelectedThread(thread)
									}}
									className="relative shrink-0 hidden h-7 px-3 items-center justify-center rounded-full text-xs font-medium text-blue-700 group-hover:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
								>
									<span className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 to-indigo-600" />
									<span className="absolute inset-[1px] rounded-full bg-white" />
									<span className="relative">View in Threads</span>
								</button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
		</div>
		{/* Reply drawer modal */}
		{selectedThread && <ReplyDrawer thread={selectedThread} onClose={() => setSelectedThread(null)} />}
		</>
	)
}

function GmailInboxInner() {
	const { emails, loading, error } = useInboxEmails()
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const title = useMemo(() => {
		if (loading) return "Inbox (loading…)"
		if (emails) return `Inbox (${emails.length})`
		return "Inbox"
	}, [emails, loading])

	return (
		<div className="flex min-h-screen bg-background">
			<Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
			<div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
				<Suspense fallback={null}>
					<Header onMenuClick={() => setMobileNavOpen(true)} />
				</Suspense>
				<main className="mt-16 flex-1 overflow-auto">
					<div className="px-4 sm:px-6 pt-6">
						<h1 className="text-xl font-semibold text-ink-900">{title}</h1>
						<p className="text-sm text-ink-500">Latest messages from your Gmail inbox</p>
					</div>
					<div className="px-4 sm:px-6 py-6">
						{loading ? (
							<div className="flex items-center gap-2 text-ink-600">
								<Spinner className="size-4" />
								<span>Loading inbox…</span>
							</div>
						) : error ? (
							<div className={cn("rounded border border-border bg-subtle p-4 text-sm text-red-700")}>
								{error}
							</div>
						) : emails ? (
							<InboxTable emails={emails} />
						) : null}
					</div>
				</main>
			</div>
		</div>
	)
}

export default function GmailInboxPage() {
	return (
		<Suspense fallback={null}>
			<GmailInboxInner />
		</Suspense>
	)
}


