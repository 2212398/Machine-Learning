import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Camera, Leaf } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#17291f]/95 text-white backdrop-blur">
      <div className="page-shell flex min-h-[64px] items-center justify-between gap-3 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2" title="Về trang chủ">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
            <Leaf className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-bold uppercase tracking-[0.12em] text-white sm:text-base">
            Plant Detec
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2" aria-label="Điều hướng tài khoản">
          {user && displayName ? (
            <div className="flex items-center gap-2">
              {/* Hydration guard: auth state is rendered on the server from Supabase cookies so the first client paint matches. */}
              <Link
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/dashboard"
                title="Mở dashboard"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-pale text-sm font-bold text-primary">
                  {initials || "U"}
                </span>
                <span className="hidden max-w-[150px] truncate sm:inline">{displayName}</span>
              </Link>
              <LogoutButton className="min-h-[44px]" />
            </div>
          ) : (
            <>
              <Button className="hidden min-h-[44px] px-4 text-sm text-white hover:bg-white/10 sm:inline-flex" href="/sign-in" variant="ghost">
                Đăng nhập
              </Button>
              <Button
                className="min-h-[44px] px-4 text-sm"
                href="/sign-up"
                icon={<Camera className="h-4 w-4" aria-hidden="true" />}
              >
                Bắt đầu
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
