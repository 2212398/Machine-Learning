import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

const pillars = [
  {
    title: "Xác thực người dùng",
    description: "Người dùng đăng nhập an toàn để truy cập đúng dữ liệu chẩn đoán của tài khoản mình.",
  },
  {
    title: "Dữ liệu có RLS",
    description: "Mỗi tài khoản chỉ xem được lịch sử, ảnh và kết quả do chính tài khoản đó tạo ra.",
  },
  {
    title: "Chẩn đoán AI hai bước",
    description: "Hệ thống xử lý theo luồng nhận diện loại cây trước, sau đó phân tích bệnh phù hợp cho loại cây đó.",
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Tổng quan hệ thống</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">Không gian làm việc chẩn đoán lá cây của {userName}</h2>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-muted">
            Tại đây bạn có thể theo dõi lịch sử chẩn đoán, quản lý ảnh đã tải lên và truy cập nhanh khu vực phân tích bệnh.
            Dữ liệu được lưu tách biệt theo từng tài khoản để đảm bảo an toàn và dễ theo dõi khi cần đối chiếu kết quả.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button href="/dashboard/history">Xem lịch sử</Button>
            <Button href="/dashboard/diagnosis" variant="secondary">
              Mở khu vực chẩn đoán
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Điểm nổi bật</p>
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