import type { ConnectionConfig, GraphData, WorkspaceInfo } from "./types";

function getConnectionPayload(config: ConnectionConfig, extra?: Record<string, string>) {
  return {
    host: config.host,
    port: config.port,
    username: config.username || "",
    password: config.password || "",
    ...extra,
  };
}

export async function testConnection(
  config: ConnectionConfig
): Promise<{ connected: boolean; graphs: string[]; workspaces?: WorkspaceInfo[]; error?: string }> {
  const res = await fetch("/api/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getConnectionPayload(config)),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Connection failed");
  }
  return data;
}

export async function fetchGraph(
  config: ConnectionConfig,
  workspace: string
): Promise<GraphData> {
  const res = await fetch("/api/graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getConnectionPayload(config, { workspace })),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch graph");
  }
  return res.json() as Promise<GraphData>;
}

export async function apiDeleteNode(
  config: ConnectionConfig,
  workspace: string,
  uuid: string
): Promise<void> {
  const res = await fetch("/api/graph/delete-node", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getConnectionPayload(config, { workspace, uuid })),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delete node");
  }
}

export async function apiDeleteEdge(
  config: ConnectionConfig,
  workspace: string,
  uuid: string
): Promise<void> {
  const res = await fetch("/api/graph/delete-edge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getConnectionPayload(config, { workspace, uuid })),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delete edge");
  }
}
