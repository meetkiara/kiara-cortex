"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCortexStore } from "@/lib/store";
import {
  getEntityType,
  ENTITY_COLORS,
  ENTITY_COLORS_DARK,
} from "@/lib/types";
import { useTheme } from "next-themes";

/** Font stack shared across vis-network node/edge labels */
const VIS_FONT_FACE = "'DM Sans', system-ui, sans-serif";

/** Theme-resolved colors for vis-network (needs raw values, not CSS vars) */
const VIS_COLORS = {
  light: {
    fontColor: "#2d1c1a",
    fontStroke: "rgba(255,255,255,0.8)",
    edgeColor: "rgba(45,28,26,0.15)",
    edgeHighlight: "rgba(255,97,57,0.5)",
    edgeHover: "rgba(45,28,26,0.3)",
    edgeFontColor: "rgba(45,28,26,0.4)",
    edgeFontStroke: "rgba(255,255,255,0.9)",
    selectionBorder: "#000000",
    hoverBorder: "rgba(0,0,0,0.3)",
  },
  dark: {
    fontColor: "#e8e8e0",
    fontStroke: "rgba(20,15,14,0.8)",
    edgeColor: "rgba(255,255,255,0.12)",
    edgeHighlight: "rgba(255,138,106,0.6)",
    edgeHover: "rgba(255,255,255,0.25)",
    edgeFontColor: "rgba(255,255,255,0.4)",
    edgeFontStroke: "rgba(20,15,14,0.9)",
    selectionBorder: "#ffffff",
    hoverBorder: "rgba(255,255,255,0.5)",
  },
} as const;

export function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<unknown>(null);
  const { graphData, hiddenTypes, setSelectedNode, setSelectedEdge } =
    useCortexStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const colors = isDark ? ENTITY_COLORS_DARK : ENTITY_COLORS;

  const initNetwork = useCallback(async () => {
    if (!containerRef.current || !graphData) return;

    const vis = await import("vis-network/standalone");
    const theme = isDark ? VIS_COLORS.dark : VIS_COLORS.light;

    // Pre-compute degree map: O(E) instead of O(N*E)
    const degreeMap = new Map<string, number>();
    for (const e of graphData.edges) {
      degreeMap.set(e.source_uuid, (degreeMap.get(e.source_uuid) || 0) + 1);
      degreeMap.set(e.target_uuid, (degreeMap.get(e.target_uuid) || 0) + 1);
    }

    // Build nodes dataset
    const visNodes = graphData.nodes
      .filter((n) => {
        const type = getEntityType(n.labels);
        return !hiddenTypes[type];
      })
      .map((n) => {
        const type = getEntityType(n.labels);
        const color = colors[type];
        const degree = degreeMap.get(n.uuid) || 0;
        return {
          id: n.uuid,
          label: n.name,
          title: `${n.name}\n${type}\n${n.summary || ""}`,
          color: {
            background: color,
            border: color,
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
            color: theme.fontColor,
            size: 11,
            face: VIS_FONT_FACE,
            strokeWidth: 2,
            strokeColor: theme.fontStroke,
          },
          shape: "dot",
          size: 16 + Math.min(degree * 3, 20),
          borderWidth: 2,
          borderWidthSelected: 3,
          shadow: {
            enabled: true,
            color: `${color}40`,
            size: 8,
            x: 0,
            y: 2,
          },
          _data: n,
        };
      });

    // Filter edges to only include visible nodes
    const visibleNodeIds = new Set(visNodes.map((n) => n.id));
    const visEdges = graphData.edges
      .filter(
        (e) => visibleNodeIds.has(e.source_uuid) && visibleNodeIds.has(e.target_uuid)
      )
      .map((e) => ({
        id: e.uuid,
        from: e.source_uuid,
        to: e.target_uuid,
        label: e.name,
        title: e.fact,
        arrows: {
          to: { enabled: true, scaleFactor: 0.5 },
        },
        color: {
          color: theme.edgeColor,
          highlight: theme.edgeHighlight,
          hover: theme.edgeHover,
        },
        font: {
          color: theme.edgeFontColor,
          size: 9,
          face: VIS_FONT_FACE,
          strokeWidth: 2,
          strokeColor: theme.edgeFontStroke,
          align: "middle",
        },
        width: e.invalid_at ? 1 : 1.5,
        dashes: e.invalid_at ? [4, 4] : false,
        smooth: {
          enabled: true,
          type: "curvedCW",
          roundness: 0.15,
        },
        _data: e,
      }));

    const data = {
      nodes: new vis.DataSet(visNodes),
      edges: new vis.DataSet(visEdges),
    };

    const options = {
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -60,
          centralGravity: 0.008,
          springLength: 120,
          springConstant: 0.04,
          damping: 0.4,
          avoidOverlap: 0.3,
        },
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25,
        },
        maxVelocity: 30,
        minVelocity: 0.5,
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        multiselect: false,
        navigationButtons: false,
        keyboard: {
          enabled: true,
          bindToWindow: false,
        },
      },
      layout: {
        improvedLayout: true,
      },
    };

    // Destroy previous network
    if (networkRef.current) {
      (networkRef.current as { destroy: () => void }).destroy();
    }

    const network = new vis.Network(containerRef.current, data, options);
    networkRef.current = network;

    // Click handlers
    network.on("click", (params: { nodes?: string[]; edges?: string[] }) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = graphData.nodes.find((n) => n.uuid === nodeId);
        if (node) setSelectedNode(node);
      } else if (params.edges && params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = graphData.edges.find((e) => e.uuid === edgeId);
        if (edge) setSelectedEdge(edge);
      }
    });

    // Stop physics after stabilization
    network.on("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } });
    });
  }, [graphData, hiddenTypes, isDark, colors, setSelectedNode, setSelectedEdge]);

  useEffect(() => {
    initNetwork();
    return () => {
      if (networkRef.current) {
        (networkRef.current as { destroy: () => void }).destroy();
        networkRef.current = null;
      }
    };
  }, [initNetwork]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full graph-canvas-bg"
    />
  );
}
