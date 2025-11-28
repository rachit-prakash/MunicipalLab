"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2",
      "text-sm text-gray-900 placeholder:text-gray-400",
      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500",
      "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
      className,
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export { Textarea }
