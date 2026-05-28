import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

function getDisplayName(user: User) {
  return user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Người dùng";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function Navbar() {
  const { user } = await getCurrentUser();
  const displayName = user ? getDisplayName(user) : null;
  const initials = displayName ? getInitials(displayName) : "";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1e2235]/95 text-white backdrop-blur">
      <div className="page-shell flex items-center justify-between py-4">
        <Link href="/" className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Chẩn Đoán Cây AI
          </span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Điều hướng tài khoản">
          {user && displayName ? (
            <div className="flex items-center gap-3">
              {/* Server-rendered from Supabase cookies, so the first paint matches auth state. */}
              <Link
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-white hover:bg-white/10"
                href="/dashboard"
                title="Mở dashboard"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-pale text-sm font-bold text-primary">
                  {initials || "U"}
                </span>
                <span className="hidden max-w-[160px] truncate sm:inline">{displayName}</span>
              </Link>
              <LogoutButton className="min-h-[44px]" />
            </div>
          ) : (
            <>
              <Button className="min-h-[48px] px-5 text-base text-white hover:bg-white/10" href="/sign-in" variant="ghost">
                Đăng nhập
              </Button>
              <Button className="min-h-[48px] px-5 text-base" href="/sign-up">
                Tạo tài khoản
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
