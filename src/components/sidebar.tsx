"use client";

import { useMemo } from "react";
import { useCortexStore } from "@/lib/store";
import { getEntityType, ENTITY_COLORS, ENTITY_COLORS_DARK, type EntityType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  Search,
  Circle,
  GitBranch,
  FileText,
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
    toggleType,
  } = useCortexStore();

  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? ENTITY_COLORS_DARK : ENTITY_COLORS;

  const q = searchQuery.toLowerCase();

  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((n) => {
      if (q && !n.name.toLowerCase().includes(q) && !n.summary.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [graphData, q]);

  const filteredEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter((e) => {
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
  }, [graphData, q]);

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

  // Count by type
  const typeCounts: Record<string, number> = {};
  for (const n of graphData.nodes) {
    const t = getEntityType(n.labels);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return (
    <div className="w-72 shrink-0 border-r border-border/50 flex flex-col bg-sidebar/50">
      {/* Search */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes, facts, episodes..."
            className="pl-8 h-8 text-xs bg-background/50 border-border/30"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-b border-border/50">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
          Entity Types
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ENTITY_COLORS) as EntityType[]).map((type) => {
            const isHidden = !!hiddenTypes[type];
            const color = colors[type];
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                aria-label={`Toggle ${type} visibility`}
                aria-pressed={!isHidden}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer border",
                  isHidden
                    ? "opacity-30 border-border/30"
                    : "opacity-100 border-transparent"
                )}
                style={{
                  backgroundColor: isHidden ? "transparent" : `${color}20`,
                  color,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {type}
                {typeCounts[type] ? (
                  <span className="opacity-60">({typeCounts[type]})</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={sidebarTab}
        onValueChange={(v) => setSidebarTab(v as "nodes" | "edges" | "episodes")}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-3 mt-2 h-8 rounded-full p-0.5">
          <TabsTrigger
            value="nodes"
            className="text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Circle className="w-3 h-3" />
            Nodes ({filteredNodes.length})
          </TabsTrigger>
          <TabsTrigger
            value="edges"
            className="text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <GitBranch className="w-3 h-3" />
            Edges ({filteredEdges.length})
          </TabsTrigger>
          <TabsTrigger
            value="episodes"
            className="text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            Ep ({filteredEpisodes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nodes" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {filteredNodes.map((node) => {
                const type = getEntityType(node.labels);
                const color = colors[type];
                const isSelected = selectedNode?.uuid === node.uuid;
                return (
                  <button
                    key={node.uuid}
                    onClick={() => setSelectedNode(node)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-all group cursor-pointer",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium truncate">{node.name}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] px-1.5 py-0 h-4 shrink-0"
                        style={{
                          color,
                          borderColor: `${color}40`,
                        }}
                      >
                        {type}
                      </Badge>
                    </div>
                    {node.summary && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 pl-4">
                        {node.summary}
                      </p>
                    )}
                  </button>
                );
              })}
              {filteredNodes.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No nodes found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="edges" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {filteredEdges.map((edge) => {
                const isSelected = selectedEdge?.uuid === edge.uuid;
                return (
                  <button
                    key={edge.uuid}
                    onClick={() => setSelectedEdge(edge)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground truncate">
                        {edge.source_name}
                      </span>
                      <span className="text-primary">&rarr;</span>
                      <span className="font-medium text-foreground truncate">
                        {edge.target_name}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      {edge.fact}
                    </p>
                    {edge.invalid_at && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[8px] text-destructive border-destructive/30"
                      >
                        Invalidated
                      </Badge>
                    )}
                  </button>
                );
              })}
              {filteredEdges.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No edges found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="episodes" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {filteredEpisodes.map((ep) => {
                const isSelected = selectedEpisode?.uuid === ep.uuid;
                return (
                  <button
                    key={ep.uuid}
                    onClick={() => setSelectedEpisode(ep)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{ep.name}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] px-1.5 py-0 h-4 shrink-0"
                      >
                        {ep.source}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 pl-5">
                      {ep.source_description || ep.content.slice(0, 80)}
                    </p>
                  </button>
                );
              })}
              {filteredEpisodes.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
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
