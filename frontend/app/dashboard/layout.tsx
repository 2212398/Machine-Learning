import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Camera, History, Home } from "lucide-react";
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
    <section className="page-shell space-y-5">
      <div className="rounded-lg border border-emerald-900/10 bg-[#17291f] p-4 text-white shadow-lg md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/65">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </p>
            <h1 className="mt-2 truncate text-2xl font-bold text-white">Xin chào, {displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Theo dõi lịch sử, xem hoạt động gần đây và bắt đầu chẩn đoán bệnh cây từ ảnh lá.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
            <Button className="shrink-0 text-white hover:bg-white/10" href="/dashboard" icon={<Home className="h-4 w-4" aria-hidden="true" />} title="Xem tổng quan dashboard" variant="ghost">
              Tổng quan
            </Button>
            <Button className="shrink-0 text-white hover:bg-white/10" href="/dashboard/history" icon={<History className="h-4 w-4" aria-hidden="true" />} title="Xem lịch sử chẩn đoán" variant="ghost">
              Lịch sử
            </Button>
            <Button className="shrink-0" href="/dashboard/diagnosis" icon={<Camera className="h-4 w-4" aria-hidden="true" />} title="Bắt đầu chẩn đoán bệnh cây" variant="secondary">
              Chẩn đoán
            </Button>
            <LogoutButton className="shrink-0" />
          </div>
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}
