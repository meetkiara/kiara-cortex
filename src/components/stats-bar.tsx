"use client";

import type { GraphStats } from "@/lib/types";
import { Circle, GitBranch, FileText } from "lucide-react";

export function StatsBar({ stats }: { stats: GraphStats }) {
  return (
    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground mr-2">
      <span className="flex items-center gap-1.5">
        <Circle className="w-3 h-3 text-primary fill-primary/20" />
        {stats.entity_nodes} nodes
      </span>
      <span className="flex items-center gap-1.5">
        <GitBranch className="w-3 h-3 text-[--color-teal-500]" />
        {stats.entity_edges} edges
      </span>
      <span className="flex items-center gap-1.5">
        <FileText className="w-3 h-3 text-[--color-sand-500]" />
        {stats.episodes} episodes
      </span>
    </div>
  );
}
