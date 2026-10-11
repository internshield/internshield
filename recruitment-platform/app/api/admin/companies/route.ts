import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthUser(request);
    if (!actor) return apiError("Authentication required.", 401);
    if (actor.role !== "admin") return apiError("Administrator access required.", 403);
    const status = request.nextUrl.searchParams.get("status") ?? "pending";
    if (!["pending", "approved", "rejected", "suspended"].includes(status)) return apiError("Invalid company status.", 422);
    const sql = getSql();
    const rows = await sql`
      select c.id, c.name, c.website, c.industry, c.description, c.status, c.created_at,
             u.id as owner_id, u.full_name as owner_name, u.email as owner_email
      from companies c join users u on u.id = c.owner_id
      where c.status::text = ${status}
      order by c.created_at asc limit 200
    `;
    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
