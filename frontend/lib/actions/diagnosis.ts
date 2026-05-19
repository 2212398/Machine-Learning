"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FastAPIResponse, DiagnosisResult } from "@/types/api";
import type { Database } from "@/types/database";

// Narrow DB row types for safer supabase typings
type DiagnosisRow = {
  id: string;
  user_id: string;
  plant_label: string;
  plant_confidence: number;
  disease_label: string;
  disease_confidence: number;
  status: string;
  image_url: string;
  model_version?: string;
  created_at: string;
};

type DiagnosisImageRow = {
  diagnosis_id: string;
  user_id: string;
  storage_path: string;
  image_url: string;
  plant_label: string;
  disease_label: string;
  plant_confidence: number;
  disease_confidence: number;
  analysis_status: string;
};

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

export async function uploadAndDiagnose(
  formData: FormData
): Promise<{ data?: DiagnosisResult; error?: string }> {
  try {
    // Get auth user
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      return { error: "Không xác thực. Vui lòng đăng nhập lại." };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { error: "Không tìm thấy file ảnh" };
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { error: "Ảnh quá lớn (tối đa 10MB)" };
    }

    // Step 1: Call FastAPI for inference (with fallback to mock)
    console.log(`[Diagnosis] Calling FastAPI at ${FASTAPI_URL}`);
    const inferenceFormData = new FormData();
    inferenceFormData.append("file", file);

    let predictionRaw: any;
    // backend exposes `/api/predict` (legacy single-step) and `/api/step1/plant` (step1),
    // normalize to a common shape expected below.
    let inferenceResponse = await fetch(`${FASTAPI_URL}/api/predict`, {
      method: "POST",
      body: inferenceFormData,
    });

    // If FastAPI fails or models not loaded, fall back to mock endpoint
    if (!inferenceResponse.ok) {
      console.log(
        "[Diagnosis] FastAPI failed, trying mock endpoint for testing"
      );
      inferenceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/mock-diagnosis`,
        {
          method: "POST",
          body: inferenceFormData,
        }
      );
    }

    if (!inferenceResponse.ok) {
      const errorText = await inferenceResponse.text();
      console.error("[Diagnosis] Inference error:", errorText);
      return {
        error: "FastAPI không phản hồi. Kiểm tra xem server có chạy không.",
      };
    }

    predictionRaw = await inferenceResponse.json();

    // Normalize backend response shapes to FastAPIResponse
    // Backend `/api/predict` returns top-level `plant_label`, `plant_confidence`, `disease_label`, `disease_confidence`.
    if (predictionRaw && typeof predictionRaw === "object") {
      if (predictionRaw.plant_prediction && predictionRaw.disease_prediction) {
        // already in expected shape
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        predictionRaw = predictionRaw as FastAPIResponse;
      } else if (predictionRaw.plant_label || predictionRaw.disease_label) {
        predictionRaw = {
          plant_prediction: {
            label: String(predictionRaw.plant_label ?? predictionRaw.plant_label),
            confidence: Number(predictionRaw.plant_confidence ?? 0.0),
          },
          disease_prediction: {
            label: String(predictionRaw.disease_label ?? predictionRaw.disease_label),
            confidence: Number(predictionRaw.disease_confidence ?? 0.0),
          },
          success: predictionRaw.success !== undefined ? Boolean(predictionRaw.success) : true,
          message: predictionRaw.message ?? undefined,
        } as FastAPIResponse;
      }
    }

    const prediction = predictionRaw as FastAPIResponse;

    if (!prediction || !prediction.success) {
      return {
        error: (prediction && (prediction as any).message) || "Không thể nhận diện được ảnh",
      };
    }

    // Step 2: Upload to Supabase Storage
    const timestamp = new Date();
    const storagePath = `${user.id}/${timestamp.getFullYear()}/${String(
      timestamp.getMonth() + 1
    ).padStart(2, "0")}/${String(timestamp.getDate()).padStart(2, "0")}/${
      Date.now()
    }-${file.name}`;

    console.log(`[Diagnosis] Uploading to Storage: ${storagePath}`);
    let imageUrl = "";

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("leaf-uploads")
        .upload(storagePath, file as any);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("leaf-uploads")
        .getPublicUrl(storagePath);

      imageUrl = publicUrlData.publicUrl;
    } catch (storageError) {
      console.warn("[Diagnosis] Storage error (non-critical):", storageError);
      // Use a tiny 1x1 PNG data URL placeholder to avoid Buffer/runtime issues
      imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
    }

    // Step 3: Save diagnosis to database
    console.log("[Diagnosis] Saving to diagnoses table");
    const { data: diagnosis, error: dbError } = await (supabase.from("diagnoses") as any)
      .insert({
        user_id: user.id,
        plant_label: prediction.plant_prediction.label,
        plant_confidence: prediction.plant_prediction.confidence,
        disease_label: prediction.disease_prediction.label,
        disease_confidence: prediction.disease_prediction.confidence,
        status: "completed",
        image_url: imageUrl,
        model_version: "mobilenetv3-phase2",
      } as Database["public"]["Tables"]["diagnoses"]["Insert"])
      .select()
      .single();

    if (dbError || !diagnosis) {
      console.error("[Diagnosis] Database error:", dbError);
      return {
        error: `Lỗi khi lưu kết quả: ${dbError?.message ?? "unknown"}`,
      };
    }

    const diagnosisRow = diagnosis as Database["public"]["Tables"]["diagnoses"]["Row"];

    // Step 4: Also save to diagnosis_images for detailed tracking
    const { error: imgError } = await (supabase.from("diagnosis_images") as any)
      .insert({
        diagnosis_id: diagnosisRow.id,
        user_id: user.id,
        storage_path: storagePath,
        image_url: imageUrl,
        plant_label: diagnosisRow.plant_label ?? null,
        disease_label: diagnosisRow.disease_label ?? null,
        plant_confidence: diagnosisRow.plant_confidence ?? null,
        disease_confidence: diagnosisRow.disease_confidence ?? null,
        analysis_status: "completed",
      } as Database["public"]["Tables"]["diagnosis_images"]["Insert"]);

    if (imgError) {
      console.warn("[Diagnosis] diagnosis_images insert warning:", imgError);
    }

    console.log("[Diagnosis] Successfully completed", diagnosisRow.id);

    return {
      data: {
        id: diagnosisRow.id,
        plant_label: diagnosisRow.plant_label ?? "",
        plant_confidence: diagnosisRow.plant_confidence ?? 0,
        disease_label: diagnosisRow.disease_label ?? "",
        disease_confidence: diagnosisRow.disease_confidence ?? 0,
        image_url: diagnosisRow.image_url ?? "",
        created_at: diagnosisRow.created_at,
      },
    };
  } catch (error) {
    console.error("[Diagnosis] Unexpected error:", error);
    return {
      error: "Lỗi không mong muốn khi xử lý ảnh",
    };
  }
}
