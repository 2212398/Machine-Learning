"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadAndDiagnose, confirmAndDiagnose } from "@/lib/actions/diagnosis";
import type { DiagnosisResult, Step1PlantResponse } from "@/types/api";

interface UploadFormProps {
  onSuccess: (result: DiagnosisResult) => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step1, setStep1] = useState<Step1PlantResponse | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedPlantConfidence, setSelectedPlantConfidence] = useState<number>(0);
  const maxUploadBytes = 5 * 1024 * 1024; // Keep legacy form validation aligned with backend and storage limits.

  const resetFlowState = () => {
    setStep1(null);
    setSelectedPlant("");
    setSelectedPlantConfidence(0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-brand-500", "bg-brand-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-brand-500", "bg-brand-50");
  };

  const readSelectedImage = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Chỉ hỗ trợ ảnh JPEG hoặc PNG");
      return;
    }

    if (selectedFile.size > maxUploadBytes) {
      setError("Ảnh quá lớn (tối đa 5MB)");
      return;
    }

    setFile(selectedFile);
    resetFlowState();
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-brand-500", "bg-brand-50");

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      readSelectedImage(files[0]);
      return;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      readSelectedImage(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn ảnh trước");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // If Step1 needs confirmation, proceed with Step2 using user's selection.
      if (step1 && step1.requires_confirmation && !step1.auto_confirmed) {
        if (!selectedPlant) {
          setError("Vui lòng chọn loại cây để tiếp tục.");
          return;
        }
        if (!step1.step2_access_token) {
          setError("Thiếu token cho Bước 2. Vui lòng chạy lại Bước 1.");
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("confirmed_plant_label", selectedPlant);
        formData.append("plant_confidence", String(selectedPlantConfidence));
        formData.append("step2_access_token", step1.step2_access_token);

        const result = await confirmAndDiagnose(formData);
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          onSuccess(result.data);
          setFile(null);
          setPreview("");
          resetFlowState();
        }
        return;
      }

      // Otherwise run Step1 (and auto-Step2 when possible).
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAndDiagnose(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        onSuccess(result.data);
        setFile(null);
        setPreview("");
        resetFlowState();
      } else if (result.step1) {
        setStep1(result.step1);

        const candidates = result.step1.top_candidates ?? [];
        const defaultLabel =
          result.step1.plant_label && result.step1.plant_label !== "unknown_plant"
            ? result.step1.plant_label
            : candidates[0]?.label || "";
        setSelectedPlant(defaultLabel);

        const defaultCandidate = candidates.find((c) => c.label === defaultLabel);
        setSelectedPlantConfidence(defaultCandidate?.confidence ?? result.step1.plant_confidence ?? 0);
      }
    } catch (err) {
      setError("Lỗi khi xử lý ảnh. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative border-2 border-dashed border-border rounded-2xl p-8 text-center transition-colors cursor-pointer hover:border-brand-300"
          >
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-64 w-64 object-cover rounded-xl mx-auto"
                />
                <p className="text-sm text-muted-foreground">
                  Ảnh lá cây được chọn: <strong>{file?.name}</strong>
                </p>
              </div>
            ) : (
              <div className="py-12">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0116.5 19.5H6.75z"
                  />
                </svg>
                <p className="mt-4 text-sm font-medium">
                  Kéo thả ảnh lá cây, hoặc click để chọn file
                </p>
                <p className="mt-1 text-sm sm:text-xs text-muted-foreground">
                  Hỗ trợ: JPEG, PNG
                </p>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer absolute inset-0 rounded-2xl" />
          </div>

          {/* Step 1 confirmation */}
          {step1 && step1.requires_confirmation && !step1.auto_confirmed ? (
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">Xác nhận loại cây</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step1.message ||
                  "Độ tin cậy chưa đủ chắc chắn. Hãy chọn loại cây đúng để hệ thống chỉ chẩn đoán bệnh trong phạm vi cây đó."}
              </p>

              {Array.isArray(step1.top_candidates) && step1.top_candidates.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {step1.top_candidates.map((candidate) => {
                    const isSelected = selectedPlant === candidate.label;
                    const confPercent = Math.round((candidate.confidence || 0) * 100);
                    return (
                      <button
                        key={candidate.label}
                        type="button"
                        onClick={() => {
                          setSelectedPlant(candidate.label);
                          setSelectedPlantConfidence(candidate.confidence || 0);
                          setError("");
                        }}
                        className={
                          "w-full rounded-2xl border p-4 text-left transition-colors " +
                          (isSelected
                            ? "border-brand-200 bg-brand-50"
                            : "border-border bg-surfaceAlt hover:bg-surfaceAlt/80")
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-foreground">{candidate.label}</span>
                          <span className="text-sm text-muted-foreground">{confPercent}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Không có gợi ý loại cây. Vui lòng chụp/crop lại ảnh rõ 1 lá rồi thử lại.
                </p>
              )}

              {step1.step2_access_expires_in_sec ? (
                <p className="mt-3 text-sm sm:text-xs text-muted-foreground">
                  Token Bước 2 hết hạn sau khoảng {step1.step2_access_expires_in_sec}s.
                </p>
              ) : null}
            </Card>
          ) : null}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4 rounded-2xl border border-border bg-surfaceAlt p-4 animate-pulse">
              <div className="h-5 w-1/3 rounded bg-border" />
              <div className="h-4 w-2/3 rounded bg-border" />
              <div className="h-2 w-full rounded bg-border" />
              <div className="h-24 rounded-xl bg-border" />
            </div>
          ) : null}

          {/* Submit button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!file || loading}
              className="flex-1"
            >
              {loading
                ? "Đang xử lý..."
                : step1 && step1.requires_confirmation && !step1.auto_confirmed
                ? "Xác nhận & Chẩn đoán"
                : "Chẩn đoán bệnh lá"}
            </Button>
            {file && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPreview("");
                  resetFlowState();
                }}
              >
                Xóa
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Info card */}
      <Card className="p-6 bg-surface-variant">
        <h3 className="font-medium mb-2">Cách sử dụng:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Chụp ảnh rõ ràng của phần lá cây bị bệnh</li>
          <li>• Chắc chắn ánh sáng đủ để thấy các triệu chứng</li>
          <li>• Hệ thống sẽ nhận diện loại cây trước, rồi bệnh trên cây đó</li>
          <li>• Kết quả sẽ lưu vào lịch sử để theo dõi</li>
        </ul>
      </Card>
    </div>
  );
}
