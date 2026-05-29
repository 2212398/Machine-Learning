"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function isInvalidRefreshTokenError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /invalid refresh token|refresh token not found/i.test(message);
}

export function AuthSessionRecovery() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/sign-in" || pathname === "/sign-up") {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    async function recoverInvalidSession() {
      try {
        const { error } = await supabase.auth.getSession();

        if (!error) {
          return;
        }

        if (!isInvalidRefreshTokenError(error)) {
          return;
        }
      } catch (error) {
        if (!isInvalidRefreshTokenError(error)) {
          return;
        }
      }

      // Clear stale browser auth storage so the next render starts cleanly.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      router.replace("/sign-in");
      router.refresh();
    }

    void recoverInvalidSession();
  }, [pathname, router]);

  return null;
}
