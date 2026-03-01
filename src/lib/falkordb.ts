import { FalkorDB } from "falkordb";
import type { ConnectionConfig, GraphData, GraphNode, GraphEdge, Episode } from "./types";

let dbInstance: FalkorDB | null = null;
let currentConfig: ConnectionConfig | null = null;

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
    } catch {}
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

  // Fetch entity nodes
  const nodesResult = await graph.roQuery<Record<string, unknown>>(
    "MATCH (n) WHERE n.name IS NOT NULL RETURN n"
  );

  const nodes: GraphNode[] = [];
  if (nodesResult.data) {
    for (const row of nodesResult.data) {
      const n = row["n"] as Record<string, unknown>;
      if (n) {
        nodes.push({
          uuid: (n.uuid as string) || (n.id as string) || "",
          name: (n.name as string) || "Unnamed",
          summary: (n.summary as string) || "",
          labels: Array.isArray(n.labels) ? n.labels : [],
          group_id: (n.group_id as string) || workspaceId,
          created_at: (n.created_at as string) || "",
        });
      }
    }
  }

  // Fetch entity edges (relationships)
  const edgesResult = await graph.roQuery<Record<string, unknown>>(
    "MATCH (s)-[r]->(t) WHERE r.fact IS NOT NULL RETURN s.uuid AS source_uuid, s.name AS source_name, t.uuid AS target_uuid, t.name AS target_name, r"
  );

  const edges: GraphEdge[] = [];
  if (edgesResult.data) {
    for (const row of edgesResult.data) {
      const r = row["r"] as Record<string, unknown>;
      if (r) {
        edges.push({
          uuid: (r.uuid as string) || "",
          name: (r.name as string) || "",
          fact: (r.fact as string) || "",
          source_uuid: (row.source_uuid as string) || "",
          source_name: (row.source_name as string) || "",
          target_uuid: (row.target_uuid as string) || "",
          target_name: (row.target_name as string) || "",
          created_at: (r.created_at as string) || "",
          valid_at: (r.valid_at as string) || null,
          invalid_at: (r.invalid_at as string) || null,
          expired_at: (r.expired_at as string) || null,
          group_id: (r.group_id as string) || workspaceId,
        });
      }
    }
  }

  // Fetch episodes
  const episodesResult = await graph.roQuery<Record<string, unknown>>(
    "MATCH (e:Episodic) RETURN e"
  );

  const episodes: Episode[] = [];
  if (episodesResult.data) {
    for (const row of episodesResult.data) {
      const e = row["e"] as Record<string, unknown>;
      if (e) {
        episodes.push({
          uuid: (e.uuid as string) || "",
          name: (e.name as string) || "",
          source: (e.source as string) || "",
          source_description: (e.source_description as string) || "",
          content: (e.content as string) || "",
          created_at: (e.created_at as string) || "",
          group_id: (e.group_id as string) || workspaceId,
        });
      }
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
    } catch {}
    dbInstance = null;
    currentConfig = null;
  }
}
