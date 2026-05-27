import { ScanHistoryCrud } from "@/components/dashboard/ScanHistoryCrud";
import { getScanHistory } from "@/lib/actions/scan-history";

export default async function ScanHistoryPage() {
  const rows = await getScanHistory();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-neutral-900">Lich su kham cay</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Moi ban ghi chi hien thi voi dung nguoi so huu nho Row Level Security tren Supabase.
        </p>
      </div>
      <ScanHistoryCrud initialRows={rows} />
    </div>
  );
}

