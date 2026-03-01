import { NextRequest, NextResponse } from "next/server";
import { deleteEdge } from "@/lib/falkordb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, password, workspace, uuid } = body;

    if (!host || !port || !workspace || !uuid) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    await deleteEdge(
      { host, port: portNum, username, password },
      workspace,
      uuid
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete edge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
