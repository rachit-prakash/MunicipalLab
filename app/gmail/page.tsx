"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

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
						const date = dateHeader || (msg.internalDate ? new Date(Number(msg.internalDate)).toUTCString() : "")
						return {
							id: (msg.id ?? "") as string,
							threadId: (msg.threadId ?? "") as string,
							subject,
							from,
							date,
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
		<Table className="table-fixed">
			<TableHeader>
				<TableRow hoverable={false}>
					<TableHead className="w-[28%]">Subject</TableHead>
					<TableHead className="w-[18%]">From</TableHead>
					<TableHead className="w-[12%]">Date</TableHead>
					<TableHead className="w-[42%]">Summary</TableHead>
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
						<TableCell className="w-[12%] text-xs text-ink-500">{e.date}</TableCell>
						<TableCell className="w-[42%] whitespace-pre-wrap break-words text-ink-600">
							{summaries[e.id] ? summaries[e.id] : e.snippet || <span className="text-ink-400">—</span>}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

function GmailInboxInner() {
	const { emails, loading, error } = useInboxEmails()
	const title = useMemo(() => {
		if (loading) return "Inbox (loading…)"
		if (emails) return `Inbox (${emails.length})`
		return "Inbox"
	}, [emails, loading])

	return (
		<div className="flex min-h-screen bg-background">
			<Sidebar />
			<div className="flex-1 flex flex-col" style={{ marginLeft: "var(--app-sidebar-width, 256px)" }}>
				<Suspense fallback={null}>
					<Header />
				</Suspense>
				<main className="mt-16 flex-1 overflow-auto">
					<div className="px-6 pt-6">
						<h1 className="text-xl font-semibold text-ink-900">{title}</h1>
						<p className="text-sm text-ink-500">Latest messages from your Gmail inbox</p>
					</div>
					<div className="px-6 py-6">
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


