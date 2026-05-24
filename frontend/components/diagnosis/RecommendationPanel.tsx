import { getDiseaseDisplayName, parseRecommendation } from "@/lib/diagnosis-display";
import type { RecommendationDetail } from "@/types/api";

interface RecommendationPanelProps {
  diseaseLabel: string;
  recommendation: RecommendationDetail | string | null | undefined;
}

export function RecommendationPanel({ diseaseLabel, recommendation }: RecommendationPanelProps) {
  const rec = parseRecommendation(recommendation);
  const isHealthy = rec.muc_do === "healthy";

  if (isHealthy) {
    return (
      <div className="space-y-3 rounded-xl border border-green-100 bg-green-50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🌱</span>
          <h3 className="text-lg font-semibold text-green-800">Cây đang khỏe mạnh!</h3>
        </div>
        <p className="text-sm text-green-700">
          Không phát hiện dấu hiệu bệnh. Tiếp tục chăm sóc tốt:
        </p>
        {rec.phong_ngua.length > 0 ? (
          <ul className="space-y-2">
            {rec.phong_ngua.map((item) => (
              <li className="flex items-start gap-2 text-sm text-green-700" key={item}>
                <span className="mt-0.5 flex-shrink-0 text-green-500">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary-pale bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">
            {rec.ten_benh || getDiseaseDisplayName(diseaseLabel)}
          </h3>
          {rec.nguyen_nhan ? (
            <p className="mt-0.5 text-sm text-neutral-500">🔬 {rec.nguyen_nhan}</p>
          ) : null}
        </div>
        {rec.thoi_gian_xu_ly ? (
          <span
            className={
              "flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " +
              (rec.muc_do === "severe" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")
            }
          >
            ⏱ {rec.thoi_gian_xu_ly}
          </span>
        ) : null}
      </div>

      {rec.trieu_chung ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Triệu chứng</p>
          <p className="text-sm text-amber-900">{rec.trieu_chung}</p>
        </div>
      ) : null}

      {rec.xu_ly.length > 0 ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
            <span className="text-base" aria-hidden="true">💊</span> Cách xử lý
          </p>
          <ol className="space-y-2">
            {rec.xu_ly.map((step, index) => (
              <li className="flex items-start gap-2.5" key={step}>
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-neutral-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {rec.phong_ngua.length > 0 ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
            <span className="text-base" aria-hidden="true">🛡️</span> Phòng ngừa tái phát
          </p>
          <ul className="space-y-2">
            {rec.phong_ngua.map((tip) => (
              <li className="flex items-start gap-2 text-sm text-neutral-600" key={tip}>
                <span className="mt-1 flex-shrink-0 text-green-500">•</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rec.muc_do === "severe" ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          <span className="flex-shrink-0 text-base" aria-hidden="true">⚠️</span>
          <span>
            Bệnh này lây lan nhanh. Cách ly cây bệnh với vườn ngay khi phát hiện.
            Liên hệ cán bộ khuyến nông nếu bệnh lan rộng.
          </span>
        </div>
      ) : null}
    </div>
  );
}
