import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
      { status: 422 },
    );
  }
  console.error("API request failed", error);
  return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
}
