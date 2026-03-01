import { NextRequest, NextResponse } from "next/server";
import { fetchGraphData } from "@/lib/falkordb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, password, workspace } = body;

    if (!host || !port || !workspace) {
      return NextResponse.json(
        { error: "Host, port, and workspace are required" },
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

    const data = await fetchGraphData(
      {
        host,
        port: portNum,
        username: username || undefined,
        password: password || undefined,
      },
      workspace
    );

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch graph data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
