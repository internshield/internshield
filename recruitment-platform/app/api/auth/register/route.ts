import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { createAccessToken } from "@/lib/auth";
import { handleApiError, apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();
    const sql = getSql();
    const passwordHash = await bcrypt.hash(body.password, 12);
    const rows = await sql`
      insert into users (email, password_hash, full_name, role)
      values (${email}, ${passwordHash}, ${body.fullName}, 'student')
      on conflict (email) do nothing
      returning id, email, full_name, role
    `;
    if (!rows.length) return apiError("An account with this email may already exist.", 409);
    const user = rows[0] as { id: string; email: string; full_name: string; role: "student" };
    const accessToken = await createAccessToken({ id: user.id, email: user.email, fullName: user.full_name, role: user.role });
    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      accessToken,
      tokenType: "Bearer",
      expiresIn: 7200,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("Request body must be valid JSON.");
    return handleApiError(error);
  }
}
