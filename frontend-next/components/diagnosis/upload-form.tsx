"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadAndDiagnose } from "@/lib/actions/diagnosis";
import type { DiagnosisResult } from "@/types/api";

interface UploadFormProps {
  onSuccess: (result: DiagnosisResult) => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-brand-500", "bg-brand-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-brand-500", "bg-brand-50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-brand-500", "bg-brand-50");

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type.startsWith("image/")) {
        setFile(droppedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(droppedFile);
        setError("");
      } else {
        setError("Chỉ hỗ trợ file ảnh (JPEG, PNG, WebP, etc.)");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setError("");
    } else if (selectedFile) {
      setError("Chỉ hỗ trợ file ảnh (JPEG, PNG, WebP, etc.)");
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
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAndDiagnose(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        onSuccess(result.data);
        setFile(null);
        setPreview("");
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
            className="border-2 border-dashed border-border rounded-2xl p-8 text-center transition-colors cursor-pointer hover:border-brand-300"
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Hỗ trợ: JPEG, PNG, WebP
                </p>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer absolute inset-0 rounded-2xl" />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
              {error}
            </div>
          )}

          {/* Submit button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!file || loading}
              className="flex-1"
            >
              {loading ? "Đang xử lý..." : "Chẩn đoán bệnh lá"}
            </Button>
            {file && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPreview("");
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
