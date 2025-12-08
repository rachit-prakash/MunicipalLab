"use client"

import { folders, type FolderId } from "@/lib/folders"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface FolderNavProps {
  selectedFolder: FolderId | null
  onFolderSelect: (folderId: FolderId | null) => void
  threadCounts?: Partial<Record<FolderId, number>>
  onSync?: () => void
  syncing?: boolean
  syncMessage?: string | null
}

export function FolderNav({ selectedFolder, onFolderSelect, threadCounts, onSync, syncing, syncMessage }: FolderNavProps) {
  return (
    <div className="space-y-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </h2>
      </div>
      <div className="space-y-0.5 relative">
        {/* Recommended folder (always first) */}
        {folders.filter(f => f.id === 'recommended').map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderSelect(folder.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors relative z-10",
              selectedFolder === folder.id
                ? "text-accent-foreground"
                : "text-foreground hover:bg-accent/50"
            )}
          >
            {selectedFolder === folder.id && (
              <motion.div
                layoutId="folder-highlight"
                className="absolute inset-0 bg-accent rounded-md"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{folder.name}</span>
            {threadCounts?.[folder.id] !== undefined && (
              <span className="text-xs text-muted-foreground relative z-10">
                {threadCounts[folder.id]}
              </span>
            )}
          </button>
        ))}

        {/* All Mail */}
        <button
          onClick={() => onFolderSelect(null)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors relative z-10",
            selectedFolder === null
              ? "text-accent-foreground"
              : "text-foreground hover:bg-accent/50"
          )}
        >
          {selectedFolder === null && (
            <motion.div
              layoutId="folder-highlight"
              className="absolute inset-0 bg-accent rounded-md"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">All Mail</span>
        </button>

        {/* Other folders */}
        {folders.filter(f => f.id !== 'recommended').map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderSelect(folder.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors relative z-10",
              selectedFolder === folder.id
                ? "text-accent-foreground"
                : "text-foreground hover:bg-accent/50"
            )}
          >
            {selectedFolder === folder.id && (
              <motion.div
                layoutId="folder-highlight"
                className="absolute inset-0 bg-accent rounded-md"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="flex items-center gap-2 relative z-10">
              <span className={cn("w-2 h-2 rounded-full", folder.color.replace("text-", "bg-"))} />
              {folder.name}
            </span>
            {threadCounts?.[folder.id] !== undefined && (
              <span className="text-xs text-muted-foreground relative z-10">
                {threadCounts[folder.id]}
              </span>
            )}
          </button>
        ))}
      </div>
      {onSync && (
        <div className="px-3 pt-4 border-t">
          <button
            onClick={onSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 rounded-lg transition-colors"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
          {syncMessage && (
            <div className={`mt-2 text-xs border rounded-lg px-3 py-2 ${
              syncMessage.includes('✓')
                ? 'text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50'
                : 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50'
            }`}>
              {syncMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
