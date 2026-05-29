"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { RecommendationPanel } from "@/components/diagnosis/RecommendationPanel";
import { recordFeedback } from "@/lib/actions/feedback";
import { getDiseaseDisplayName, getPlantDisplayName, getSeverity, severityConfig } from "@/lib/diagnosis-display";
import type { DiagnosisResult, RecommendationDetail } from "@/types/api";

type Severity = "healthy" | "mild" | "severe" | "unknown";

export interface ResultCardProps {
  plantName: string;
  plantNameVi?: string;
  plantConfidence: number;
  diseaseName: string;
  diseaseNameVi?: string;
  diseaseConfidence: number;
  severity: Severity;
  recommendation: RecommendationDetail | string;
  isLoading?: boolean;
  onFeedback?: (isCorrect: boolean) => void;
  className?: string;
}

const severityMeta: Record<Severity, { label: string; icon: string; variant: BadgeVariant }> = {
  healthy: { label: "Khỏe mạnh", icon: "🌱", variant: "healthy" },
  mild: { label: "Có bệnh - Nhẹ", icon: "⚠️", variant: "mild" },
  severe: { label: "Có bệnh - Nghiêm trọng", icon: "🚨", variant: "severe" },
  unknown: { label: "Không xác định", icon: "?", variant: "unknown" },
};

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function confidenceColor(value: number) {
  if (value >= 0.8) {
    return "bg-success";
  }
  if (value >= 0.6) {
    return "bg-warning";
  }
  return "bg-danger";
}

function ConfidenceBar({ label, value, barClassName }: { label: string; value: number; barClassName?: string }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const safeValue = clampConfidence(value);
  const percent = safeValue * 100;

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimatedValue(percent), 80);
    return () => window.clearTimeout(timer);
  }, [percent]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-neutral-700">{label}</span>
        <span className="font-semibold text-neutral-900">{percent.toFixed(1)}%</span>
      </div>
      <div
        aria-label={`${label}: ${Math.round(percent)}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(percent)}
        className="h-2 overflow-hidden rounded-full bg-neutral-100"
        role="progressbar"
      >
        <div
          className={`${barClassName ?? confidenceColor(safeValue)} h-full rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${animatedValue}%` }}
        />
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <Card className="space-y-5 p-6">
      <div className="h-6 w-1/3 animate-pulse rounded-full bg-neutral-100" />
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-neutral-100" />
      <div className="h-2 w-full animate-pulse rounded-full bg-neutral-100" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100" />
      </div>
    </Card>
  );
}

export function ResultCard({
  plantName,
  plantNameVi,
  plantConfidence,
  diseaseName,
  diseaseNameVi,
  diseaseConfidence,
  severity,
  recommendation,
  isLoading = false,
  onFeedback,
  className,
}: ResultCardProps) {
  if (isLoading) {
    return <ResultSkeleton />;
  }

  const inferredSeverity = getSeverity(diseaseName, diseaseConfidence);
  const severityForDisplay = severity === "unknown" ? inferredSeverity : severity;
  const meta = severityMeta[severityForDisplay];
  const cfg = severityConfig[severityForDisplay];
  const recommendationValue =
    severityForDisplay === "healthy" && typeof recommendation === "string"
      ? {
          ten_benh: "Cây khỏe mạnh",
          nguyen_nhan: "",
          trieu_chung: "Không phát hiện dấu hiệu bệnh",
          xu_ly: [],
          phong_ngua: [recommendation || "Cây trồng đang phát triển tốt! Tiếp tục chăm sóc như hiện tại."],
          muc_do: "healthy",
          thoi_gian_xu_ly: "",
        }
      : recommendation;

  return (
    <Card className={`space-y-6 p-6 ${className || ""}`} data-testid="result-card">
      <header className="space-y-3">
        <Badge aria-label={`Severity: ${meta.label}`} data-testid="severity-badge" icon={meta.icon} variant={meta.variant}>
          {meta.label}
        </Badge>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cfg.color}`}>
          {cfg.badge}
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-neutral-900">
            {plantNameVi || getPlantDisplayName(plantName)}
          </h2>
          <h3 className="mt-1 text-base text-neutral-700">{diseaseNameVi || getDiseaseDisplayName(diseaseName)}</h3>
        </div>
      </header>

      <section className="space-y-4">
        <ConfidenceBar label="Nhận diện cây" value={plantConfidence} barClassName="bg-green-400" />
        <ConfidenceBar label="Nhận diện bệnh" value={diseaseConfidence} barClassName={cfg.bar} />
      </section>

      <section aria-live="polite">
        <RecommendationPanel diseaseLabel={diseaseName} recommendation={recommendationValue} />
      </section>

      {onFeedback ? (
        <footer className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          <Button onClick={() => onFeedback(true)} size="sm" type="button" variant="ghost">
            👍 Đúng
          </Button>
          <Button onClick={() => onFeedback(false)} size="sm" type="button" variant="ghost">
            👎 Sai - Báo lỗi
          </Button>
        </footer>
      ) : null}
    </Card>
  );
}

interface DiagnosisResultProps {
  result: DiagnosisResult;
  onBack: () => void;
}

export function DiagnosisResultCard({ result, onBack }: DiagnosisResultProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationDetail | string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [checklist, setChecklist] = useState<{
    immediate: string[];
    monitor: string[];
    consult: string[];
  }>({
    immediate: [],
    monitor: [],
    consult: [],
  });
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  const hasChecklist =
    checklist.immediate.length > 0 ||
    checklist.monitor.length > 0 ||
    checklist.consult.length > 0;

  const plantConfidencePercent = Math.round(result.plant_confidence * 100);
  const diseaseConfidencePercent = Math.round(
    result.disease_confidence * 100
  );
  const resultSeverity = getSeverity(result.disease_label, result.disease_confidence);
  const resultSeverityConfig = severityConfig[resultSeverity];
  const diseaseCandidates = Array.isArray(result.disease_top_candidates)
    ? result.disease_top_candidates.slice(0, 3)
    : [];

  const handleFeedback = async (isCorrect: boolean) => {
    setLoading(true);
    const response = await recordFeedback(result.id, isCorrect);
    setLoading(false);

    if (response.success) {
      setFeedbackSubmitted(true);
    } else {
      alert(response.error || "Lỗi khi lưu phản hồi");
    }
  };

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        setRecommendationLoading(true);
        const url = `/api/recommendation?disease_label=${encodeURIComponent(
          result.disease_label
        )}&plant_label=${encodeURIComponent(result.plant_label)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setRecommendation(data.recommendation || data.summary || null);
        const nextChecklist = data?.checklist;
        setChecklist({
          immediate: Array.isArray(nextChecklist?.immediate) ? nextChecklist.immediate : [],
          monitor: Array.isArray(nextChecklist?.monitor) ? nextChecklist.monitor : [],
          consult: Array.isArray(nextChecklist?.consult) ? nextChecklist.consult : [],
        });
      } catch {
        // ignore failures, recommendations are optional
        setRecommendation(null);
        setChecklist({ immediate: [], monitor: [], consult: [] });
      } finally {
        setRecommendationLoading(false);
      }
    };

    fetchRecommendation();
  }, [result.disease_label, result.plant_label]);

  return (
    <Card className="p-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-surface-dark mb-2">
            Kết quả chẩn đoán
          </h2>
          <p className="text-muted-foreground">
            Phân tích hoàn tất vào{" "}
            {new Date(result.created_at).toLocaleString("vi-VN")}
          </p>
        </div>

        {/* Image preview */}
        <div>
          <img
            src={result.image_url}
            alt="Ảnh chẩn đoán"
            className="w-full max-w-md h-auto rounded-xl border border-border"
          />
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plant result */}
          <div className="p-4 bg-surface-variant rounded-xl">
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Loại cây
            </p>
            <h3 className="text-xl font-bold text-surface-dark mb-3">
              {getPlantDisplayName(result.plant_label)}
            </h3>

            {/* Confidence bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Độ tin cậy</span>
                <span className="font-semibold text-brand-600">
                  {plantConfidencePercent}%
                </span>
              </div>
              <div
                aria-label={`Plant confidence: ${plantConfidencePercent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={plantConfidencePercent}
                className="w-full bg-border rounded-full h-2 overflow-hidden"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${plantConfidencePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Disease result */}
          <div className="p-4 bg-surface-variant rounded-xl">
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Bệnh trên lá
            </p>
            <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${resultSeverityConfig.color}`}>
              {resultSeverityConfig.badge}
            </span>
            <h3 className="text-xl font-bold text-surface-dark mb-3">
              {getDiseaseDisplayName(result.disease_label)}
            </h3>

            {/* Confidence bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Độ tin cậy</span>
                <span className="font-semibold text-brand-600">
                  {diseaseConfidencePercent}%
                </span>
              </div>
              <div
                aria-label={`Disease confidence: ${diseaseConfidencePercent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={diseaseConfidencePercent}
                className="w-full bg-border rounded-full h-2 overflow-hidden"
                role="progressbar"
              >
                <div
                  className={`${resultSeverityConfig.bar} h-full rounded-full transition-all`}
                  style={{ width: `${diseaseConfidencePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {diseaseCandidates.length > 0 ? (
          <div className="rounded-xl border border-border bg-surfaceAlt p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-dark">Top 3 kha nang benh</p>
                <p className="mt-1 text-sm sm:text-xs text-muted-foreground">
                  Cac ket qua gan nhat de doi chieu khi trieu chung chua ro.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {diseaseCandidates.map((candidate, index) => {
                const percent = Math.round((candidate.confidence || 0) * 100);
                return (
                  <div key={`${candidate.label}-${candidate.rank ?? index}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">
                        #{candidate.rank ?? index + 1} {getDiseaseDisplayName(candidate.label)}
                      </span>
                      <span className="text-muted-foreground">{percent}%</span>
                    </div>
                    <div
                      aria-label={`${candidate.label}: ${percent}%`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={percent}
                      className="h-2 overflow-hidden rounded-full bg-border"
                      role="progressbar"
                    >
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Recommendation section (Phase 3) */}
        <div className="p-4 border border-brand-200 bg-brand-50 rounded-xl">
          <p className="text-sm text-brand-700">
            💡 <strong>Khuyến nghị:</strong>
          </p>
          {recommendationLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Đang tải khuyến nghị…</p>
          ) : recommendation ? (
            <RecommendationPanel diseaseLabel={result.disease_label} recommendation={recommendation} />
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Chưa có khuyến nghị.</p>
          )}

          {checklist ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-surface-dark">
              <div>
                <h4 className="font-semibold">Hành động ngay</h4>
                <ul className="list-disc pl-5 mt-1">
                  {checklist.immediate.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Theo dõi</h4>
                <ul className="list-disc pl-5 mt-1">
                  {checklist.monitor.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Khi cần tư vấn</h4>
                <ul className="list-disc pl-5 mt-1">
                  {checklist.consult.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {/* Checklist modal trigger */}
        {hasChecklist ? (
          <div className="mt-2">
            <Button onClick={() => setShowChecklistModal(true)} variant="secondary">
              Xem chi tiết & In
            </Button>
          </div>
        ) : null}

        {/* Modal */}
        {showChecklistModal && hasChecklist ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg max-w-3xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Chi tiết khuyến nghị</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => window.print()}
                    className="text-sm"
                  >
                    In
                  </Button>
                  <Button variant="secondary" onClick={() => setShowChecklistModal(false)}>
                    Đóng
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <RecommendationPanel diseaseLabel={result.disease_label} recommendation={recommendation} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold">Hành động ngay</h4>
                    <ul className="list-disc pl-5 mt-1">
                      {checklist.immediate.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Theo dõi</h4>
                    <ul className="list-disc pl-5 mt-1">
                      {checklist.monitor.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Khi cần tư vấn</h4>
                    <ul className="list-disc pl-5 mt-1">
                      {checklist.consult.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} className="flex-1">
            ← Quay lại
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleFeedback(true)}
            disabled={loading || feedbackSubmitted}
            className="flex-1"
          >
            {feedbackSubmitted ? "✓ Cảm ơn" : "👍 Đúng"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleFeedback(false)}
            disabled={loading || feedbackSubmitted}
            className="flex-1"
          >
            {feedbackSubmitted ? "✓ Cảm ơn" : "👎 Sai"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
