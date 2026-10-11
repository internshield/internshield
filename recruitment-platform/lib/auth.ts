import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

export type AccountRole = "student" | "recruiter" | "admin";
export type AuthUser = { id: string; email: string; fullName: string; role: AccountRole };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(user: AuthUser) {
  return new SignJWT({ email: user.email, fullName: user.fullName, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("internshield-api")
    .setAudience("internshield-portals")
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey());
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), secretKey(), {
      issuer: "internshield-api",
      audience: "internshield-portals",
      algorithms: ["HS256"],
    });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.fullName !== "string") return null;
    if (payload.role !== "student" && payload.role !== "recruiter" && payload.role !== "admin") return null;
    return { id: payload.sub, email: payload.email, fullName: payload.fullName, role: payload.role };
  } catch {
    return null;
  }
}
