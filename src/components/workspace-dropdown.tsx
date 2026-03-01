"use client";

import { useState, useRef, useEffect } from "react";
import type { WorkspaceInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, Database, Check } from "lucide-react";

interface WorkspaceDropdownProps {
  workspaces: string[];
  workspaceInfos: WorkspaceInfo[];
  selectedWorkspace: string | null;
  onSelect: (ws: string) => void;
}

export function WorkspaceDropdown({
  workspaces,
  workspaceInfos,
  selectedWorkspace,
  onSelect,
}: WorkspaceDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const selectedInfo = workspaceInfos.find((w) => w.name === selectedWorkspace);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 h-7 px-3 rounded-full text-[11px] font-mono transition-all cursor-pointer",
          "bg-muted/40 hover:bg-muted/60 border border-border/30",
          open && "bg-muted/60 border-border/50"
        )}
      >
        <Database className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[140px] text-foreground">
          {selectedWorkspace || "Select workspace…"}
        </span>
        {selectedInfo && selectedInfo.nodeCount > 0 && (
          <span className="text-[9px] font-sans font-medium text-emerald-600 dark:text-emerald-400">
            {selectedInfo.nodeCount}n
          </span>
        )}
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground transition-transform shrink-0",
          open && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-[280px] max-h-[400px] overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-lg animate-fade-in">
          <div className="p-1">
            {workspaces.map((ws) => {
              const info = workspaceInfos.find((w) => w.name === ws);
              const hasData = info && info.nodeCount > 0;
              const isSelected = ws === selectedWorkspace;
              return (
                <button
                  key={ws}
                  onClick={() => {
                    onSelect(ws);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {/* Check indicator */}
                  <span className="w-4 shrink-0 flex items-center justify-center">
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                  </span>
                  {/* Workspace name */}
                  <span className="font-mono truncate min-w-0 flex-1 text-left">
                    {ws}
                  </span>
                  {/* Count pills */}
                  {info && hasData ? (
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-medium tabular-nums text-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                        {info.nodeCount}n · {info.edgeCount}e
                      </span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      empty
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
