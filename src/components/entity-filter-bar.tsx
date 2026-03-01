"use client";

import { useMemo } from "react";
import { useCortexStore } from "@/lib/store";
import {
  getEntityType,
  ENTITY_COLORS,
  ENTITY_COLORS_DARK,
  type EntityType,
} from "@/lib/types";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, RotateCcw } from "lucide-react";

export function EntityFilterBar() {
  const { graphData, hiddenTypes, toggleType, showOnlyType, showAllTypes } =
    useCortexStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = isDark ? ENTITY_COLORS_DARK : ENTITY_COLORS;

  // Compute type counts from graph data
  const typeCounts = useMemo(() => {
    if (!graphData) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const n of graphData.nodes) {
      const t = getEntityType(n.labels);
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [graphData]);

  // Only show types that exist in this workspace
  const activeTypes = useMemo(() => {
    return (Object.keys(ENTITY_COLORS) as EntityType[]).filter(
      (type) => (typeCounts[type] || 0) > 0
    );
  }, [typeCounts]);

  if (!graphData || activeTypes.length === 0) return null;

  const hiddenCount = activeTypes.filter((t) => !!hiddenTypes[t]).length;
  const visibleTypes = activeTypes.filter((t) => !hiddenTypes[t]);
  const isSoloMode = visibleTypes.length === 1 && hiddenCount > 0;
  const soloType = isSoloMode ? visibleTypes[0] : null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-border/40 bg-muted/20 min-w-0 overflow-hidden">
      {/* Label */}
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium shrink-0 select-none">
        Filter
      </span>
      <div className="w-px h-3.5 bg-border/40" />

      {/* Entity type pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {activeTypes.map((type) => {
          const count = typeCounts[type] || 0;
          const isHidden = !!hiddenTypes[type];
          const color = colors[type];
          const isSolo = soloType === type;
          return (
            <div key={type} className="group/pill relative inline-flex items-center">
              {/* Main toggle pill */}
              <button
                onClick={() => toggleType(type)}
                aria-label={`${isHidden ? "Show" : "Hide"} ${type} (${count})`}
                aria-pressed={!isHidden}
                className={cn(
                  "inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer",
                  isHidden
                    ? "opacity-40 bg-muted/50 text-muted-foreground"
                    : "text-white shadow-sm",
                  isSolo && "ring-2 ring-offset-1 ring-offset-background"
                )}
                style={
                  isHidden
                    ? undefined
                    : {
                        backgroundColor: color,
                        ...(isSolo ? { "--tw-ring-color": color } as React.CSSProperties : {}),
                      }
                }
              >
                {/* Visibility indicator */}
                {isHidden ? (
                  <EyeOff className="w-3 h-3 opacity-50" />
                ) : (
                  <Eye className="w-3 h-3 opacity-70" />
                )}
                {type}
                <span
                  className={cn(
                    "text-[9px] tabular-nums ml-0.5",
                    isHidden ? "opacity-50" : "opacity-70"
                  )}
                >
                  {count}
                </span>
              </button>

              {/* "Only" button — appears on hover, overlays the right side */}
              {!isSolo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showOnlyType(type);
                  }}
                  title={`Show only ${type}`}
                  className={cn(
                    "absolute right-0 top-0 bottom-0 px-1.5 rounded-r-full text-[8px] font-bold uppercase tracking-wider",
                    "opacity-0 group-hover/pill:opacity-100 transition-opacity cursor-pointer",
                    isHidden
                      ? "bg-muted/80 text-foreground hover:bg-muted"
                      : "bg-black/30 text-white hover:bg-black/50"
                  )}
                >
                  only
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden summary / Show All reset */}
      {hiddenCount > 0 && (
        <>
          <div className="w-px h-3.5 bg-border/40" />
          <button
            onClick={showAllTypes}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            title="Show all types"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            {isSoloMode ? `Solo: ${soloType}` : `${hiddenCount} hidden`}
          </button>
        </>
      )}
    </div>
  );
}
