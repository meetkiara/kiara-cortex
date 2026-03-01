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

    const db = await getConnection({
      host,
      port: Number(port),
      username: username || undefined,
      password: password || undefined,
    });

    // Test connection by listing graphs
    const graphs = await db.list();

    return NextResponse.json({
      connected: true,
      graphs,
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
