"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { recordFeedback } from "@/lib/actions/feedback";
import type { DiagnosisResult } from "@/types/api";

interface DiagnosisResultProps {
  result: DiagnosisResult;
  onBack: () => void;
}

export function DiagnosisResultCard({ result, onBack }: DiagnosisResultProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{
    immediate: string[];
    monitor: string[];
    consult: string[];
  } | null>(null);

  const plantConfidencePercent = Math.round(result.plant_confidence * 100);
  const diseaseConfidencePercent = Math.round(
    result.disease_confidence * 100
  );

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
        const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
        const base = FASTAPI_URL;
        const url = `${base}/api/recommendation?disease_label=${encodeURIComponent(
          result.disease_label
        )}&plant_label=${encodeURIComponent(result.plant_label)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setRecommendation(data.summary || null);
        setChecklist(data.checklist || null);
      } catch (e) {
        // ignore failures, recommendations are optional
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
            alt="Diagnosis"
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
              {result.plant_label}
            </h3>

            {/* Confidence bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Độ tin cậy</span>
                <span className="font-semibold text-brand-600">
                  {plantConfidencePercent}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full transition-all"
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
            <h3 className="text-xl font-bold text-surface-dark mb-3">
              {result.disease_label}
            </h3>

            {/* Confidence bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Độ tin cậy</span>
                <span className="font-semibold text-brand-600">
                  {diseaseConfidencePercent}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full transition-all"
                  style={{ width: `${diseaseConfidencePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation section (Phase 3) */}
        <div className="p-4 border border-brand-200 bg-brand-50 rounded-xl">
          <p className="text-sm text-brand-700">
            💡 <strong>Khuyến nghị:</strong>
          </p>
          {recommendation ? (
            <p className="mt-2 text-sm text-brand-800">{recommendation}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Đang tải khuyến nghị…</p>
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
