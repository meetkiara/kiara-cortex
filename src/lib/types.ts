export interface ConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface GraphNode {
  uuid: string;
  name: string;
  summary: string;
  labels: string[];
  group_id: string;
  created_at: string;
}

export interface GraphEdge {
  uuid: string;
  name: string;
  fact: string;
  source_uuid: string;
  source_name: string;
  target_uuid: string;
  target_name: string;
  created_at: string;
  valid_at: string | null;
  invalid_at: string | null;
  expired_at: string | null;
  group_id: string;
}

export interface Episode {
  uuid: string;
  name: string;
  source: string;
  source_description: string;
  content: string;
  created_at: string;
  group_id: string;
}

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  entity_nodes: number;
  entity_edges: number;
  episodes: number;
}

export interface GraphData {
  workspace_id: string;
  group_id: string;
  stats: GraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
  episodes: Episode[];
}

export type EntityType =
  | "Merchant"
  | "Property"
  | "Unit"
  | "User"
  | "ExpenseCategory"
  | "Entity";

export const ENTITY_COLORS: Record<EntityType, string> = {
  Merchant: "#FF6139",
  Property: "#5BA3A6",
  Unit: "#A1CACC",
  User: "#D4A843",
  ExpenseCategory: "#8B4D4B",
  Entity: "#B8B5A0",
};

export const ENTITY_COLORS_DARK: Record<EntityType, string> = {
  Merchant: "#FF8A6A",
  Property: "#6BC0C3",
  Unit: "#B8DDE0",
  User: "#E0BC5A",
  ExpenseCategory: "#A86B69",
  Entity: "#C8C5B2",
};

export function getEntityType(labels: string[]): EntityType {
  const types: EntityType[] = [
    "Merchant",
    "Property",
    "Unit",
    "User",
    "ExpenseCategory",
  ];
  for (const t of types) {
    if (labels.includes(t)) return t;
  }
  return "Entity";
}
