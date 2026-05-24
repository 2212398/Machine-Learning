import Link from "next/link";
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
    return <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-5 text-neutral-600">Chưa có chẩn đoán nào.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3" key={item.id}>
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-primary-pale">
            {item.imageUrl ? <img alt="" className="h-full w-full object-cover" src={item.imageUrl} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-neutral-900">{item.plantName}</p>
            <p className="truncate text-sm text-neutral-600">{item.diseaseName}</p>
          </div>
          <span className="text-sm text-neutral-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
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
    { icon: "📊", value: String(totalResult.count ?? 0), label: "Lần chẩn đoán" },
    { icon: "📅", value: String(weekResult.count ?? 0), label: "Tuần này" },
    {
      icon: "🌿",
      value: translatePlantName(modePlant((popularResult.data as PlantRow[] | null) ?? [])),
      label: "Cây hay gặp nhất",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <h2 className="font-display text-3xl font-semibold text-neutral-900">
          {userName ? `Xin chào ${userName}! 👋` : "Chào mừng trở lại! 👋"}
        </h2>
        <Button className="min-h-[56px] w-full text-lg sm:w-auto" href="/dashboard/diagnosis" title="Bắt đầu chẩn đoán bệnh cây">
          📷 Chẩn đoán ngay
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm" key={item.label}>
            <div className="text-3xl">{item.icon}</div>
            <p className="mt-3 text-2xl font-bold text-primary">{item.value}</p>
            <p className="text-base text-neutral-600">{item.label}</p>
          </div>
        ))}
      </section>

      <Card className="hidden space-y-4 p-5 sm:block">
        <h3 className="text-lg font-semibold text-neutral-900">Chẩn đoán 7 ngày qua</h3>
        <ActivityChart data={activityData} />
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-neutral-900">Lịch sử gần đây</h3>
          <Link className="text-sm font-semibold text-primary" href="/dashboard/history" title="Xem toàn bộ lịch sử chẩn đoán">
            Xem toàn bộ lịch sử →
          </Link>
        </div>
        <RecentRows items={initialHistory.items} />
      </section>
    </div>
  );
}
