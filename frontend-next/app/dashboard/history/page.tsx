import { Card } from "@/components/ui/card";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

type DiagnosisRow = {
  id: string;
  created_at: string;
  plant_label: string | null;
  disease_label: string | null;
  plant_confidence: number | null;
  disease_confidence: number | null;
  status: string;
  recommendation: string | null;
};

export default async function HistoryPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, created_at, plant_label, disease_label, plant_confidence, disease_confidence, status, recommendation")
    .order("created_at", { ascending: false })
    .limit(10);

  const diagnoses = (data as DiagnosisRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">CRUD dữ liệu</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">Lịch sử chẩn đoán</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Trang này xác nhận Supabase Database đã sẵn sàng cho ghi/đọc lịch sử, phản hồi đúng/sai và audit sau này.
          </p>
        </div>

        {error ? (
          <p className="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600">
            Không tải được lịch sử chẩn đoán. Hãy kiểm tra schema hoặc policy RLS.
          </p>
        ) : null}

        {diagnoses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surfaceAlt p-6 text-sm leading-6 text-muted">
            Chưa có dữ liệu lịch sử. Khi Phase 2 hoàn tất, mỗi lần phân tích ảnh sẽ tạo một bản ghi ở đây.
          </div>
        ) : (
          <div className="space-y-3">
            {diagnoses.map((item) => (
              <article key={item.id} className="rounded-2xl border border-border bg-surfaceAlt p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {item.plant_label || "Chưa có nhãn cây"} - {item.disease_label || "Chưa có nhãn bệnh"}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{item.status}</p>
                  </div>
                  <time className="text-xs text-muted" dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString("vi-VN")}
                  </time>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                  <p>Plant confidence: {item.plant_confidence ?? "-"}</p>
                  <p>Disease confidence: {item.disease_confidence ?? "-"}</p>
                </div>

                {item.recommendation ? <p className="mt-3 text-sm leading-6 text-foreground">{item.recommendation}</p> : null}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}