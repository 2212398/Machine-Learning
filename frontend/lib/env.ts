function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  fastapiUrl: process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
};
