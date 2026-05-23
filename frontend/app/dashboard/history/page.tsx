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
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold text-neutral-900">Lịch sử chẩn đoán</h1>
      <SimpleHistoryList items={history.items} />
    </div>
  );
}
