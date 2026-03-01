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
  /** Entity-specific attributes (address, role, service_type, etc.) */
  attributes?: Record<string, unknown>;
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

export interface WorkspaceInfo {
  name: string;
  nodeCount: number;
  edgeCount: number;
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
  | "ClassificationPreference"
  | "Entity";

/** Amber color used for episodes across sidebar, detail panel, and stats bar */
export const EPISODE_COLOR = { light: "#F59E0B", dark: "#FBBF24" } as const;

export const ENTITY_COLORS: Record<EntityType, string> = {
  Merchant: "#FF5722",
  Property: "#0EA5E9",
  Unit: "#8B5CF6",
  User: "#F59E0B",
  ExpenseCategory: "#EF4444",
  ClassificationPreference: "#14B8A6",
  Entity: "#6B7280",
};

export const ENTITY_COLORS_DARK: Record<EntityType, string> = {
  Merchant: "#FF7043",
  Property: "#38BDF8",
  Unit: "#A78BFA",
  User: "#FBBF24",
  ExpenseCategory: "#F87171",
  ClassificationPreference: "#2DD4BF",
  Entity: "#9CA3AF",
};

export function getEntityType(labels: string[]): EntityType {
  const types: EntityType[] = [
    "Merchant",
    "Property",
    "Unit",
    "User",
    "ExpenseCategory",
    "ClassificationPreference",
  ];
  for (const t of types) {
    if (labels.includes(t)) return t;
  }
  return "Entity";
}

/**
 * Vibrant color palette for individual node coloring.
 * Used when nodes are generic "Entity" type — assigns a distinct
 * hue to each node based on its name hash so every node stands out.
 */
const NODE_PALETTE_LIGHT = [
  "#FF5722", // deep orange
  "#0EA5E9", // sky blue
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EF4444", // red
  "#10B981", // emerald
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#D946EF", // fuchsia
];

const NODE_PALETTE_DARK = [
  "#FF7043", // deep orange
  "#38BDF8", // sky blue
  "#A78BFA", // violet
  "#FBBF24", // amber
  "#F87171", // red
  "#34D399", // emerald
  "#F472B6", // pink
  "#22D3EE", // cyan
  "#FB923C", // orange
  "#818CF8", // indigo
  "#2DD4BF", // teal
  "#E879F9", // fuchsia
];

/** Simple string hash (djb2) — fast, deterministic */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get the canonical color for an entity *type* (not a specific node).
 * Always returns the type-based color: grey for generic Entity,
 * the defined color for known types. Used for UI chrome (accent bars,
 * detail panel headers, attribute cards) where type identity matters.
 */
export function getEntityTypeColor(
  labels: string[],
  isDark: boolean
): string {
  const type = getEntityType(labels);
  return isDark ? ENTITY_COLORS_DARK[type] : ENTITY_COLORS[type];
}

/**
 * Get a vibrant color for a specific node.
 * - If the node has a recognized EntityType label (Merchant, Property, etc.),
 *   returns the type color.
 * - If the node is a generic "Entity", picks from a 12-hue palette based
 *   on the node name hash, so each node gets a distinct color.
 *
 * Use `getEntityTypeColor` when you need the *type* color (e.g. detail panel).
 */
export function getNodeColor(
  node: GraphNode,
  isDark: boolean
): string {
  const type = getEntityType(node.labels);
  if (type !== "Entity") {
    return isDark ? ENTITY_COLORS_DARK[type] : ENTITY_COLORS[type];
  }
  // Generic Entity — hash the name to pick a vibrant color
  const palette = isDark ? NODE_PALETTE_DARK : NODE_PALETTE_LIGHT;
  const index = hashString(node.name) % palette.length;
  return palette[index];
}

/* ─────────────────────────────────────────────────────────
 * Entity Attribute Display Config
 * Single source of truth for how entity-specific properties
 * render in the UI. Adding a new property = one config line.
 * ───────────────────────────────────────────────────────── */

export interface AttributeMeta {
  /** Human-readable label shown in the detail panel */
  label: string;
  /** Render style: badge (colored pill), text (plain), mono (code font), boolean (presence pill) */
  kind: "badge" | "text" | "mono" | "boolean";
}

/**
 * Per-entity-type ordered list of attribute keys + display config.
 * Order here determines display order in the detail panel.
 */
export const ENTITY_ATTRIBUTE_META: Partial<
  Record<EntityType, Record<string, AttributeMeta>>
> = {
  Property: {
    address: { label: "Address", kind: "text" },
    property_type: { label: "Type", kind: "badge" },
    city: { label: "City", kind: "text" },
    state: { label: "State", kind: "badge" },
  },
  Unit: {
    label: { label: "Label", kind: "text" },
    property_name: { label: "Property", kind: "text" },
  },
  User: {
    role: { label: "Role", kind: "badge" },
    email: { label: "Email", kind: "mono" },
  },
  Merchant: {
    service_type: { label: "Service Type", kind: "text" },
    is_recurring: { label: "Recurring", kind: "boolean" },
    default_category: { label: "Default Category", kind: "text" },
    merchant_category_code: { label: "MCC", kind: "mono" },
    typical_amount_range: { label: "Typical Amount", kind: "text" },
    payment_channel: { label: "Payment Channel", kind: "badge" },
  },
  ExpenseCategory: {
    category_type: { label: "Category Type", kind: "badge" },
    attribution_level: { label: "Attribution", kind: "badge" },
    description: { label: "Description", kind: "text" },
  },
  ClassificationPreference: {
    merchant_name: { label: "Merchant", kind: "text" },
    preferred_category: { label: "Category", kind: "badge" },
    preferred_property: { label: "Property", kind: "text" },
    is_managed: { label: "Managed", kind: "boolean" },
    source: { label: "Source", kind: "badge" },
  },
};

/**
 * Convert snake_case property value to Title Case for display.
 * e.g., "single_family_home" → "Single Family Home"
 */
export function formatAttributeValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get a short subtitle string for a node (for sidebar display).
 * Returns null if no meaningful subtitle available.
 *
 * Property → "San Francisco, CA"
 * Unit     → "Sunset Apartments"
 * User     → "Tenant"
 * Merchant → "utility"
 * ExpenseCategory → "expense"
 * ClassificationPreference → "Home Depot"
 */
export function getNodeSubtitle(node: GraphNode): string | null {
  if (!node.attributes) return null;
  const a = node.attributes;
  const type = getEntityType(node.labels);

  switch (type) {
    case "Property": {
      const parts = [a.city, a.state].filter(Boolean).map(String);
      return parts.length > 0 ? parts.join(", ") : (a.address ? String(a.address) : null);
    }
    case "Unit":
      return a.property_name ? String(a.property_name) : (a.label ? String(a.label) : null);
    case "User":
      return a.role ? formatAttributeValue(a.role) : (a.email ? String(a.email) : null);
    case "Merchant":
      return a.service_type ? formatAttributeValue(a.service_type) : (a.default_category ? formatAttributeValue(a.default_category) : null);
    case "ExpenseCategory":
      return a.category_type ? formatAttributeValue(a.category_type) : null;
    case "ClassificationPreference":
      return a.merchant_name ? String(a.merchant_name) : (a.preferred_category ? formatAttributeValue(a.preferred_category) : null);
    default:
      return null;
  }
}
