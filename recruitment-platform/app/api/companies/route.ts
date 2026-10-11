import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  website: z.string().url().max(2048).optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional(),
  description: z.string().trim().max(8000).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthUser(request);
    if (!actor) return apiError("Authentication required.", 401);
    if (actor.role !== "recruiter" && actor.role !== "admin") return apiError("Recruiter access required.", 403);
    const body = schema.parse(await request.json());
    const sql = getSql();
    const rows = await sql`
      insert into companies (owner_id, name, website, industry, description, status)
      values (
        ${actor.id}, ${body.name}, ${body.website || null},
        ${body.industry || null}, ${body.description || null}, 'pending'
      )
      returning id, name, status, created_at
    `;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("Request body must be valid JSON.");
    return handleApiError(error);
  }
}
