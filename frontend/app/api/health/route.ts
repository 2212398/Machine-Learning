import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    fastapiUrl: !!process.env.NEXT_PUBLIC_FASTAPI_URL,
  };
  const allOk = Object.values(checks).every(Boolean);
  const body =
    process.env.NODE_ENV === "production"
      ? { status: allOk ? "ok" : "degraded", timestamp: new Date().toISOString() }
      : { status: allOk ? "ok" : "degraded", checks, timestamp: new Date().toISOString() }; // Keep env detail local-only.

  return NextResponse.json(
    body,
    { status: allOk ? 200 : 503 },
  );
}
