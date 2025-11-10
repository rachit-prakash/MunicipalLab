'use client'

import * as React from 'react'
import { SendHorizonal, X } from 'lucide-react'

import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

export function ChatbotDrawer() {
	const [open, setOpen] = React.useState(false)
	const [messages, setMessages] = React.useState<ChatMessage[]>([
		{
			id: 'welcome',
			role: 'assistant',
			content: "Hi! I'm your AI Assistant. Ask me anything about your data.",
		},
	])
	const [input, setInput] = React.useState('')
	const [sending, setSending] = React.useState(false)
	const inputRef = React.useRef<HTMLTextAreaElement>(null)
	const bodyRef = React.useRef<HTMLDivElement>(null)

	// Listen for global event dispatched by the floating button
	React.useEffect(() => {
		function handler() {
			setOpen(true)
			setTimeout(() => inputRef.current?.focus(), 0)
		}
		window.addEventListener('open-chatbot', handler as EventListener)
		return () => window.removeEventListener('open-chatbot', handler as EventListener)
	}, [])

	// Auto-scroll to bottom on new messages
	React.useEffect(() => {
		const el = bodyRef.current
		if (el) {
			el.scrollTop = el.scrollHeight
		}
	}, [messages, sending])

	async function sendMessage(e?: React.FormEvent) {
		e?.preventDefault()
		const trimmed = input.trim()
		if (!trimmed || sending) return
		const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
		setMessages((m) => [...m, userMsg])
		setInput('')
		setSending(true)
		try {
			// Optional: provide external context via window if available
			const context =
				typeof window !== 'undefined' && Array.isArray((window as any).__ASSISTANT_CONTEXT__)
					? ((window as any).__ASSISTANT_CONTEXT__ as string[])
					: []

			const res = await fetch('/api/assistant/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					messages: messages.concat(userMsg).map(({ role, content }) => ({ role, content })),
					context,
				}),
			})
			if (!res.ok) {
				const text = await res.text()
				throw new Error(text || 'Request failed')
			}
			const data = (await res.json()) as { role: 'assistant'; content: string }
			const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.content }
			setMessages((m) => [...m, assistantMsg])
		} catch (err: any) {
			const assistantMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: `Sorry, I ran into an error. ${err?.message ?? ''}`,
			}
			setMessages((m) => [...m, assistantMsg])
		} finally {
			setSending(false)
		}
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendMessage()
		}
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerContent>
				<DrawerHeader className="flex items-center justify-between gap-3">
					<DrawerTitle>AI Assistant</DrawerTitle>
					<DrawerClose asChild>
						<Button variant="ghost" size="sm" aria-label="Close">
							<X className="h-4 w-4" />
						</Button>
					</DrawerClose>
				</DrawerHeader>
				<DrawerBody ref={bodyRef as any} className="space-y-4">
					{messages.map((m) => (
						<div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
							<div
								className={cn(
									'max-w-[80%] rounded-lg px-3 py-2 text-sm',
									m.role === 'user'
										? 'bg-blue-600 text-white'
										: 'bg-ink-100 text-ink-900 border border-border',
								)}
							>
								{m.content}
							</div>
						</div>
					))}
					{sending ? (
						<div className="flex justify-start">
							<div className="max-w-[80%] rounded-lg px-3 py-2 border border-border bg-ink-100 text-ink-900">
								<Spinner className="mr-2 inline-block size-4 align-[-2px]" />
								Thinking…
							</div>
						</div>
					) : null}
				</DrawerBody>
				<form onSubmit={sendMessage}>
					<DrawerFooter className="gap-3 justify-between">
						<Textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={onKeyDown}
							placeholder="Ask a question about your data…"
							disabled={sending}
							rows={3}
							className="min-h-0 flex-1"
						/>
						<Button type="submit" disabled={sending} className="shrink-0">
							{sending ? <Spinner className="mr-2" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
							Send
						</Button>
					</DrawerFooter>
				</form>
			</DrawerContent>
		</Drawer>
	)
}

export default ChatbotDrawer


