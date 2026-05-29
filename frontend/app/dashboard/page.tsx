import Link from "next/link";
import { CalendarDays, Camera, ChevronRight, Leaf, Sprout } from "lucide-react";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDiagnoses } from "@/lib/actions/dashboard";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { ActivityPoint, DiagnosisHistoryItem } from "@/types/dashboard";

type PlantRow = { plant_label: string | null };
type ActivityRow = { created_at: string };

const plantNameVi: Record<string, string> = {
  Potato: "Khoai tây",
  Tomato: "Cà chua",
  Apple: "Táo",
  Corn: "Ngô",
  Grape: "Nho",
  Pepper: "Ớt chuông",
  Peach: "Đào",
  Strawberry: "Dâu tây",
  Blueberry: "Việt quất",
  Rice: "Lúa",
  Raspberry: "Mâm xôi",
  Soybean: "Đậu nành",
  Squash: "Bí ngô",
  Cherry: "Anh đào",
};

function translatePlantName(label: string) {
  return plantNameVi[label] ?? label;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function modePlant(rows: PlantRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (row.plant_label) {
      counts.set(row.plant_label, (counts.get(row.plant_label) ?? 0) + 1);
    }
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Chưa có dữ liệu";
}

function lastSevenDays(rows: ActivityRow[]): ActivityPoint[] {
  const formatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
  const points = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toISOString().slice(0, 10), date: formatter.format(date), count: 0 };
  });
  const counts = new Map(points.map((point) => [point.key, point]));
  rows.forEach((row) => {
    const point = counts.get(new Date(row.created_at).toISOString().slice(0, 10));
    if (point) {
      point.count += 1;
    }
  });
  return points.map(({ date, count }) => ({ date, count }));
}

function RecentRows({ items }: { items: DiagnosisHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed p-5 text-sm leading-6 text-neutral-600">
        Chưa có chẩn đoán nào. Hãy chụp ảnh lá đầu tiên để bắt đầu theo dõi.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <article className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white p-3 shadow-sm transition hover:border-primary/30 hover:shadow-md" key={item.id}>
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-primary-pale">
            {item.imageUrl ? (
              // User-uploaded Supabase URLs are intentionally rendered directly to avoid fragile remote image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-cover" src={item.imageUrl} />
            ) : (
              <Leaf className="m-3 h-6 w-6 text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-neutral-900">{item.plantName}</p>
            <p className="truncate text-sm text-neutral-600">{item.diseaseName}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-neutral-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
        </article>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);
  const initialHistory = await getDiagnoses(null, 5);

  const [totalResult, weekResult, popularResult, activityResult] = await Promise.all([
    supabase.from("diagnoses").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("diagnoses").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekStart),
    supabase.from("diagnoses").select("plant_label").eq("user_id", user.id).gte("created_at", monthStart),
    supabase.from("diagnoses").select("created_at").eq("user_id", user.id).gte("created_at", weekStart),
  ]);

  const userName = user.user_metadata?.full_name ?? user.email?.split("@")[0];
  const activityData = lastSevenDays((activityResult.data as ActivityRow[] | null) ?? []);
  const stats = [
    { icon: Camera, value: String(totalResult.count ?? 0), label: "Lần chẩn đoán" },
    { icon: CalendarDays, value: String(weekResult.count ?? 0), label: "Tuần này" },
    {
      icon: Sprout,
      value: translatePlantName(modePlant((popularResult.data as PlantRow[] | null) ?? [])),
      label: "Cây hay gặp nhất",
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <header className="grid gap-4 rounded-lg border border-primary/10 bg-white p-5 shadow-soft md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Tổng quan</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-neutral-900">
            {userName ? `Xin chào ${userName}` : "Chào mừng trở lại"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Một màn hình gọn để xem trạng thái và quay lại luồng chẩn đoán thật nhanh.</p>
        </div>
        <Button className="min-h-[56px] w-full text-base md:w-auto" href="/dashboard/diagnosis" icon={<Camera className="h-5 w-5" aria-hidden="true" />} title="Bắt đầu chẩn đoán bệnh cây">
          Chẩn đoán ngay
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <Card className="p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md" key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-pale text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 truncate text-2xl font-bold text-primary">{item.value}</p>
              <p className="text-sm text-neutral-600">{item.label}</p>
            </Card>
          );
        })}
      </section>

      <Card className="hidden space-y-4 p-5 sm:block">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-neutral-900">Chẩn đoán 7 ngày qua</h3>
          <span className="rounded-full bg-primary-pale px-3 py-1 text-xs font-bold text-primary">7 ngày</span>
        </div>
        <ActivityChart data={activityData} />
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-neutral-900">Lịch sử gần đây</h3>
          <Link className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:text-primary-light" href="/dashboard/history" title="Xem toàn bộ lịch sử chẩn đoán">
            Xem tất cả
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <RecentRows items={initialHistory.items} />
      </section>
    </div>
  );
}
