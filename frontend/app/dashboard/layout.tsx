import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "bạn";

  return (
    <section className="page-shell space-y-6">
      <div className="relative z-10 overflow-visible rounded-[2rem] border border-white/10 bg-[#2a3050] px-6 py-5 shadow-lg backdrop-blur">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Trang chủ</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Xin chào, {displayName}! 👋</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Đây là nơi xem lịch sử, theo dõi kết quả và bắt đầu chẩn đoán bệnh cây.
            </p>
          </div>

          <div className="relative z-20 flex flex-wrap gap-2 overflow-visible">
            <Button className="flex-shrink-0 text-white hover:bg-white/10" href="/dashboard" title="Xem tổng quan dashboard" variant="ghost">
              Tổng quan
            </Button>
            <Button
              className="flex-shrink-0 text-white hover:bg-white/10"
              href="/dashboard/history"
              title="Xem lịch sử chẩn đoán"
              variant="ghost"
            >
              Lịch sử
            </Button>
            <Button className="flex-shrink-0" href="/dashboard/diagnosis" title="Bắt đầu chẩn đoán bệnh cây" variant="secondary">
              Chẩn đoán
            </Button>
            <LogoutButton className="flex-shrink-0" />
          </div>
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}
