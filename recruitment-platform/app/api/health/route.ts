import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`select now() as database_time, current_database() as database_name`;
    return NextResponse.json({
      ok: true,
      service: "internshield-recruitment-api",
      database: "connected",
      timestamp: rows[0]?.database_time ?? null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, service: "internshield-recruitment-api", database: "unavailable" },
      { status: 503 },
    );
  }
}
