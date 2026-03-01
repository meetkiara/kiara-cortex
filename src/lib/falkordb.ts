import { FalkorDB } from "falkordb";
import type { ConnectionConfig, GraphData, GraphNode, GraphEdge, Episode } from "./types";

let dbInstance: FalkorDB | null = null;
let currentConfig: ConnectionConfig | null = null;

/**
 * Core node property keys used by the Graphiti schema.
 * Any property NOT in this set is treated as an entity-specific
 * attribute and surfaced in the detail panel's attributes card.
 */
const CORE_PROPERTY_KEYS = new Set([
  "uuid", "name", "summary", "group_id", "created_at", "name_embedding", "labels",
]);

function configChanged(config: ConnectionConfig): boolean {
  if (!currentConfig) return true;
  return (
    currentConfig.host !== config.host ||
    currentConfig.port !== config.port ||
    currentConfig.username !== config.username ||
    currentConfig.password !== config.password
  );
}

export async function getConnection(config: ConnectionConfig): Promise<FalkorDB> {
  if (dbInstance && !configChanged(config)) {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      await dbInstance.close();
    } catch (e) {
      console.warn("Failed to close previous FalkorDB connection:", e);
    }
    dbInstance = null;
  }

  // Wrap connect in a timeout to prevent hanging on unreachable hosts
  // reconnectStrategy is a valid Redis socket option but not in FalkorDB's types
  const socketConfig = {
    host: config.host,
    port: config.port,
    connectTimeout: 5000,
    reconnectStrategy: false,
  };

  const connectPromise = FalkorDB.connect({
    username: config.username || undefined,
    password: config.password || undefined,
    socket: socketConfig as typeof socketConfig & { host: string; port: number },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Connection timed out after 5 seconds")), 6000);
  });

  dbInstance = await Promise.race([connectPromise, timeoutPromise]);
  currentConfig = { ...config };
  return dbInstance;
}

export async function listGraphs(config: ConnectionConfig): Promise<string[]> {
  const db = await getConnection(config);
  const graphs = await db.list();
  return graphs;
}

export async function fetchGraphData(
  config: ConnectionConfig,
  workspaceId: string
): Promise<GraphData> {
  const db = await getConnection(config);
  const graph = db.selectGraph(workspaceId);

  // Fetch entity nodes — exclude Episodic (memory_*) nodes which are Graphiti's
  // internal provenance nodes, not semantic entities. They appear in the Episodes tab instead.
  const nodesResult = await graph.roQuery<Record<string, unknown>>(
    `MATCH (n) WHERE n.name IS NOT NULL AND NOT 'Episodic' IN labels(n)
     RETURN properties(n) AS props, labels(n) AS labels`
  );

  const nodes: GraphNode[] = [];
  if (nodesResult.data) {
    for (const row of nodesResult.data) {
      const props = (row.props ?? {}) as Record<string, unknown>;

      // Extract extra attributes (entity-specific properties)
      const attributes: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (!CORE_PROPERTY_KEYS.has(key) && value != null && value !== "") {
          // Convert BigInt to Number for JSON serialization safety
          attributes[key] = typeof value === "bigint" ? Number(value) : value;
        }
      }

      nodes.push({
        uuid: String(props.uuid ?? ""),
        name: String(props.name ?? "") || "Unnamed",
        summary: String(props.summary ?? ""),
        labels: Array.isArray(row.labels) ? row.labels : [],
        group_id: String(props.group_id ?? workspaceId),
        created_at: String(props.created_at ?? ""),
        ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      });
    }
  }

  // Fetch entity edges — project all properties as scalars
  const edgesResult = await graph.roQuery<Record<string, unknown>>(
    `MATCH (s)-[r]->(t) WHERE r.fact IS NOT NULL
     RETURN r.uuid AS uuid, r.name AS name, r.fact AS fact,
            s.uuid AS source_uuid, s.name AS source_name,
            t.uuid AS target_uuid, t.name AS target_name,
            r.created_at AS created_at, r.valid_at AS valid_at,
            r.invalid_at AS invalid_at, r.expired_at AS expired_at,
            r.group_id AS group_id`
  );

  const edges: GraphEdge[] = [];
  if (edgesResult.data) {
    for (const row of edgesResult.data) {
      edges.push({
        uuid: String(row.uuid ?? ""),
        name: String(row.name ?? ""),
        fact: String(row.fact ?? ""),
        source_uuid: String(row.source_uuid ?? ""),
        source_name: String(row.source_name ?? ""),
        target_uuid: String(row.target_uuid ?? ""),
        target_name: String(row.target_name ?? ""),
        created_at: String(row.created_at ?? ""),
        valid_at: row.valid_at ? String(row.valid_at) : null,
        invalid_at: row.invalid_at ? String(row.invalid_at) : null,
        expired_at: row.expired_at ? String(row.expired_at) : null,
        group_id: String(row.group_id ?? workspaceId),
      });
    }
  }

  // Fetch episodes — project properties as scalars
  const episodesResult = await graph.roQuery<Record<string, unknown>>(
    `MATCH (e:Episodic)
     RETURN e.uuid AS uuid, e.name AS name, e.source AS source,
            e.source_description AS source_description, e.content AS content,
            e.created_at AS created_at, e.group_id AS group_id`
  );

  const episodes: Episode[] = [];
  if (episodesResult.data) {
    for (const row of episodesResult.data) {
      episodes.push({
        uuid: String(row.uuid ?? ""),
        name: String(row.name ?? ""),
        source: String(row.source ?? ""),
        source_description: String(row.source_description ?? ""),
        content: String(row.content ?? ""),
        created_at: String(row.created_at ?? ""),
        group_id: String(row.group_id ?? workspaceId),
      });
    }
  }

  return {
    workspace_id: workspaceId,
    group_id: workspaceId,
    stats: {
      total_nodes: nodes.length,
      total_edges: edges.length,
      entity_nodes: nodes.length,
      entity_edges: edges.length,
      episodes: episodes.length,
    },
    nodes,
    edges,
    episodes,
  };
}

export async function deleteNode(
  config: ConnectionConfig,
  workspaceId: string,
  uuid: string
): Promise<void> {
  const db = await getConnection(config);
  const graph = db.selectGraph(workspaceId);
  await graph.query("MATCH (n {uuid: $uuid}) DETACH DELETE n", {
    params: { uuid },
  });
}

export async function deleteEdge(
  config: ConnectionConfig,
  workspaceId: string,
  uuid: string
): Promise<void> {
  const db = await getConnection(config);
  const graph = db.selectGraph(workspaceId);
  await graph.query("MATCH ()-[r {uuid: $uuid}]->() DELETE r", {
    params: { uuid },
  });
}

export async function closeConnection(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
    } catch (e) {
      console.warn("Failed to close FalkorDB connection:", e);
    }
    dbInstance = null;
    currentConfig = null;
  }
}
