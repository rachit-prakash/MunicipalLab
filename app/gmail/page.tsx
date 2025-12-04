"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { format as formatDateFn } from "date-fns"
import type { ThreadRow } from "@/lib/types"
import { ReplyDrawer } from "@/components/threads/reply-drawer"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type ThreadListResponse = {
	items: ThreadRow[]
}

function useInboxThreads(limit = 25) {
	const [threads, setThreads] = useState<ThreadRow[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		async function run() {
			setLoading(true)
			setError(null)
			try {
				const params = new URLSearchParams({ limit: String(limit) })
				const res = await fetch(`/api/gmail/threads?${params.toString()}`, {
					cache: "no-store",
				})
				if (!res.ok) {
					const message = await res.text().catch(() => res.statusText)
					throw new Error(message || "Failed to load inbox")
				}
				const payload = (await res.json()) as ThreadListResponse
				if (!cancelled) {
					setThreads(payload.items ?? [])
				}
			} catch (e: any) {
				if (!cancelled) setError(e?.message || "Failed to load inbox")
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		void run()
		return () => {
			cancelled = true
		}
	}, [limit])

	return { threads, loading, error }
}

function GmailInboxInner() {
	const { threads, loading, error } = useInboxThreads()
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null)
	const title = useMemo(() => {
		if (loading) return "Inbox (loading…)"
		return `Inbox (${threads.length})`
	}, [threads.length, loading])

	return (
		<div className="flex min-h-screen bg-background">
			<Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
			<div className="flex-1 flex flex-col ml-0 md:ml-[var(--app-sidebar-width,256px)]">
				<Suspense fallback={null}>
					<Header onMenuClick={() => setMobileNavOpen(true)} />
				</Suspense>
				<main className="mt-16 flex-1 overflow-auto">
					<div className="px-4 sm:px-6 pt-6">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/dashboard">Home</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Inbox</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
						<h1 className="text-xl font-semibold text-foreground">{title}</h1>
						<p className="text-sm text-muted-foreground">Latest messages synced into your workspace</p>
					</div>
					<div className="px-4 sm:px-6 py-6">
						{loading ? (
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Spinner className="size-4" />
									<span>Loading inbox…</span>
								</div>
								<div className="space-y-2">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
						) : error ? (
							<div className={cn("rounded border border-border bg-muted p-4 text-sm text-destructive")}>
								{error}
							</div>
						) : (
							<>
								<InboxTable threads={threads} onViewThread={setSelectedThread} />
								{selectedThread ? (
									<ReplyDrawer thread={selectedThread} onClose={() => setSelectedThread(null)} />
								) : null}
							</>
						)}
					</div>
				</main>
			</div>
		</div>
	)
}

function InboxTable({
	threads,
	onViewThread,
}: {
	threads: ThreadRow[]
	onViewThread: (thread: ThreadRow) => void
}) {
	if (!threads.length) {
		return <div className="flex items-center justify-center h-64 text-muted-foreground">Inbox is empty.</div>
	}
	return (
		<div className="overflow-x-auto -mx-4 md:mx-0">
			<Table className="table-fixed min-w-0">
				<TableHeader>
					<TableRow hoverable={false}>
						<TableHead className="w-[30%]">Subject</TableHead>
						<TableHead className="w-[20%]">From</TableHead>
						<TableHead className="w-[15%] hidden sm:table-cell">Date</TableHead>
						<TableHead className="w-[35%] hidden sm:table-cell">Summary</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{threads.map((thread) => (
						<TableRow key={thread.id} className="group cursor-pointer" onClick={() => onViewThread(thread)}>
							<TableCell className="truncate text-foreground" title={thread.subject}>
								{thread.subject}
							</TableCell>
							<TableCell className="truncate text-muted-foreground" title={thread.sender}>
								{thread.sender}
							</TableCell>
							<TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
								{formatDateFn(new Date(thread.receivedAt), "PP p")}
							</TableCell>
							<TableCell className="whitespace-pre-wrap break-words text-muted-foreground hidden sm:table-cell">
								{thread.summary}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
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


