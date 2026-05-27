"use client";

import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { FeedbackWidget } from "@/components/diagnosis/FeedbackWidget";
import { RecommendationPanel } from "@/components/diagnosis/RecommendationPanel";
import { Button } from "@/components/ui/button";
import { confirmAndDiagnose, uploadDiagnosis } from "@/lib/actions/diagnosis";
import { getDiseaseDisplayName, getPlantDisplayName, getSeverity, severityConfig } from "@/lib/diagnosis-display";
import { vi } from "@/lib/vi";
import { toast } from "@/lib/toast";
import type { DiagnosisResult, Step1PlantResponse } from "@/types/api";

type DiagnoseState = "idle" | "uploading" | "analyzing_plant" | "confirming_plant" | "analyzing_disease" | "done" | "error";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxSize = 10 * 1024 * 1024;

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function friendlyError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("network") || lower.includes("fetch") || lower.includes("server") || lower.includes("fastapi")) {
    return vi.diagnosis.errors.serverDown;
  }

  if (lower.includes("no plant") || lower.includes("unknown") || lower.includes("không xác định")) {
    return vi.diagnosis.errors.noPlant;
  }

  if (lower.includes("blur") || lower.includes("quality") || lower.includes("rõ")) {
    return vi.diagnosis.errors.lowQuality;
  }

  return vi.diagnosis.errors.generic;
}

function stepInfo(state: DiagnoseState) {
  if (state === "uploading") {
    return { label: "Bước 1/3 — Đang tải ảnh lên...", width: "33%" };
  }

  if (state === "analyzing_plant") {
    return { label: "Bước 2/3 — Đang nhận diện loại cây...", width: "66%" };
  }

  if (state === "analyzing_disease") {
    return { label: "Bước 3/3 — Đang nhận diện bệnh...", width: "90%" };
  }

  return { label: "Đang chuẩn bị...", width: "10%" };
}

function resultOptions(result: DiagnosisResult) {
  return {
    plantOptions: [result.plant_label],
    diseaseOptions: [
      result.disease_label,
      ...(result.disease_top_candidates ?? []).map((candidate) => candidate.label),
    ],
  };
}

export default function DiagnosisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<DiagnoseState>("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step1, setStep1] = useState<Step1PlantResponse | null>(null);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedPlantConfidence, setSelectedPlantConfidence] = useState(0);
  const [isPending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const isProcessing = isPending || state === "uploading" || state === "analyzing_plant" || state === "analyzing_disease";
  const progress = stepInfo(state);
  const resultSeverity = result ? getSeverity(result.disease_label, result.disease_confidence) : "unknown";
  const resultSeverityConfig = severityConfig[resultSeverity];

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (state === "done") {
      resultRef.current?.focus();
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state]);

  const reset = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep1(null);
    setSelectedPlant("");
    setSelectedPlantConfidence(0);
    setState("idle");
  };

  const selectFile = (file?: File) => {
    if (!file || isProcessing) {
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setError(vi.upload.errors.wrongType);
      setState("error");
      return;
    }

    if (file.size > maxSize) {
      setError(vi.upload.errors.tooLarge);
      setState("error");
      return;
    }

    const url = URL.createObjectURL(file);
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);
    setPreview(url);
    setResult(null);
    setError(null);
    setStep1(null);
    setSelectedPlant("");
    setSelectedPlantConfidence(0);
    setState("idle");
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
  };

  const startDiagnosis = () => {
    if (!selectedFile || isProcessing) {
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);
    setError(null);
    setResult(null);
    setState("uploading");

    startTransition(async () => {
      try {
        const plantTimer = window.setTimeout(() => setState("analyzing_plant"), 350);
        const diseaseTimer = window.setTimeout(() => setState("analyzing_disease"), 850);

        const response = await uploadDiagnosis(formData);
        window.clearTimeout(plantTimer);
        window.clearTimeout(diseaseTimer);

        if (response.error) {
          throw new Error(response.error);
        }

        if (response.step1 && !response.data) {
          const candidates = response.step1.top_candidates ?? [];
          if (!response.step1.can_confirm || candidates.length === 0 || !response.step1.step2_access_token) {
            throw new Error(response.step1.message || vi.diagnosis.errors.noPlant);
          }

          const defaultCandidate =
            candidates.find((candidate) => candidate.label === response.step1?.plant_label) ?? candidates[0];

          setStep1(response.step1);
          setSelectedPlant(defaultCandidate.label);
          setSelectedPlantConfidence(defaultCandidate.confidence || response.step1.plant_confidence || 0);
          setState("confirming_plant");
          toast.success("Hãy xác nhận loại cây để tiếp tục nhận diện bệnh.");
          return;
        }

        if (!response.data) {
          throw new Error(vi.diagnosis.errors.generic);
        }

        setResult(response.data);
        setState("done");
        toast.success("Chẩn đoán hoàn tất.");
      } catch (diagnosisError) {
        Sentry.captureException(diagnosisError, {
          tags: { component: "SimpleDiagnosisPage" },
          extra: { fileName: selectedFile.name, fileSize: selectedFile.size },
        });
        const message = diagnosisError instanceof Error ? diagnosisError.message : vi.diagnosis.errors.generic;
        setError(friendlyError(message));
        setState("error");
      }
    });
  };

  const continueDiagnosis = () => {
    if (!selectedFile || !step1 || !selectedPlant || isProcessing) {
      return;
    }

    if (!step1.step2_access_token) {
      setError("Thiếu token cho Bước 2. Vui lòng chạy lại Bước 1.");
      setState("error");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);
    formData.append("confirmed_plant_label", selectedPlant);
    formData.append("plant_confidence", String(selectedPlantConfidence));
    formData.append("step2_access_token", step1.step2_access_token);

    setError(null);
    setResult(null);
    setState("analyzing_disease");

    startTransition(async () => {
      try {
        const response = await confirmAndDiagnose(formData);

        if (response.error) {
          throw new Error(response.error);
        }

        if (!response.data) {
          throw new Error(vi.diagnosis.errors.generic);
        }

        setStep1(null);
        setResult(response.data);
        setState("done");
        toast.success("Chẩn đoán hoàn tất.");
      } catch (diagnosisError) {
        Sentry.captureException(diagnosisError, {
          tags: { component: "SimpleDiagnosisPage", flow: "step2-confirmed" },
          extra: { fileName: selectedFile.name, fileSize: selectedFile.size, selectedPlant },
        });
        const message = diagnosisError instanceof Error ? diagnosisError.message : vi.diagnosis.errors.generic;
        setError(friendlyError(message));
        setState("error");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-2 pb-8">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <Link className="text-base font-semibold text-primary" href="/dashboard" title="Quay lại dashboard">
          ← Quay lại
        </Link>
        <span className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Plant Detec</span>
      </div>

      <header className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-semibold text-neutral-900">
          Chụp ảnh lá cây để chẩn đoán
        </h1>
        <p className="text-lg leading-7 text-neutral-600">Đảm bảo ảnh rõ nét, thấy rõ lá cây.</p>
      </header>

      <input accept="image/*" className="hidden" onChange={handleChange} ref={pickerRef} type="file" />
      <input accept="image/*" capture="environment" className="hidden" onChange={handleChange} ref={cameraRef} type="file" />

      <button
        className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-white p-6 text-center"
        disabled={isProcessing}
        onClick={() => pickerRef.current?.click()}
        type="button"
      >
        {preview ? (
          <div className="relative h-[300px] w-full overflow-hidden rounded-xl">
            <Image alt="Ảnh lá cây đã chọn" fill className="object-cover" src={preview} unoptimized />
          </div>
        ) : (
          <>
            <span className="text-[64px] leading-none">🍃</span>
            <span className="mt-4 text-xl font-bold text-neutral-900">Nhấn vào đây để chọn ảnh</span>
            <span className="mt-2 text-base text-neutral-500">Hoặc kéo thả ảnh vào đây</span>
          </>
        )}
      </button>

      {selectedFile ? (
        <div className="text-center text-sm text-neutral-500">
          {selectedFile.name} · {formatFileSize(selectedFile.size)}
        </div>
      ) : null}

      {!selectedFile ? (
        <div className="grid grid-cols-2 gap-3">
          <Button className="min-h-[56px] text-base" onClick={() => cameraRef.current?.click()}>
            📷 Chụp bằng camera
          </Button>
          <Button className="min-h-[56px] text-base" onClick={() => pickerRef.current?.click()} variant="outline">
            Chọn từ thư viện
          </Button>
        </div>
      ) : null}

      {selectedFile && !isProcessing && !result && state !== "confirming_plant" ? (
        <div className="space-y-3">
          <Button className="min-h-[56px] w-full text-lg font-bold" onClick={startDiagnosis}>
            ✓ Bắt đầu chẩn đoán
          </Button>
          <Button className="w-full" onClick={reset} variant="ghost">
            Chọn ảnh khác
          </Button>
        </div>
      ) : null}

      {step1 && state === "confirming_plant" ? (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Xác nhận loại cây</h2>
            <p className="mt-2 text-base leading-7 text-neutral-600">
              {step1.message ||
                "Độ tin cậy chưa đủ chắc chắn. Hãy chọn loại cây đúng để hệ thống nhận diện bệnh trong phạm vi cây đó."}
            </p>
          </div>

          <div className="space-y-2">
            {(step1.top_candidates ?? []).map((candidate) => {
              const isSelected = selectedPlant === candidate.label;
              const confidence = Math.round((candidate.confidence || 0) * 100);

              return (
                <button
                  className={
                    "w-full rounded-xl border p-4 text-left transition-colors " +
                    (isSelected
                      ? "border-primary bg-primary-pale/70 text-primary"
                      : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50")
                  }
                  key={candidate.label}
                  onClick={() => {
                    setSelectedPlant(candidate.label);
                    setSelectedPlantConfidence(candidate.confidence || 0);
                  }}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-bold">{getPlantDisplayName(candidate.label)}</span>
                    <span className="text-sm font-semibold">{confidence}%</span>
                  </span>
                </button>
              );
            })}
          </div>

          <Button className="min-h-[56px] w-full text-lg font-bold" onClick={continueDiagnosis}>
            Xác nhận & nhận diện bệnh
          </Button>
          <Button className="w-full" onClick={reset} variant="ghost">
            Chọn ảnh khác
          </Button>
        </div>
      ) : null}

      {isProcessing ? (
        <div className="space-y-3 rounded-2xl border border-neutral-100 bg-white p-5" aria-live="assertive">
          <p className="text-sm font-semibold text-neutral-500">Đang phân tích...</p>
          <div className="h-3 overflow-hidden rounded-full bg-primary-pale">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all" style={{ width: progress.width }} />
          </div>
          <p className="text-base font-semibold text-neutral-800">{progress.label}</p>
        </div>
      ) : null}

      {error ? (
        <div className="space-y-4 rounded-2xl border border-danger/20 bg-red-50 p-6 text-center" role="alert">
          <div className="text-5xl">⚠️</div>
          <p className="text-lg font-semibold text-red-800">{error}</p>
          <Button className="min-h-[56px] w-full text-lg" onClick={reset}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4" ref={resultRef} tabIndex={-1}>
          <section className="space-y-5 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm" data-testid="result-card">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{getPlantDisplayName(result.plant_label)}</h2>
              <p className="mt-2 text-xl font-semibold text-neutral-800">
                {getDiseaseDisplayName(result.disease_label)}
              </p>
            </div>
            <div className="space-y-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${resultSeverityConfig.color}`}
                data-testid="severity-badge"
              >
                {resultSeverityConfig.badge}
              </span>

              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-neutral-500">Nhận diện cây</span>
                  <span className="font-medium">{(result.plant_confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-700"
                    style={{ width: `${Math.round(result.plant_confidence * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-neutral-500">Nhận diện bệnh</span>
                  <span className="font-medium">{(result.disease_confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${resultSeverityConfig.bar}`}
                    style={{ width: `${Math.round(result.disease_confidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <RecommendationPanel diseaseLabel={result.disease_label} recommendation={result.recommendation} />
            <FeedbackWidget
              diagnosisId={result.id}
              predictedDisease={result.disease_label}
              predictedPlant={result.plant_label}
              {...resultOptions(result)}
            />
          </section>
          <Button className="min-h-[56px] w-full text-lg" onClick={reset} variant="outline">
            📷 Chẩn đoán ảnh khác
          </Button>
        </div>
      ) : null}
    </div>
  );
}
