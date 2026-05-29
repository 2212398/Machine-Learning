import { SimpleHistoryList } from "@/components/dashboard/SimpleHistoryList";
import { getDiagnoses } from "@/lib/actions/dashboard";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const history = await getDiagnoses(null, 100);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Nhật ký theo dõi</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-neutral-900">Lịch sử chẩn đoán</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-neutral-600">
              Tra cứu lại các lần chẩn đoán, ghi chú tình trạng cây và quản lý những bản ghi không còn cần thiết.
            </p>
          </div>
          <p className="rounded-lg border border-primary-pale bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm">
            {history.items.length} bản ghi
          </p>
        </div>
      </header>
      <SimpleHistoryList items={history.items} />
    </div>
  );
}
