"use client";

import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ImagePlus, Loader2, RefreshCw, ScanLine, Upload } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { FeedbackWidget } from "@/components/diagnosis/FeedbackWidget";
import { RecommendationPanel } from "@/components/diagnosis/RecommendationPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmAndDiagnose, uploadDiagnosis } from "@/lib/actions/diagnosis";
import { getDiseaseDisplayName, getPlantDisplayName, getSeverity, severityConfig } from "@/lib/diagnosis-display";
import { cn } from "@/lib/utils";
import { vi } from "@/lib/vi";
import { toast } from "@/lib/toast";
import type { DiagnosisResult, Step1PlantResponse } from "@/types/api";

type DiagnoseState = "idle" | "uploading" | "analyzing_plant" | "confirming_plant" | "analyzing_disease" | "done" | "error";

const allowedTypes = ["image/jpeg", "image/png"];
const allowedFileText = "JPG, JPEG hoặc PNG";
const maxSize = 5 * 1024 * 1024;

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
    return { label: "Bước 1/3 - Đang tải ảnh lên", width: "33%" };
  }

  if (state === "analyzing_plant") {
    return { label: "Bước 2/3 - Đang nhận diện loại cây", width: "66%" };
  }

  if (state === "analyzing_disease") {
    return { label: "Bước 3/3 - Đang nhận diện bệnh", width: "90%" };
  }

  return { label: "Đang chuẩn bị", width: "10%" };
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

function validateImageFile(file: File) {
  // Client-side type check: stop unsupported files before they consume upload/API/model resources.
  if (!allowedTypes.includes(file.type)) {
    return `Chỉ nhận ảnh ${allowedFileText}.`;
  }

  // Client-side size check: keep large files away from the backend to avoid slow uploads and memory pressure.
  if (file.size > maxSize) {
    return `Ảnh quá lớn. Vui lòng chọn file tối đa ${formatFileSize(maxSize)}.`;
  }

  return null;
}

function ConfidenceMeter({ label, value, barClassName }: { label: string; value: number; barClassName: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-bold text-neutral-900">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className={cn("h-full rounded-full transition-all duration-700", barClassName)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function DiagnosisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<DiagnoseState>("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [step1, setStep1] = useState<Step1PlantResponse | null>(null);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedPlantConfidence, setSelectedPlantConfidence] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const isProcessing = isLoading || isPending || state === "uploading" || state === "analyzing_plant" || state === "analyzing_disease";
  const progress = stepInfo(state);
  const resultSeverity = result ? getSeverity(result.disease_label, result.disease_confidence) : "unknown";
  const resultSeverityConfig = severityConfig[resultSeverity];

  useEffect(() => {
    return () => {
      // Hydration guard: object URLs exist only after a client file input change, never during server render.
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
    setFileError(null);
    setStep1(null);
    setSelectedPlant("");
    setSelectedPlantConfidence(0);
    setIsLoading(false);
    setState("idle");
  };

  const clearFileInputs = () => {
    if (pickerRef.current) {
      pickerRef.current.value = "";
    }
    if (cameraRef.current) {
      cameraRef.current.value = "";
    }
  };

  const selectFile = (file?: File) => {
    if (!file || isProcessing) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setSelectedFile(null);
      setPreview(null);
      setResult(null);
      setError(null);
      setFileError(validationError);
      setState("idle");
      clearFileInputs();
      toast.error(validationError);
      return;
    }

    // Hydration guard: createObjectURL is browser-only and must stay inside event-driven client code.
    const url = URL.createObjectURL(file);
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);
    setPreview(url);
    setResult(null);
    setError(null);
    setFileError(null);
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
    setFileError(null);
    setResult(null);
    setState("uploading");
    // Loading state locks diagnosis controls immediately to prevent duplicate requests while AI is running.
    setIsLoading(true);

    startTransition(async () => {
      try {
        // Hydration guard: timers use window only after a user action in this client component.
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
          setIsLoading(false);
          setState("confirming_plant");
          toast.success("Hãy xác nhận loại cây để tiếp tục nhận diện bệnh.");
          return;
        }

        if (!response.data) {
          throw new Error(vi.diagnosis.errors.generic);
        }

        setResult(response.data);
        setIsLoading(false);
        setState("done");
        toast.success("Chẩn đoán hoàn tất.");
      } catch (diagnosisError) {
        Sentry.captureException(diagnosisError, {
          tags: { component: "DiagnosisPage" },
          extra: { fileName: selectedFile.name, fileSize: selectedFile.size },
        });
        const message = diagnosisError instanceof Error ? diagnosisError.message : vi.diagnosis.errors.generic;
        setError(friendlyError(message));
        setIsLoading(false);
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
    setFileError(null);
    setResult(null);
    setState("analyzing_disease");
    // Loading state also protects the second-step confirmation from spam clicks.
    setIsLoading(true);

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
        setIsLoading(false);
        setState("done");
        toast.success("Chẩn đoán hoàn tất.");
      } catch (diagnosisError) {
        Sentry.captureException(diagnosisError, {
          tags: { component: "DiagnosisPage", flow: "step2-confirmed" },
          extra: { fileName: selectedFile.name, fileSize: selectedFile.size, selectedPlant },
        });
        const message = diagnosisError instanceof Error ? diagnosisError.message : vi.diagnosis.errors.generic;
        setError(friendlyError(message));
        setIsLoading(false);
        setState("error");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <Link className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary transition hover:bg-primary/10" href="/dashboard" title="Quay lại dashboard">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại
        </Link>
        <span className="rounded-full bg-primary-pale px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">Plant Detec</span>
      </div>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-neutral-900 sm:text-4xl">Chụp ảnh lá cây để chẩn đoán</h1>
        <p className="text-base leading-7 text-neutral-600">Đặt lá trong khung hình, tránh rung tay và ưu tiên ánh sáng tự nhiên.</p>
      </header>

      <input accept="image/jpeg,image/png" className="hidden" onChange={handleChange} ref={pickerRef} type="file" />
      <input accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleChange} ref={cameraRef} type="file" />

      <Card className="overflow-hidden p-0">
        <button
          className={cn(
            "flex min-h-[300px] w-full flex-col items-center justify-center bg-white p-3 text-center transition",
            !isProcessing && "hover:bg-primary-pale/25",
            isProcessing && "cursor-not-allowed opacity-70",
          )}
          disabled={isProcessing}
          onClick={() => pickerRef.current?.click()}
          type="button"
        >
          {preview ? (
            <div className="relative h-[320px] w-full overflow-hidden rounded-md bg-neutral-100">
              <Image alt={`Preview ${selectedFile?.name ?? "ảnh lá cây"}`} fill className="object-cover" src={preview} unoptimized />
            </div>
          ) : (
            <div className="flex max-w-sm flex-col items-center px-4 py-10">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-primary-pale text-primary">
                <ImagePlus className="h-8 w-8" aria-hidden="true" />
              </span>
              <span className="mt-5 text-xl font-bold text-neutral-900">Chọn hoặc chụp ảnh lá</span>
              <span className="mt-2 text-sm leading-6 text-neutral-600">Hỗ trợ {allowedFileText}. Kích thước tối đa {formatFileSize(maxSize)}.</span>
            </div>
          )}
        </button>
      </Card>

      {fileError ? (
        <p className="rounded-lg border border-danger/20 bg-red-50 px-4 py-3 text-sm font-semibold text-danger" role="alert">
          {fileError}
        </p>
      ) : null}

      {selectedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
          <span className="min-w-0 truncate font-semibold text-neutral-800">{selectedFile.name}</span>
          <span className="shrink-0">{formatFileSize(selectedFile.size)}</span>
        </div>
      ) : null}

      {!selectedFile ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button className="min-h-[56px] text-base" disabled={isProcessing} onClick={() => cameraRef.current?.click()} icon={<Camera className="h-5 w-5" aria-hidden="true" />}>
            Chụp bằng camera
          </Button>
          <Button className="min-h-[56px] text-base" disabled={isProcessing} onClick={() => pickerRef.current?.click()} icon={<Upload className="h-5 w-5" aria-hidden="true" />} variant="outline">
            Chọn từ thư viện
          </Button>
        </div>
      ) : null}

      {selectedFile && !result && state !== "confirming_plant" ? (
        <div className="space-y-3">
          <Button
            className="min-h-[56px] w-full text-lg font-bold"
            disabled={isProcessing}
            onClick={startDiagnosis}
            icon={isProcessing ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ScanLine className="h-5 w-5" aria-hidden="true" />}
          >
            {isProcessing ? "Đang xử lý..." : "Bắt đầu chẩn đoán"}
          </Button>
          <Button className="w-full" disabled={isProcessing} onClick={reset} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} variant="ghost">
            Chọn ảnh khác
          </Button>
        </div>
      ) : null}

      {step1 && state === "confirming_plant" ? (
        <Card className="space-y-4 border-primary/20 p-5">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Xác nhận loại cây</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
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
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition",
                    isSelected
                      ? "border-primary bg-primary-pale/70 text-primary shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-primary/40 hover:bg-primary-pale/20",
                  )}
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

          <Button
            className="min-h-[56px] w-full text-lg font-bold"
            disabled={isProcessing}
            onClick={continueDiagnosis}
            icon={isProcessing ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          >
            {isProcessing ? "Đang xử lý..." : "Xác nhận và nhận diện bệnh"}
          </Button>
          <Button className="w-full" disabled={isProcessing} onClick={reset} variant="ghost">
            Chọn ảnh khác
          </Button>
        </Card>
      ) : null}

      {isProcessing ? (
        <Card className="space-y-4 p-5" aria-live="assertive">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-neutral-600">Đang phân tích ảnh</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-primary-pale">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all" style={{ width: progress.width }} />
          </div>
          <p className="text-base font-semibold text-neutral-800">{progress.label}</p>
        </Card>
      ) : null}

      {error ? (
        <Card className="space-y-4 border-danger/20 bg-red-50 p-5 text-center" role="alert">
          <AlertTriangle className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />
          <p className="text-lg font-semibold text-red-800">{error}</p>
          <Button className="min-h-[56px] w-full text-lg" onClick={reset} icon={<RefreshCw className="h-5 w-5" aria-hidden="true" />}>
            Thử lại
          </Button>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-4 outline-none" ref={resultRef} tabIndex={-1}>
          <Card className="space-y-5 p-5" data-testid="result-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Kết quả</p>
                <h2 className="mt-2 text-2xl font-bold text-neutral-900">{getPlantDisplayName(result.plant_label)}</h2>
                <p className="mt-1 text-lg font-semibold text-neutral-700">{getDiseaseDisplayName(result.disease_label)}</p>
              </div>
              <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium", resultSeverityConfig.color)} data-testid="severity-badge">
                {resultSeverityConfig.badge}
              </span>
            </div>

            <div className="space-y-4 rounded-lg border border-neutral-100 bg-surface-raised p-4">
              <ConfidenceMeter label="Nhận diện cây" value={result.plant_confidence} barClassName="bg-green-400" />
              <ConfidenceMeter label="Nhận diện bệnh" value={result.disease_confidence} barClassName={resultSeverityConfig.bar} />
            </div>

            <RecommendationPanel diseaseLabel={result.disease_label} recommendation={result.recommendation} />
            <FeedbackWidget
              diagnosisId={result.id}
              predictedDisease={result.disease_label}
              predictedPlant={result.plant_label}
              {...resultOptions(result)}
            />
          </Card>
          <Button className="min-h-[56px] w-full text-lg" onClick={reset} icon={<Camera className="h-5 w-5" aria-hidden="true" />} variant="outline">
            Chẩn đoán ảnh khác
          </Button>
        </div>
      ) : null}
    </div>
  );
}
