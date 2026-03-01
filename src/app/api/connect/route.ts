import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/falkordb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, password } = body;

    if (!host || !port) {
      return NextResponse.json(
        { error: "Host and port are required" },
        { status: 400 }
      );
    }

    const portNum = Number(port);
    if (Number.isNaN(portNum)) {
      return NextResponse.json(
        { error: "Port must be a valid number" },
        { status: 400 }
      );
    }

    const db = await getConnection({
      host,
      port: portNum,
      username: username || undefined,
      password: password || undefined,
    });

    // List all graphs
    const graphs = await db.list();

    // Fetch node/edge counts per workspace (quick aggregate queries)
    const workspaces = await Promise.all(
      graphs.map(async (name) => {
        try {
          const graph = db.selectGraph(name);
          const nodesRes = await graph.roQuery<{ c: number }>(
            "MATCH (n) WHERE n.name IS NOT NULL RETURN count(n) AS c"
          );
          const edgesRes = await graph.roQuery<{ c: number }>(
            "MATCH ()-[r]->() WHERE r.fact IS NOT NULL RETURN count(r) AS c"
          );
          const nodeCount = nodesRes.data?.[0]?.c ?? 0;
          const edgeCount = edgesRes.data?.[0]?.c ?? 0;
          return { name, nodeCount, edgeCount };
        } catch {
          // If a graph can't be queried, return 0 counts
          return { name, nodeCount: 0, edgeCount: 0 };
        }
      })
    );

    // Sort: workspaces with data first, then by node count descending
    workspaces.sort((a, b) => {
      const aHasData = a.nodeCount > 0 ? 1 : 0;
      const bHasData = b.nodeCount > 0 ? 1 : 0;
      if (bHasData !== aHasData) return bHasData - aHasData;
      return b.nodeCount - a.nodeCount;
    });

    return NextResponse.json({
      connected: true,
      graphs: workspaces.map((w) => w.name),
      workspaces,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json(
      { error: message, connected: false },
      { status: 500 }
    );
  }
}
