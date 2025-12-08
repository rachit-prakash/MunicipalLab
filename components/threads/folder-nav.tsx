"use client"

import { folders, type FolderId } from "@/lib/folders"
import { cn } from "@/lib/utils"

interface FolderNavProps {
  selectedFolder: FolderId | null
  onFolderSelect: (folderId: FolderId | null) => void
  threadCounts?: Record<FolderId, number>
}

export function FolderNav({ selectedFolder, onFolderSelect, threadCounts }: FolderNavProps) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </h2>
      </div>
      <div className="space-y-0.5">
        <button
          onClick={() => onFolderSelect(null)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors",
            selectedFolder === null
              ? "bg-accent text-accent-foreground"
              : "text-foreground hover:bg-accent/50"
          )}
        >
          <span>All Mail</span>
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderSelect(folder.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors",
              selectedFolder === folder.id
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent/50"
            )}
          >
            <span className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", folder.color.replace("text-", "bg-"))} />
              {folder.name}
            </span>
            {threadCounts?.[folder.id] !== undefined && (
              <span className="text-xs text-muted-foreground">
                {threadCounts[folder.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
