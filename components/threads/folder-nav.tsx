"use client"

import { folders, type FolderId } from "@/lib/folders"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface FolderNavProps {
  selectedFolder: FolderId | null
  onFolderSelect: (folderId: FolderId | null) => void
  threadCounts?: Partial<Record<FolderId, number>>
}

export function FolderNav({ selectedFolder, onFolderSelect, threadCounts }: FolderNavProps) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </h2>
      </div>
      <div className="space-y-0.5 relative">
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
        {folders.map((folder) => (
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
    </div>
  )
}
