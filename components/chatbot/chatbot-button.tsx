'use client'

import * as React from 'react'
import { MessageCircle } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ChatbotButtonProps = {
	onClick?: () => void
	className?: string
}

export function ChatbotButton({ onClick, className }: ChatbotButtonProps) {
	const handleClick = React.useCallback(() => {
		if (onClick) {
			onClick()
			return
		}
		// Fire a global event that can be listened to by a future chat widget
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('open-chatbot'))
		}
	}, [onClick])

	return (
		<div className={cn('fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]', className)}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label="Open chatbot"
						onClick={handleClick}
						className={cn(
							// Size and layout
							'relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full',
							// Visual prominence
							'shadow-2xl transition-transform active:scale-95',
							// Focus visibility
							'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
						)}
					>
						{/* Gradient background */}
						<span className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700" />

						{/* Glow/pulse ring for visibility */}
						<span className="pointer-events-none absolute -inset-2 rounded-full bg-blue-500/20 blur-md" />
						<span className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-blue-400/30 animate-pulse" />

						{/* Icon */}
						<span className="relative flex h-full w-full items-center justify-center text-white">
							<MessageCircle className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
						</span>
					</button>
				</TooltipTrigger>
				<TooltipContent side="left">Chat with us</TooltipContent>
			</Tooltip>
		</div>
	)
}

export default ChatbotButton


