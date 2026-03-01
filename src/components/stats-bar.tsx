"use client";

import type { GraphStats } from "@/lib/types";
import { Circle, MessageSquareQuote, FileText } from "lucide-react";

export function StatsBar({ stats }: { stats: GraphStats }) {
  return (
    <div className="hidden sm:flex items-center gap-1 mr-1">
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
        <Circle className="w-2.5 h-2.5 fill-primary/20" />
        {stats.entity_nodes}
        <span className="font-normal opacity-60">n</span>
      </span>
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-semibold tabular-nums">
        <MessageSquareQuote className="w-2.5 h-2.5" />
        {stats.entity_edges}
        <span className="font-normal opacity-60">facts</span>
      </span>
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold tabular-nums">
        <FileText className="w-2.5 h-2.5" />
        {stats.episodes}
        <span className="font-normal opacity-60">ep</span>
      </span>
    </div>
  );
}
