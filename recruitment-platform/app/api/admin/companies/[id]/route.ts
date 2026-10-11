import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["approved", "rejected", "suspended"]) }).strict();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthUser(request);
    if (!actor) return apiError("Authentication required.", 401);
    if (actor.role !== "admin") return apiError("Administrator access required.", 403);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return apiError("Invalid company ID.", 422);
    const body = schema.parse(await request.json());
    const sql = getSql();
    const rows = await sql`
      update companies set status = ${body.status}, updated_at = now()
      where id = ${id}
      returning id, name, status, updated_at
    `;
    if (!rows.length) return apiError("Company not found.", 404);
    await sql`
      insert into audit_events (actor_id, event_type, entity_type, entity_id, details)
      values (${actor.id}, 'company.status_updated', 'company', ${id}, ${JSON.stringify({ status: body.status })}::jsonb)
    `;
    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("Request body must be valid JSON.");
    return handleApiError(error);
  }
}
