"use client";

import { useMemo } from "react";
import { useCortexStore } from "@/lib/store";
import { getEntityType, getNodeColor, getNodeSubtitle } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import {
  Search,
  Circle,
  GitBranch,
  FileText,
  ChevronRight,
  MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const {
    graphData,
    sidebarTab,
    searchQuery,
    selectedNode,
    selectedEdge,
    selectedEpisode,
    hiddenTypes,
    setSidebarTab,
    setSearchQuery,
    setSelectedNode,
    setSelectedEdge,
    setSelectedEpisode,
  } = useCortexStore();

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const q = searchQuery.toLowerCase();

  // Build node color map for edge color lookups
  const nodeColorMap = useMemo(() => {
    if (!graphData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const n of graphData.nodes) {
      map.set(n.uuid, getNodeColor(n, isDark));
    }
    return map;
  }, [graphData, isDark]);

  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((n) => {
      const type = getEntityType(n.labels);
      if (hiddenTypes[type]) return false;
      if (q) {
        const subtitle = getNodeSubtitle(n)?.toLowerCase() ?? "";
        if (
          !n.name.toLowerCase().includes(q) &&
          !n.summary.toLowerCase().includes(q) &&
          !subtitle.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [graphData, q, hiddenTypes]);

  // Build a set of visible node UUIDs for edge filtering
  const visibleNodeUuids = useMemo(() => {
    if (!graphData) return new Set<string>();
    return new Set(filteredNodes.map((n) => n.uuid));
  }, [graphData, filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter((e) => {
      if (!visibleNodeUuids.has(e.source_uuid) || !visibleNodeUuids.has(e.target_uuid)) {
        return false;
      }
      if (
        q &&
        !e.fact.toLowerCase().includes(q) &&
        !e.name.toLowerCase().includes(q) &&
        !e.source_name.toLowerCase().includes(q) &&
        !e.target_name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [graphData, q, visibleNodeUuids]);

  // Facts = edges viewed fact-first. Same data, search matches against fact text.
  const filteredFacts = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter((e) => {
      if (!visibleNodeUuids.has(e.source_uuid) || !visibleNodeUuids.has(e.target_uuid)) {
        return false;
      }
      if (
        q &&
        !e.fact.toLowerCase().includes(q) &&
        !e.source_name.toLowerCase().includes(q) &&
        !e.target_name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [graphData, q, visibleNodeUuids]);

  const filteredEpisodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.episodes.filter((ep) => {
      if (
        q &&
        !ep.name.toLowerCase().includes(q) &&
        !ep.content.toLowerCase().includes(q) &&
        !ep.source_description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [graphData, q]);

  if (!graphData) return null;

  return (
    <div className="w-[300px] max-w-[300px] min-w-0 shrink-0 border-r border-border/50 flex flex-col bg-background/80 backdrop-blur-sm">
      {/* Search */}
      <div className="px-3 py-2 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-7 text-xs bg-muted/30 border-transparent focus:border-border/40 rounded-lg"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={sidebarTab}
        onValueChange={(v) => setSidebarTab(v as "nodes" | "edges" | "episodes" | "facts")}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-3 mt-1.5 mb-0.5 h-7 rounded-lg p-0.5 bg-muted/30">
          <TabsTrigger
            value="nodes"
            className="text-[10px] flex items-center gap-1 cursor-pointer rounded-md data-[state=active]:shadow-sm"
          >
            <Circle className="w-2.5 h-2.5" />
            {filteredNodes.length}
          </TabsTrigger>
          <TabsTrigger
            value="edges"
            className="text-[10px] flex items-center gap-1 cursor-pointer rounded-md data-[state=active]:shadow-sm"
          >
            <GitBranch className="w-2.5 h-2.5" />
            {filteredEdges.length}
          </TabsTrigger>
          <TabsTrigger
            value="facts"
            className="text-[10px] flex items-center gap-1 cursor-pointer rounded-md data-[state=active]:shadow-sm"
          >
            <MessageSquareQuote className="w-2.5 h-2.5" />
            {filteredFacts.length}
          </TabsTrigger>
          <TabsTrigger
            value="episodes"
            className="text-[10px] flex items-center gap-1 cursor-pointer rounded-md data-[state=active]:shadow-sm"
          >
            <FileText className="w-2.5 h-2.5" />
            {filteredEpisodes.length}
          </TabsTrigger>
        </TabsList>

        {/* ─── Nodes ─── */}
        <TabsContent value="nodes" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {filteredNodes.map((node) => {
                const color = getNodeColor(node, isDark);
                const isSelected = selectedNode?.uuid === node.uuid;
                const subtitle = getNodeSubtitle(node);
                return (
                  <button
                    key={node.uuid}
                    onClick={() => setSelectedNode(node)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 flex items-start gap-2.5 transition-colors cursor-pointer group relative",
                      isSelected
                        ? "bg-primary/8"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isSelected && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                        style={{ backgroundColor: color }}
                      />
                    )}

                    {/* Color dot */}
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-[3px]"
                      style={{ backgroundColor: color }}
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-[12px] leading-tight truncate",
                        isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                      )}>
                        {node.name}
                      </p>
                      {/* Subtitle uses hex alpha suffix: 99 = 60% opacity */}
                      {subtitle && (
                        <p
                          className="text-[10px] font-medium leading-snug truncate mt-0.5"
                          style={{ color: `${color}99` }}
                        >
                          {subtitle}
                        </p>
                      )}
                      {node.summary && (
                        <p className="text-[10px] text-muted-foreground/70 leading-snug line-clamp-1 mt-0.5">
                          {node.summary}
                        </p>
                      )}
                    </div>

                    {/* Chevron on hover/selected */}
                    <ChevronRight className={cn(
                      "w-3 h-3 shrink-0 mt-0.5 transition-opacity",
                      isSelected ? "opacity-40" : "opacity-0 group-hover:opacity-30"
                    )} />
                  </button>
                );
              })}
              {filteredNodes.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground/60 py-10">
                  No nodes match filters
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Edges ─── */}
        <TabsContent value="edges" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {filteredEdges.map((edge) => {
                const isSelected = selectedEdge?.uuid === edge.uuid;
                const sourceColor = nodeColorMap.get(edge.source_uuid);
                const targetColor = nodeColorMap.get(edge.target_uuid);
                return (
                  <button
                    key={edge.uuid}
                    onClick={() => setSelectedEdge(edge)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 transition-colors cursor-pointer group relative",
                      isSelected
                        ? "bg-primary/8"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                    )}

                    {/* Source → Target */}
                    <div className="flex items-center gap-1 text-[11px]">
                      {sourceColor && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: sourceColor }}
                        />
                      )}
                      <span className="font-medium text-foreground/90 truncate max-w-[80px]">
                        {edge.source_name}
                      </span>
                      <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                      {targetColor && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: targetColor }}
                        />
                      )}
                      <span className="font-medium text-foreground/90 truncate max-w-[80px]">
                        {edge.target_name}
                      </span>
                    </div>

                    {/* Fact */}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-1 leading-snug">
                      {edge.fact}
                    </p>

                    {edge.invalid_at && (
                      <span className="text-[8px] text-destructive/70 font-medium mt-0.5 block">
                        ✕ Invalidated
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredEdges.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground/60 py-10">
                  No edges match filters
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Facts ─── */}
        <TabsContent value="facts" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {filteredFacts.map((edge) => {
                const isSelected = selectedEdge?.uuid === edge.uuid;
                const sourceColor = nodeColorMap.get(edge.source_uuid);
                const targetColor = nodeColorMap.get(edge.target_uuid);
                return (
                  <button
                    key={edge.uuid}
                    onClick={() => setSelectedEdge(edge)}
                    className={cn(
                      "w-full text-left px-3 py-2 transition-colors cursor-pointer group relative",
                      isSelected
                        ? "bg-primary/8"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-sky-500" />
                    )}

                    {/* Fact text — primary content */}
                    <p className={cn(
                      "text-[11px] leading-snug line-clamp-2",
                      isSelected ? "font-semibold text-foreground" : "text-foreground/90"
                    )}>
                      {edge.fact}
                    </p>

                    {/* Source → Target with color dots */}
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/60">
                      {sourceColor && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: sourceColor }}
                        />
                      )}
                      <span className="truncate max-w-[80px]">{edge.source_name}</span>
                      <ChevronRight className="w-2 h-2 shrink-0 opacity-40" />
                      {targetColor && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: targetColor }}
                        />
                      )}
                      <span className="truncate max-w-[80px]">{edge.target_name}</span>
                    </div>

                    {/* Relation badge + invalidation */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] px-1.5 py-0 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">
                        {edge.name.replace(/_/g, " ")}
                      </span>
                      {edge.invalid_at && (
                        <span className="text-[8px] text-destructive/70 font-medium">
                          ✕ Invalidated
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredFacts.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground/60 py-10">
                  No facts match filters
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Episodes ─── */}
        <TabsContent value="episodes" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {filteredEpisodes.map((ep) => {
                const isSelected = selectedEpisode?.uuid === ep.uuid;
                return (
                  <button
                    key={ep.uuid}
                    onClick={() => setSelectedEpisode(ep)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 flex items-start gap-2.5 transition-colors cursor-pointer group relative",
                      isSelected
                        ? "bg-primary/8"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-amber-500" />
                    )}

                    {/* Episode amber matches EPISODE_COLOR in types.ts */}
                    <FileText className="w-3 h-3 text-amber-500/70 shrink-0 mt-0.5" />

                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-[12px] leading-tight truncate",
                        isSelected ? "font-semibold" : "font-medium"
                      )}>
                        {ep.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 leading-snug line-clamp-1 mt-0.5">
                        {ep.source_description || ep.content.slice(0, 80)}
                      </p>
                    </div>

                    <span className="text-[9px] text-amber-600/60 dark:text-amber-400/60 font-medium shrink-0 mt-0.5">
                      {ep.source}
                    </span>
                  </button>
                );
              })}
              {filteredEpisodes.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground/60 py-10">
                  No episodes found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
