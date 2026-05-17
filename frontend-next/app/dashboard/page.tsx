import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

const pillars = [
  {
    title: "Xác thực người dùng",
    description: "Supabase Auth được đặt làm lớp định danh cho toàn bộ CRUD và lịch sử chẩn đoán.",
  },
  {
    title: "Dữ liệu có RLS",
    description: "Mỗi user chỉ nhìn thấy hồ sơ, lịch sử và ảnh thuộc về chính tài khoản đó.",
  },
  {
    title: "Chuẩn bị tích hợp AI",
    description: "Trang chẩn đoán sẽ kết nối Storage -> FastAPI ở Phase 2, không trộn sớm logic ML vào UI.",
  },
];

export default async function DashboardPage() {
  const { user } = await getCurrentUser();
  const userName = user?.user_metadata?.full_name || user?.email || "Người dùng";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Tổng quan Phase 1</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">Nền tảng dữ liệu và xác thực cho {userName}</h2>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-muted">
            Dashboard này đóng vai trò kiểm tra xem auth, session, RLS và structure CRUD đã sẵn sàng để bước sang Phase 2
            hay chưa. Khi tích hợp AI, đây sẽ là nơi người dùng upload ảnh, xem kết quả và lưu lịch sử chẩn đoán.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button href="/dashboard/history">Xem lịch sử</Button>
            <Button href="/dashboard/diagnosis" variant="secondary">
              Mở khu vực chẩn đoán
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Mục tiêu phase này</p>
          <div className="space-y-3">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-2xl border border-border bg-surfaceAlt p-4">
                <h3 className="text-base font-semibold text-foreground">{pillar.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{pillar.description}</p>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}