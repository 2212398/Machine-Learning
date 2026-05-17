"use client";

import { useState } from "react";
import { UploadForm } from "@/components/diagnosis/upload-form";
import { DiagnosisResultCard } from "@/components/diagnosis/result-card";
import type { DiagnosisResult } from "@/types/api";

export default function DiagnosisPage() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  if (result) {
    return (
      <div className="space-y-6">
        <DiagnosisResultCard
          result={result}
          onBack={() => setResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Khu vực chẩn đoán</h2>
        <p className="text-muted-foreground mt-1">
          Tải lên ảnh lá cây để chẩn đoán bệnh. Hệ thống sẽ nhận diện loại cây trước, rồi bệnh trên cây đó.
        </p>
      </div>

      <UploadForm onSuccess={setResult} />
    </div>
  );
}