"use client";

import { useEffect, useCallback } from "react";
import { useCortexStore } from "@/lib/store";
import { fetchGraph } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import { GraphCanvas } from "@/components/graph-canvas";
import { DetailPanel } from "@/components/detail-panel";
import { StatsBar } from "@/components/stats-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  RefreshCw,
  LogOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function Dashboard() {
  const {
    connection,
    selectedWorkspace,
    graphData,
    isLoading,
    selectedNode,
    selectedEdge,
    selectedEpisode,
    setGraphData,
    setLoading,
    setLoadError,
    disconnect,
  } = useCortexStore();

  const loadGraph = useCallback(async () => {
    if (!connection || !selectedWorkspace) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchGraph(connection, selectedWorkspace);
      setGraphData(data);
      toast.success(
        `Loaded ${data.stats.entity_nodes} nodes, ${data.stats.entity_edges} edges`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load graph";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [connection, selectedWorkspace, setGraphData, setLoading, setLoadError]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const hasSelection = selectedNode || selectedEdge || selectedEpisode;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="h-13 shrink-0 flex items-center justify-between px-4 border-b border-border/50 glass-subtle z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <Image
              src="/logo-brandmark.png"
              alt="Kiara"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary">
            KIARA
          </span>
          <div className="w-px h-4 bg-border/50" />
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Cortex
          </span>
          <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-full">
            {selectedWorkspace}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {graphData && <StatsBar stats={graphData.stats} />}

          <Button
            variant="ghost"
            size="icon"
            onClick={loadGraph}
            disabled={isLoading}
            className="rounded-full w-8 h-8 cursor-pointer"
            aria-label="Refresh graph"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="rounded-full w-8 h-8 text-muted-foreground hover:text-destructive cursor-pointer"
            aria-label="Disconnect"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Graph area */}
        <div className="flex-1 relative">
          {isLoading && !graphData ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading graph data...
                </p>
              </div>
            </div>
          ) : graphData ? (
            <GraphCanvas />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No graph data available
              </p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {hasSelection && <DetailPanel />}
      </div>
    </div>
  );
}
