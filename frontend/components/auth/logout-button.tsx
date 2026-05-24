"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className={`flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 ${className ?? ""}`}
      onClick={handleLogout}
      type="button"
    >
      <span className="hidden sm:inline">Đăng xuất</span>
      <span className="sm:hidden">↩</span>
    </button>
  );
}
