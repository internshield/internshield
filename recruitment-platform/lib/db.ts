import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

export function getSql() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(connectionString);
}
