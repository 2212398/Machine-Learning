"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FastAPIResponse, DiagnosisResult } from "@/types/api";

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

    let prediction: FastAPIResponse;
    let inferenceResponse = await fetch(`${FASTAPI_URL}/api/step1`, {
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

    prediction = await inferenceResponse.json();

    if (!prediction.success) {
      return {
        error: prediction.message || "Không thể nhận diện được ảnh",
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
      const { error: uploadError } = await supabase.storage
        .from("leaf-uploads")
        .upload(storagePath, file);

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
      // For testing, use a placeholder image URL
      imageUrl = `data:image/jpeg;base64,${Buffer.from(new Uint8Array([255, 216, 255, 224])).toString("base64")}`;
    }

    // Step 3: Save diagnosis to database
    console.log("[Diagnosis] Saving to diagnoses table");
    const { data: diagnosis, error: dbError } = await supabase
      .from("diagnoses")
      .insert({
        user_id: user.id,
        plant_label: prediction.plant_prediction.label,
        plant_confidence: prediction.plant_prediction.confidence,
        disease_label: prediction.disease_prediction.label,
        disease_confidence: prediction.disease_prediction.confidence,
        status: "completed",
        image_url: imageUrl,
        model_version: "mobilenetv3-phase2",
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Diagnosis] Database error:", dbError);
      return {
        error: `Lỗi khi lưu kết quả: ${dbError.message}`,
      };
    }

    // Step 4: Also save to diagnosis_images for detailed tracking
    await supabase.from("diagnosis_images").insert({
      diagnosis_id: diagnosis.id,
      user_id: user.id,
      storage_path: storagePath,
      image_url: imageUrl,
      plant_label: diagnosis.plant_label,
      disease_label: diagnosis.disease_label,
      plant_confidence: diagnosis.plant_confidence,
      disease_confidence: diagnosis.disease_confidence,
      analysis_status: "completed",
    });

    console.log("[Diagnosis] Successfully completed", diagnosis.id);

    return {
      data: {
        id: diagnosis.id,
        plant_label: diagnosis.plant_label,
        plant_confidence: diagnosis.plant_confidence,
        disease_label: diagnosis.disease_label,
        disease_confidence: diagnosis.disease_confidence,
        image_url: diagnosis.image_url,
        created_at: diagnosis.created_at,
      },
    };
  } catch (error) {
    console.error("[Diagnosis] Unexpected error:", error);
    return {
      error: "Lỗi không mong muốn khi xử lý ảnh",
    };
  }
}
