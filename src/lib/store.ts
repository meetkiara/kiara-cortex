"use client";

import { create } from "zustand";
import {
  ENTITY_COLORS,
  type ConnectionConfig,
  type GraphData,
  type GraphNode,
  type GraphEdge,
  type Episode,
  type EntityType,
  type WorkspaceInfo,
} from "./types";

type HiddenTypesMap = Partial<Record<EntityType, boolean>>;

interface CortexState {
  // Connection
  connection: ConnectionConfig | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Workspace
  workspaces: string[];
  workspaceInfos: WorkspaceInfo[];
  selectedWorkspace: string | null;

  // Graph data
  graphData: GraphData | null;
  isLoading: boolean;
  loadError: string | null;

  // UI State
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  selectedEpisode: Episode | null;
  sidebarTab: "nodes" | "edges" | "episodes" | "facts";
  searchQuery: string;
  hiddenTypes: HiddenTypesMap;
  showEdgeLabels: boolean;

  // Actions
  setConnection: (config: ConnectionConfig) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setWorkspaces: (workspaces: string[]) => void;
  setWorkspaceInfos: (infos: WorkspaceInfo[]) => void;
  setSelectedWorkspace: (workspace: string | null) => void;
  setGraphData: (data: GraphData | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setSelectedEdge: (edge: GraphEdge | null) => void;
  setSelectedEpisode: (episode: Episode | null) => void;
  setSidebarTab: (tab: "nodes" | "edges" | "episodes" | "facts") => void;
  setSearchQuery: (query: string) => void;
  toggleType: (type: EntityType) => void;
  showOnlyType: (type: EntityType) => void;
  showAllTypes: () => void;
  isTypeHidden: (type: EntityType) => boolean;
  toggleEdgeLabels: () => void;
  clearSelection: () => void;
  disconnect: () => void;

  // Mutations
  removeNode: (uuid: string) => void;
  removeEdge: (uuid: string) => void;
}

export const useCortexStore = create<CortexState>((set, get) => ({
  connection: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  workspaces: [],
  workspaceInfos: [],
  selectedWorkspace: null,
  graphData: null,
  isLoading: false,
  loadError: null,
  selectedNode: null,
  selectedEdge: null,
  selectedEpisode: null,
  sidebarTab: "nodes",
  searchQuery: "",
  hiddenTypes: {},
  showEdgeLabels: false,

  setConnection: (config) => set({ connection: config }),
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnectionError: (error) => set({ connectionError: error }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setWorkspaceInfos: (infos) => set({ workspaceInfos: infos }),
  setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
  setGraphData: (data) => set({ graphData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLoadError: (error) => set({ loadError: error }),
  setSelectedNode: (node) =>
    set({ selectedNode: node, selectedEdge: null, selectedEpisode: null }),
  setSelectedEdge: (edge) =>
    set({ selectedEdge: edge, selectedNode: null, selectedEpisode: null }),
  setSelectedEpisode: (episode) =>
    set({ selectedEpisode: episode, selectedNode: null, selectedEdge: null }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleType: (type) =>
    set((state) => ({
      hiddenTypes: {
        ...state.hiddenTypes,
        [type]: !state.hiddenTypes[type],
      },
    })),
  showOnlyType: (type) =>
    set(() => {
      const newHidden: HiddenTypesMap = {};
      for (const t of Object.keys(ENTITY_COLORS) as EntityType[]) {
        if (t !== type) newHidden[t] = true;
      }
      return { hiddenTypes: newHidden };
    }),
  showAllTypes: () => set({ hiddenTypes: {} }),
  isTypeHidden: (type) => !!get().hiddenTypes[type],
  toggleEdgeLabels: () => set((state) => ({ showEdgeLabels: !state.showEdgeLabels })),
  clearSelection: () =>
    set({ selectedNode: null, selectedEdge: null, selectedEpisode: null }),
  disconnect: () =>
    set({
      connection: null,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      workspaces: [],
      workspaceInfos: [],
      selectedWorkspace: null,
      graphData: null,
      selectedNode: null,
      selectedEdge: null,
      selectedEpisode: null,
    }),

  removeNode: (uuid) =>
    set((state) => {
      if (!state.graphData) return {};
      const removedEdges = state.graphData.edges.filter(
        (e) => e.source_uuid === uuid || e.target_uuid === uuid
      );
      return {
        graphData: {
          ...state.graphData,
          nodes: state.graphData.nodes.filter((n) => n.uuid !== uuid),
          edges: state.graphData.edges.filter(
            (e) => e.source_uuid !== uuid && e.target_uuid !== uuid
          ),
          stats: {
            ...state.graphData.stats,
            entity_nodes: state.graphData.stats.entity_nodes - 1,
            total_nodes: state.graphData.stats.total_nodes - 1,
            entity_edges: state.graphData.stats.entity_edges - removedEdges.length,
            total_edges: state.graphData.stats.total_edges - removedEdges.length,
          },
        },
        selectedNode: state.selectedNode?.uuid === uuid ? null : state.selectedNode,
      };
    }),
  removeEdge: (uuid) =>
    set((state) => {
      if (!state.graphData) return {};
      return {
        graphData: {
          ...state.graphData,
          edges: state.graphData.edges.filter((e) => e.uuid !== uuid),
          stats: {
            ...state.graphData.stats,
            entity_edges: state.graphData.stats.entity_edges - 1,
            total_edges: state.graphData.stats.total_edges - 1,
          },
        },
        selectedEdge: state.selectedEdge?.uuid === uuid ? null : state.selectedEdge,
      };
    }),
}));
