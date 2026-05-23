import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    fastapiUrl: !!process.env.NEXT_PUBLIC_FASTAPI_URL,
  };
  const allOk = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  );
}
