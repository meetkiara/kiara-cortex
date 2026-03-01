"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useCortexStore } from "@/lib/store";
import { fetchGraph } from "@/lib/api";
import { savePersistedState, clearPersistedState } from "@/lib/persist";
import { Sidebar } from "@/components/sidebar";
import { WorkspaceDropdown } from "@/components/workspace-dropdown";
import { GraphCanvas } from "@/components/graph-canvas";
import { DetailPanel } from "@/components/detail-panel";
import { StatsBar } from "@/components/stats-bar";
import { EntityFilterBar } from "@/components/entity-filter-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  RefreshCw,
  LogOut,
  Loader2,
  Network,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const {
    connection,
    workspaces,
    workspaceInfos,
    selectedWorkspace,
    graphData,
    isLoading,
    selectedNode,
    selectedEdge,
    selectedEpisode,
    setSelectedWorkspace,
    setGraphData,
    setLoading,
    setLoadError,
    disconnect,
    clearSelection,
  } = useCortexStore();

  /* ─── Inline status toast (glassmorphed bar) ─── */
  const [statusToast, setStatusToast] = useState<{
    type: "success" | "error";
    message: string;
    nodeCount?: number;
    edgeCount?: number;
    episodeCount?: number;
  } | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = useCallback(
    (msg: typeof statusToast) => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      setStatusToast(msg);
      statusTimerRef.current = setTimeout(() => setStatusToast(null), 4000);
    },
    []
  );

  const loadGraph = useCallback(async () => {
    if (!connection || !selectedWorkspace) return;
    setLoading(true);
    setLoadError(null);
    clearSelection();
    try {
      const data = await fetchGraph(connection, selectedWorkspace);
      setGraphData(data);
      showStatus({
        type: "success",
        message: "Graph loaded",
        nodeCount: data.stats.entity_nodes,
        edgeCount: data.stats.entity_edges,
        episodeCount: data.stats.episodes,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load graph";
      setLoadError(msg);
      showStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [connection, selectedWorkspace, setGraphData, setLoading, setLoadError, clearSelection, showStatus]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadGraph();
    }
  }, [selectedWorkspace, loadGraph]);

  // Auto-select if only 1 workspace
  useEffect(() => {
    if (workspaces.length === 1 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]);
    }
  }, [workspaces, selectedWorkspace, setSelectedWorkspace]);

  const handleWorkspaceChange = (value: string) => {
    if (value !== selectedWorkspace) {
      setGraphData(null);
      setSelectedWorkspace(value);
      // Persist workspace selection
      if (connection) {
        savePersistedState({ connection, workspace: value });
      }
    }
  };

  const handleDisconnect = () => {
    clearPersistedState();
    disconnect();
  };

  const hasSelection = selectedNode || selectedEdge || selectedEpisode;
  const hasGraph = !!graphData && !!selectedWorkspace;

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

          {/* Workspace selector — custom dropdown */}
          <div className="w-px h-4 bg-border/50" />
          <WorkspaceDropdown
            workspaces={workspaces}
            workspaceInfos={workspaceInfos}
            selectedWorkspace={selectedWorkspace}
            onSelect={handleWorkspaceChange}
          />
        </div>

        <div className="flex items-center gap-2">
          {graphData && <StatsBar stats={graphData.stats} />}

          {selectedWorkspace && (
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
          )}

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDisconnect}
            className="rounded-full w-8 h-8 text-muted-foreground hover:text-destructive cursor-pointer"
            aria-label="Disconnect"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Entity type filter bar — chart-legend style toggles */}
      {hasGraph && <EntityFilterBar />}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — only when graph loaded */}
        {hasGraph && <Sidebar />}

        {/* Graph area */}
        <div className="flex-1 relative">
          {!selectedWorkspace ? (
            /* Empty state — no workspace selected */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-xs animate-fade-in">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/30 border border-border/20 flex items-center justify-center">
                  <Network className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Select a workspace
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a workspace from the dropdown above to explore its knowledge graph.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/50">
                  <Sparkles className="w-3 h-3" />
                  <span>{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} available</span>
                </div>
              </div>
            </div>
          ) : isLoading && !graphData ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 animate-fade-in">
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

          {/* Glassmorphed status bar */}
          {statusToast && (
            <div
              className={cn(
                "absolute bottom-5 left-1/2 -translate-x-1/2 z-20",
                "animate-slide-up"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 rounded-full",
                  "glass shadow-lg border",
                  statusToast.type === "success"
                    ? "border-emerald-500/20"
                    : "border-destructive/25"
                )}
              >
                {statusToast.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <span className="text-[11px] font-medium text-foreground">
                  {statusToast.message}
                </span>
                {statusToast.nodeCount != null && (
                  <>
                    <span className="w-px h-3 bg-border/50" />
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span>
                        {statusToast.nodeCount}{" "}
                        <span className="text-foreground/50">nodes</span>
                      </span>
                      <span className="text-border/60">·</span>
                      <span>
                        {statusToast.edgeCount}{" "}
                        <span className="text-foreground/50">edges</span>
                      </span>
                      {(statusToast.episodeCount ?? 0) > 0 && (
                        <>
                          <span className="text-border/60">·</span>
                          <span>
                            {statusToast.episodeCount}{" "}
                            <span className="text-foreground/50">ep</span>
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
                <button
                  onClick={() => setStatusToast(null)}
                  className="ml-1 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {hasSelection && <DetailPanel />}
      </div>
    </div>
  );
}
