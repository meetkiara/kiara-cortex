"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCortexStore } from "@/lib/store";
import {
  getEntityType,
  getNodeColor,
  type GraphNode,
  type GraphEdge,
} from "@/lib/types";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Maximize2, ZoomIn, ZoomOut, Tag } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Visual constants — Raw hex/rgba values required here because
   vis-network renders on <canvas> and cannot read CSS custom
   properties or Tailwind classes. These INTENTIONALLY duplicate
   some values from ENTITY_COLORS in types.ts for this reason.
   ────────────────────────────────────────────────────────────── */

const VIS_FONT_FACE = "'DM Sans', system-ui, sans-serif";

const VIS_COLORS = {
  light: {
    fontColor: "#2d1c1a",
    fontColorMuted: "rgba(45,28,26,0.70)",
    fontStroke: "rgba(255,255,255,0.92)",
    edgeColor: "rgba(45,28,26,0.10)",
    edgeHighlight: "rgba(255,97,57,0.55)",
    edgeHover: "rgba(45,28,26,0.32)",
    edgeFontColor: "rgba(45,28,26,0.42)",
    edgeFontStroke: "rgba(255,255,255,0.95)",
    selectionBorder: "#FF6139",
    hoverBorder: "rgba(0,0,0,0.20)",
    bgColor: "transparent",
  },
  dark: {
    fontColor: "#f0f0e8",
    fontColorMuted: "rgba(240,240,232,0.65)",
    fontStroke: "rgba(15,12,11,0.92)",
    edgeColor: "rgba(255,255,255,0.06)",
    edgeHighlight: "rgba(255,138,106,0.60)",
    edgeHover: "rgba(255,255,255,0.28)",
    edgeFontColor: "rgba(255,255,255,0.38)",
    edgeFontStroke: "rgba(15,12,11,0.9)",
    selectionBorder: "#FF8A6A",
    hoverBorder: "rgba(255,255,255,0.25)",
    bgColor: "transparent",
  },
};

type VisTheme = (typeof VIS_COLORS)["light"];

/* ──────────────────────────────────────────────────────────────
   Density-adaptive configuration
   Scales every visual & physics parameter based on node count
   so the same code renders 8-node and 80-node graphs beautifully.
   ────────────────────────────────────────────────────────────── */

/** Density tier thresholds — node count boundaries */
const DENSITY_SMALL = 15;  // <= 15 nodes: spacious, all labels
const DENSITY_MEDIUM = 35; // <= 35 nodes: moderate spacing
const DENSITY_DENSE = 80;  // <= 80 nodes: compact layout
// > 80 nodes: very dense, minimal labels

interface DensityConfig {
  baseSize: number;
  maxSizeBoost: number;
  labelThreshold: number;
  labelFontSize: number;
  hoverFontSize: number;
  maxLabelLen: number;
  edgeWidth: number;
  edgeLabelSize: number;
  edgeAlphaLight: string;
  edgeAlphaDark: string;
  arrowScale: number;
  smoothType: "curvedCW" | "continuous";
  smoothRoundness: number;
  gravity: number;
  centralGravity: number;
  springLength: number;
  springConstant: number;
  damping: number;
  avoidOverlap: number;
  stabIterations: number;
  maxVelocity: number;
  borderWidth: number;
  shadowSize: number;
}

function getDensityConfig(nodeCount: number): DensityConfig {
  // Small: spacious, labels everywhere
  if (nodeCount <= DENSITY_SMALL)
    return {
      baseSize: 24,
      maxSizeBoost: 20,
      labelThreshold: 0, // show all labels
      labelFontSize: 13,
      hoverFontSize: 16,
      maxLabelLen: 22,
      edgeWidth: 1.4,
      edgeLabelSize: 9,
      edgeAlphaLight: "28",
      edgeAlphaDark: "30",
      arrowScale: 0.5,
      smoothType: "curvedCW",
      smoothRoundness: 0.15,
      gravity: -50,
      centralGravity: 0.01,
      springLength: 100,
      springConstant: 0.04,
      damping: 0.4,
      avoidOverlap: 0.6,
      stabIterations: 300,
      maxVelocity: 30,
      borderWidth: 1.5,
      shadowSize: 10,
    };

  // Medium
  if (nodeCount <= DENSITY_MEDIUM)
    return {
      baseSize: 20,
      maxSizeBoost: 15,
      labelThreshold: 1, // hide isolates
      labelFontSize: 14,
      hoverFontSize: 18,
      maxLabelLen: 18,
      edgeWidth: 1.0,
      edgeLabelSize: 10,
      edgeAlphaLight: "22",
      edgeAlphaDark: "25",
      arrowScale: 0.4,
      smoothType: "continuous",
      smoothRoundness: 0.12,
      gravity: -120,
      centralGravity: 0.008,
      springLength: 180,
      springConstant: 0.028,
      damping: 0.38,
      avoidOverlap: 0.75,
      stabIterations: 450,
      maxVelocity: 25,
      borderWidth: 1.2,
      shadowSize: 8,
    };

  // Dense: 36–80 nodes
  // At overview fit-zoom ≈ 0.35-0.5x, so hover font needs to be
  // large in graph-coords to be readable at that zoom.
  if (nodeCount <= DENSITY_DENSE)
    return {
      baseSize: 18,
      maxSizeBoost: 12,
      labelThreshold: 4, // only true hubs — ~5-8 nodes at overview
      labelFontSize: 14,
      hoverFontSize: 40, // large in graph-coords so labels readable even at overview zoom
      maxLabelLen: 18,
      edgeWidth: 0.7,
      edgeLabelSize: 10,
      edgeAlphaLight: "20",
      edgeAlphaDark: "22",
      arrowScale: 0.35,
      smoothType: "continuous",
      smoothRoundness: 0.1,
      gravity: -100,
      centralGravity: 0.006,
      springLength: 120,
      springConstant: 0.025,
      damping: 0.38,
      avoidOverlap: 0.9,
      stabIterations: 500,
      maxVelocity: 25,
      borderWidth: 1,
      shadowSize: 8,
    };

  // Very large: >80 nodes
  // fit-zoom ≈ 0.2-0.3x → need even larger hover fonts
  return {
    baseSize: 14,
    maxSizeBoost: 10,
    labelThreshold: 5,
    labelFontSize: 16,
    hoverFontSize: 50, // compensate for very low zoom levels
    maxLabelLen: 14,
    edgeWidth: 0.4,
    edgeLabelSize: 10,
    edgeAlphaLight: "16",
    edgeAlphaDark: "18",
    arrowScale: 0.24,
    smoothType: "continuous",
    smoothRoundness: 0.08,
    gravity: -140,
    centralGravity: 0.004,
    springLength: 140,
    springConstant: 0.018,
    damping: 0.32,
    avoidOverlap: 0.92,
    stabIterations: 700,
    maxVelocity: 20,
    borderWidth: 0.6,
    shadowSize: 5,
  };
}

/* ──────────────────────────────────────────────────────────────
   Pure helper functions for building vis-network data
   ────────────────────────────────────────────────────────────── */

/** Pre-compute degree (edge count) per node UUID — O(E) */
function computeDegreeMap(edges: GraphEdge[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of edges) {
    map.set(e.source_uuid, (map.get(e.source_uuid) || 0) + 1);
    map.set(e.target_uuid, (map.get(e.target_uuid) || 0) + 1);
  }
  return map;
}

/** Build vis-network node data from filtered graph nodes */
function buildVisNodes(
  filteredNodes: GraphNode[],
  degreeMap: Map<string, number>,
  maxDegree: number,
  cfg: DensityConfig,
  theme: VisTheme,
  savedPositions: Record<string, { x: number; y: number }>,
  isDark: boolean,
) {
  return filteredNodes.map((n) => {
    const color = getNodeColor(n, isDark);
    const degree = degreeMap.get(n.uuid) || 0;
    const pos = savedPositions[n.uuid];

    // Logarithmic degree scaling — hubs grow, periphery stays small
    const sizeBoost = Math.min(
      Math.log2(degree + 1) * (cfg.maxSizeBoost / 2.2),
      cfg.maxSizeBoost
    );
    const nodeSize = cfg.baseSize + sizeBoost;

    // 3-tier label visibility:
    //   Hub (degree ≥ threshold) → full label, always visible
    //   Mid (degree ≥ threshold/2) → smaller label, muted color
    //   Leaf → invisible, revealed on hover/select
    const isHub = degree >= cfg.labelThreshold;
    const isMid =
      !isHub && degree >= Math.max(Math.floor(cfg.labelThreshold / 2), 1);
    const displayLabel =
      n.name.length > cfg.maxLabelLen
        ? n.name.slice(0, cfg.maxLabelLen) + "\u2026"
        : n.name;

    // Font config per tier
    let fontColor: string;
    let fontSize: number;
    let fontStroke: number;
    if (isHub) {
      fontColor = theme.fontColor;
      fontSize = cfg.labelFontSize;
      fontStroke = Math.round(cfg.labelFontSize * 0.22);
    } else if (isMid) {
      fontColor = theme.fontColorMuted;
      fontSize = Math.round(cfg.labelFontSize * 0.82);
      fontStroke = Math.round(cfg.labelFontSize * 0.18);
    } else {
      fontColor = "transparent";
      fontSize = 4;
      fontStroke = 0;
    }

    return {
      id: n.uuid,
      label: displayLabel,
      ...(pos ? { x: pos.x, y: pos.y } : {}),
      color: {
        background: color,
        border: `${color}00`, // invisible border by default
        highlight: {
          background: color,
          border: theme.selectionBorder,
        },
        hover: {
          background: color,
          border: theme.hoverBorder,
        },
      },
      font: {
        color: fontColor,
        size: fontSize,
        face: VIS_FONT_FACE,
        strokeWidth: fontStroke,
        strokeColor: theme.fontStroke,
      },
      shape: "dot",
      size: nodeSize,
      borderWidth: isHub ? cfg.borderWidth : isMid ? cfg.borderWidth * 0.6 : 0,
      borderWidthSelected: 3,
      // Chosen callbacks — reveal labels on hover, enhance selection
      chosen: {
        node: (values: Record<string, unknown>) => {
          values.borderWidth = 2.5;
          values.borderColor = theme.selectionBorder;
          values.shadow = true;
          values.shadowColor = `${color}55`;
          values.shadowSize = 25;
          values.size = nodeSize * 1.08; // subtle grow on hover
        },
        label: (
          values: Record<string, unknown>,
          _id: string,
          selected: boolean,
          hovering: boolean
        ) => {
          if (hovering || selected) {
            values.color = theme.fontColor;
            values.size = cfg.hoverFontSize;
            values.strokeWidth = Math.round(cfg.hoverFontSize * 0.28);
            values.strokeColor = theme.fontStroke;
            values.vadjust = -2; // slight upward shift away from node
          }
        },
      },
      shadow: {
        enabled: true,
        color: `${color}25`,
        size: cfg.shadowSize,
        x: 0,
        y: 1,
      },
      _data: n,
    };
  });
}

/** Build vis-network edge data, filtering to only edges between visible nodes */
function buildVisEdges(
  edges: GraphEdge[],
  visibleNodeIds: Set<string>,
  nodeColorMap: Map<string, string>,
  cfg: DensityConfig,
  theme: VisTheme,
  isDark: boolean,
  showEdgeLabels: boolean,
) {
  const edgeAlpha = isDark ? cfg.edgeAlphaDark : cfg.edgeAlphaLight;

  return edges
    .filter(
      (e) =>
        visibleNodeIds.has(e.source_uuid) &&
        visibleNodeIds.has(e.target_uuid)
    )
    .map((e) => {
      const sourceColor = nodeColorMap.get(e.source_uuid);
      const edgeBaseColor = sourceColor
        ? `${sourceColor}${edgeAlpha}`
        : theme.edgeColor;

      const edgeLabel = e.name
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        id: e.uuid,
        from: e.source_uuid,
        to: e.target_uuid,
        label: showEdgeLabels ? edgeLabel : "",
        arrows: {
          to: {
            enabled: true,
            scaleFactor: cfg.arrowScale,
            type: "arrow",
          },
        },
        color: {
          color: edgeBaseColor,
          highlight: theme.edgeHighlight,
          hover: theme.edgeHover,
          opacity: 1.0,
        },
        font: {
          color: theme.edgeFontColor,
          size: cfg.edgeLabelSize,
          face: VIS_FONT_FACE,
          strokeWidth: 2,
          strokeColor: theme.edgeFontStroke,
          align: "middle",
        },
        width: e.invalid_at ? cfg.edgeWidth * 0.6 : cfg.edgeWidth,
        hoverWidth: 1.0,
        selectionWidth: 1.5,
        dashes: e.invalid_at ? [4, 4] : false,
        smooth: {
          enabled: true,
          type: cfg.smoothType,
          roundness: cfg.smoothRoundness,
        },
        _data: e,
      };
    });
}

/** Disable native vis-network tooltips; we use custom hover labels instead */
const VIS_TOOLTIP_DISABLED = 9999999;

/** Fixed seed for deterministic layout across renders of identical data */
const VIS_LAYOUT_SEED = 42;

/** Build vis-network options from density config */
function getNetworkOptions(cfg: DensityConfig, hasPositions: boolean) {
  return {
    physics: {
      enabled: !hasPositions,
      solver: "forceAtlas2Based",
      forceAtlas2Based: {
        gravitationalConstant: cfg.gravity,
        centralGravity: cfg.centralGravity,
        springLength: cfg.springLength,
        springConstant: cfg.springConstant,
        damping: cfg.damping,
        avoidOverlap: cfg.avoidOverlap,
      },
      stabilization: {
        enabled: !hasPositions,
        iterations: cfg.stabIterations,
        updateInterval: 25,
      },
      maxVelocity: cfg.maxVelocity,
      minVelocity: 0.3,
    },
    interaction: {
      hover: true,
      hoverConnectedEdges: true,
      selectConnectedEdges: false,
      tooltipDelay: VIS_TOOLTIP_DISABLED,
      zoomView: true,
      dragView: true,
      multiselect: false,
      navigationButtons: false,
      keyboard: { enabled: true, bindToWindow: false },
    },
    layout: {
      improvedLayout: !hasPositions,
      randomSeed: VIS_LAYOUT_SEED,
    },
  };
}

/* ──────────────────────────────────────────────────────────────
   GraphCanvas Component
   ────────────────────────────────────────────────────────────── */

type VisNetwork = {
  destroy: () => void;
  getPositions: () => Record<string, { x: number; y: number }>;
  fit: (options?: {
    animation?: { duration: number; easingFunction: string };
    maxZoomLevel?: number;
  }) => void;
  getScale: () => number;
  moveTo: (options: {
    scale: number;
    animation?: { duration: number; easingFunction: string };
  }) => void;
  setOptions: (options: Record<string, unknown>) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

export function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<VisNetwork | null>(null);
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>(
    {}
  );
  const {
    graphData,
    hiddenTypes,
    showEdgeLabels,
    toggleEdgeLabels,
    setSelectedNode,
    setSelectedEdge,
  } = useCortexStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /* ── Zoom / Fit controls ── */

  const handleFit = useCallback(() => {
    if (!networkRef.current) return;
    networkRef.current.fit({
      animation: { duration: 500, easingFunction: "easeInOutQuad" },
      maxZoomLevel: 1.5,
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!networkRef.current) return;
    const s = networkRef.current.getScale();
    networkRef.current.moveTo({
      scale: s * 1.4,
      animation: { duration: 250, easingFunction: "easeInOutQuad" },
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!networkRef.current) return;
    const s = networkRef.current.getScale();
    networkRef.current.moveTo({
      scale: s / 1.4,
      animation: { duration: 250, easingFunction: "easeInOutQuad" },
    });
  }, []);

  /* ── Network initialization ── */

  const initNetwork = useCallback(async () => {
    if (!containerRef.current || !graphData) return;

    const vis = await import("vis-network/standalone");
    const theme = isDark ? VIS_COLORS.dark : VIS_COLORS.light;

    // Merge current positions BEFORE destroying the old network.
    // This preserves positions for ALL nodes — including ones about to be hidden.
    // Without this merge, getPositions() in cleanup only captures visible nodes,
    // so hidden nodes lose their positions and pile up at (0,0) when re-shown.
    if (networkRef.current) {
      try {
        const current = networkRef.current.getPositions();
        savedPositionsRef.current = { ...savedPositionsRef.current, ...current };
      } catch { /* network may be in bad state */ }
    }

    const savedPositions = savedPositionsRef.current;
    const hasPositions = Object.keys(savedPositions).length > 0;

    // Pre-compute degree map and max degree (for node size scaling)
    const degreeMap = computeDegreeMap(graphData.edges);
    let maxDegree = 0;
    for (const d of degreeMap.values()) {
      if (d > maxDegree) maxDegree = d;
    }

    // Filter visible nodes & get density config
    const filteredNodes = graphData.nodes.filter((n) => {
      const type = getEntityType(n.labels);
      return !hiddenTypes[type];
    });
    const cfg = getDensityConfig(filteredNodes.length);

    // Build vis data
    const visNodes = buildVisNodes(
      filteredNodes, degreeMap, maxDegree, cfg, theme, savedPositions, isDark
    );

    // Smart placement: detect nodes without saved positions (newly shown or first-time)
    // and place them near the centroid of their connected visible neighbors + jitter,
    // so they don't pile up at (0,0) when physics is disabled.
    let newNodeCount = 0;
    if (hasPositions) {
      for (const vn of visNodes) {
        if (!savedPositions[vn.id]) {
          newNodeCount++;
          const neighborIds = graphData.edges
            .filter((e) => e.source_uuid === vn.id || e.target_uuid === vn.id)
            .map((e) => e.source_uuid === vn.id ? e.target_uuid : e.source_uuid)
            .filter((id) => savedPositions[id]);

          if (neighborIds.length > 0) {
            const cx = neighborIds.reduce((s, id) => s + savedPositions[id].x, 0) / neighborIds.length;
            const cy = neighborIds.reduce((s, id) => s + savedPositions[id].y, 0) / neighborIds.length;
            const jitter = 40 + Math.random() * 60;
            const angle = Math.random() * Math.PI * 2;
            vn.x = cx + Math.cos(angle) * jitter;
            vn.y = cy + Math.sin(angle) * jitter;
          } else {
            vn.x = (Math.random() - 0.5) * 300;
            vn.y = (Math.random() - 0.5) * 300;
          }
        }
      }
    }

    const nodeColorMap = new Map<string, string>();
    for (const vn of visNodes) {
      nodeColorMap.set(vn.id, vn.color.background);
    }

    const visibleNodeIds = new Set(visNodes.map((n) => n.id));
    const visEdges = buildVisEdges(
      graphData.edges, visibleNodeIds, nodeColorMap, cfg, theme, isDark, showEdgeLabels
    );

    // Create DataSets and mount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vis-network's generic types are overly strict with custom node shapes
    const data: any = {
      nodes: new vis.DataSet(visNodes),
      edges: new vis.DataSet(visEdges),
    };
    const options = getNetworkOptions(cfg, hasPositions);

    if (networkRef.current) {
      networkRef.current.destroy();
    }

    const network = new vis.Network(
      containerRef.current,
      data,
      options
    ) as unknown as VisNetwork;
    networkRef.current = network;

    // Event handlers
    network.on("click", (params: unknown) => {
      const p = params as { nodes?: string[]; edges?: string[] };
      if (p.nodes && p.nodes.length > 0) {
        const nodeId = p.nodes[0];
        const node = graphData.nodes.find((n) => n.uuid === nodeId);
        if (node) setSelectedNode(node);
      } else if (p.edges && p.edges.length > 0) {
        const edgeId = p.edges[0];
        const edge = graphData.edges.find((e) => e.uuid === edgeId);
        if (edge) setSelectedEdge(edge);
      }
    });

    // After stabilization: freeze physics, fit to view
    if (!hasPositions) {
      network.on("stabilizationIterationsDone", () => {
        network.setOptions({ physics: { enabled: false } });
        setTimeout(() => {
          network.fit({
            animation: { duration: 700, easingFunction: "easeInOutQuad" },
          });
        }, 80);
      });
    } else if (newNodeCount > 0) {
      // Brief physics pulse so newly shown nodes settle near their neighbors
      network.setOptions({
        physics: {
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: cfg.gravity,
            centralGravity: cfg.centralGravity,
            springLength: cfg.springLength,
            springConstant: cfg.springConstant,
            damping: 0.6,
            avoidOverlap: cfg.avoidOverlap,
          },
          stabilization: {
            enabled: true,
            iterations: 150,
            updateInterval: 25,
          },
        },
      });
      network.on("stabilizationIterationsDone", () => {
        network.setOptions({ physics: { enabled: false } });
      });
    }
  }, [
    graphData,
    hiddenTypes,
    showEdgeLabels,
    isDark,
    setSelectedNode,
    setSelectedEdge,
  ]);

  /* ── Lifecycle ── */

  useEffect(() => {
    initNetwork();
    return () => {
      if (networkRef.current) {
        try {
          const pos = networkRef.current.getPositions();
          // Merge — don't overwrite. Hidden nodes keep their last-known positions.
          savedPositionsRef.current = { ...savedPositionsRef.current, ...pos };
        } catch {
          /* network may already be in bad state */
        }
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [initNetwork]);

  /* ── Render ── */

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full graph-canvas-bg" />

      {/* Floating graph controls */}
      <div className="graph-controls absolute bottom-4 right-4 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleEdgeLabels}
              className={`w-8 h-8 rounded-lg cursor-pointer hover:bg-foreground/10 ${showEdgeLabels ? "text-primary bg-primary/10" : ""}`}
              aria-label={
                showEdgeLabels ? "Hide edge labels" : "Show edge labels"
              }
            >
              <Tag className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {showEdgeLabels ? "Hide edge labels" : "Show edge labels"}
          </TooltipContent>
        </Tooltip>

        <div className="w-5 mx-auto border-t border-border/30 my-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFit}
              className="w-8 h-8 rounded-lg cursor-pointer hover:bg-foreground/10"
              aria-label="Fit graph to view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Fit to view
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-lg cursor-pointer hover:bg-foreground/10"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Zoom in
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-lg cursor-pointer hover:bg-foreground/10"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Zoom out
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
