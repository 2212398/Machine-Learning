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

  const userLabel = user.email || user.user_metadata?.full_name || "Người dùng";

  return (
    <section className="page-shell space-y-6">
      <div className="relative z-10 overflow-visible rounded-[2rem] border border-white/10 bg-white/10 px-6 py-5 shadow-lg backdrop-blur">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Trang chủ</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Xin chào, {userLabel}</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Đây là nơi xem lịch sử, theo dõi kết quả và bắt đầu chẩn đoán bệnh cây.
            </p>
          </div>

          <div className="relative z-20 flex flex-wrap gap-2 overflow-visible">
            <Button className="text-white hover:bg-white/10" href="/dashboard" variant="ghost">
              Tổng quan
            </Button>
            <Button className="text-white hover:bg-white/10" href="/dashboard/history" variant="ghost">
              Lịch sử
            </Button>
            <Button href="/dashboard/diagnosis" variant="secondary">
              Chẩn đoán
            </Button>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}
