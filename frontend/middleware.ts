import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((cookie) => {
    if (!cookie.name.startsWith("sb-") && !cookie.name.includes("supabase")) {
      return;
    }

    // CHANGED: delete stale Supabase token cookies on both the request and outgoing response.
    request.cookies.delete(cookie.name);
    response.cookies.delete(cookie.name);
    response.cookies.set(cookie.name, "", {
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
  });
}

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard");
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // CHANGED: Supabase returns auth failures as `{ error }`; do not rely on thrown exceptions.
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // Anonymous public requests can return AuthSessionMissingError; only protected routes redirect.
    if (!isProtectedRoute) {
      clearSupabaseAuthCookies(request, response);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    clearSupabaseAuthCookies(request, redirectResponse);
    return redirectResponse;
  }

  if (!data.user && !isProtectedRoute) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (!data.user) {
    // Keep anonymous users out of protected pages without affecting public routes.
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
