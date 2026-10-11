import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(12000),
  domain: z.string().trim().min(1).max(100).default("General"),
  location: z.string().trim().min(1).max(160).default("India"),
  workMode: z.enum(["Remote", "Hybrid", "On-site"]).default("Remote"),
  internshipType: z.string().trim().min(1).max(80).default("Internship"),
  durationWeeks: z.number().int().min(1).max(104).nullable().optional(),
  stipendMin: z.number().int().min(0).nullable().optional(),
  stipendMax: z.number().int().min(0).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  applicationDeadline: z.string().date().nullable().optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const domain = request.nextUrl.searchParams.get("domain")?.trim().slice(0, 100) ?? "";
    const sql = getSql();
    const rows = await sql`
      select o.id, o.title, o.description, o.domain, o.location, o.work_mode,
             o.internship_type, o.duration_weeks, o.stipend_min, o.stipend_max,
             o.skills, o.application_deadline, o.created_at,
             c.id as company_id, c.name as company_name
      from opportunities o
      join companies c on c.id = o.company_id
      where o.status = 'published'
        and c.status = 'approved'
        and ( ${search} = '' or o.title ilike ${"%" + search + "%"}
          or o.description ilike ${"%" + search + "%"} or o.domain ilike ${"%" + search + "%"} )
        and ( ${domain} = '' or o.domain = ${domain} )
        and (o.application_deadline is null or o.application_deadline >= current_date)
      order by o.created_at desc
      limit 100
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
    if (actor.role !== "recruiter" && actor.role !== "admin") return apiError("Recruiter access required.", 403);
    const body = createSchema.parse(await request.json());
    if (body.stipendMin != null && body.stipendMax != null && body.stipendMax < body.stipendMin) {
      return apiError("Maximum stipend must be greater than or equal to minimum stipend.", 422);
    }
    const sql = getSql();
    const companyRows = actor.role === "admin"
      ? await sql`select id from companies where id = ${body.companyId} and status = 'approved' limit 1`
      : await sql`select id from companies where id = ${body.companyId} and owner_id = ${actor.id} and status = 'approved' limit 1`;
    if (!companyRows.length) return apiError("Approved company not found or not owned by this account.", 404);
    const rows = await sql`
      insert into opportunities (
        company_id, title, description, domain, location, work_mode, internship_type,
        duration_weeks, stipend_min, stipend_max, skills, application_deadline,
        status, created_by
      ) values (
        ${body.companyId}, ${body.title}, ${body.description}, ${body.domain}, ${body.location},
        ${body.workMode}, ${body.internshipType}, ${body.durationWeeks ?? null},
        ${body.stipendMin ?? null}, ${body.stipendMax ?? null}, ${body.skills},
        ${body.applicationDeadline ?? null}, 'draft', ${actor.id}
      ) returning id, title, status, created_at
    `;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("Request body must be valid JSON.");
    return handleApiError(error);
  }
}
