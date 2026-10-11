import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  opportunityId: z.string().uuid(),
  coverLetter: z.string().trim().max(5000).optional().default(""),
  resumeUrl: z.string().url().max(2048).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthUser(request);
    if (!actor) return apiError("Authentication required.", 401);
    if (actor.role !== "student" && actor.role !== "admin") return apiError("Student access required.", 403);
    const sql = getSql();
    const rows = await sql`
      select a.id, a.status, a.created_at, a.status_updated_at,
             a.cover_letter, a.resume_url,
             o.id as opportunity_id, o.title, o.domain, o.location,
             c.name as company_name
      from applications a
      join opportunities o on o.id = a.opportunity_id
      join companies c on c.id = o.company_id
      where a.applicant_id = ${actor.id}
      order by a.created_at desc
      limit 200
    `;
    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthUser(request);
    if (!actor) return apiError("Authentication required.", 401);
    if (actor.role !== "student") return apiError("Only student accounts can apply.", 403);
    const body = schema.parse(await request.json());
    const sql = getSql();
    const opportunity = await sql`
      select o.id from opportunities o
      join companies c on c.id = o.company_id
      where o.id = ${body.opportunityId} and o.status = 'published'
        and c.status = 'approved'
        and (o.application_deadline is null or o.application_deadline >= current_date)
      limit 1
    `;
    if (!opportunity.length) return apiError("This opportunity is not open for applications.", 404);
    const rows = await sql`
      insert into applications (opportunity_id, applicant_id, cover_letter, resume_url)
      values (${body.opportunityId}, ${actor.id}, ${body.coverLetter || null}, ${body.resumeUrl ?? null})
      on conflict (opportunity_id, applicant_id) do nothing
      returning id, opportunity_id, status, created_at
    `;
    if (!rows.length) return apiError("You have already applied for this opportunity.", 409);
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("Request body must be valid JSON.");
    return handleApiError(error);
  }
}
