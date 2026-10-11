import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { createAccessToken } from "@/lib/auth";
import { handleApiError, apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const sql = getSql();
    const rows = await sql`
      select id, email, full_name, password_hash, role, is_active
      from users where email = ${body.email.toLowerCase()} limit 1
    `;
    const user = rows[0] as { id: string; email: string; full_name: string; password_hash: string; role: "student" | "recruiter" | "admin"; is_active: boolean } | undefined;
    const passwordMatches = user ? await bcrypt.compare(body.password, user.password_hash) : false;
    if (!user || !passwordMatches || !user.is_active) return apiError("Email or password is incorrect.", 401);
    const accessToken = await createAccessToken({ id: user.id, email: user.email, fullName: user.full_name, role: user.role });
    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      accessToken,
      tokenType: "Bearer",
      expiresIn: 7200,
    });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("Request body must be valid JSON.");
    return handleApiError(error);
  }
}
