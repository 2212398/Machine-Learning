import { ScanHistoryCrud } from "@/components/dashboard/ScanHistoryCrud";
import { getScanHistory } from "@/lib/actions/scan-history";

export default async function ScanHistoryPage() {
  const rows = await getScanHistory();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-neutral-900">Lịch sử chẩn đoán</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Mỗi bản ghi chỉ hiển thị với đúng người sở hữu nhờ Row Level Security trên Supabase.
        </p>
      </div>
      <ScanHistoryCrud initialRows={rows} />
    </div>
  );
}
