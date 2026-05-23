"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DiagnosisResult, DiseaseCandidate, Step1PlantResponse, Step2DiseaseResponse } from "@/types/api";
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

function _toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function _sanitizeStorageName(name: string): string {
  const trimmed = String(name || "upload.jpg").trim();
  const safe = trimmed.replace(/[\\/]+/g, "_");
  return safe.length > 120 ? safe.slice(-120) : safe;
}

async function _fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type || "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

async function _callFastApiStep1(file: File): Promise<Step1PlantResponse> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${FASTAPI_URL}/api/step1/plant`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const detail = text || `FastAPI lỗi (${res.status})`;
    throw new Error(detail);
  }

  return (await res.json()) as Step1PlantResponse;
}

async function _callFastApiStep2(params: {
  file: File;
  confirmedPlantLabel: string;
  step2AccessToken: string | null | undefined;
}): Promise<Step2DiseaseResponse> {
  const fd = new FormData();
  fd.append("confirmed_plant_label", params.confirmedPlantLabel);
  fd.append("plant_confirmed", "true");
  if (params.step2AccessToken) {
    fd.append("step2_access_token", params.step2AccessToken);
  }
  fd.append("files", params.file, params.file.name);

  const res = await fetch(`${FASTAPI_URL}/api/step2/disease`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const detail = text || `FastAPI lỗi (${res.status})`;
    throw new Error(detail);
  }

  return (await res.json()) as Step2DiseaseResponse;
}

async function _persistDiagnosis(params: {
  file: File;
  userId: string;
  plantLabel: string;
  plantConfidence: number;
  diseaseLabel: string;
  diseaseConfidence: number;
  diseaseTopCandidates?: DiseaseCandidate[];
  status: string;
  recommendation?: string | null;
}): Promise<{ data?: DiagnosisResult; error?: string }> {
  const supabase = await createSupabaseServerClient();

  const timestamp = new Date();
  const safeName = _sanitizeStorageName(params.file.name);
  const storagePath = `${params.userId}/${timestamp.getFullYear()}/${String(timestamp.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(timestamp.getDate()).padStart(2, "0")}/${Date.now()}-${safeName}`;

  let imageUrl = "";
  try {
    const { error: uploadError } = await supabase.storage.from("leaf-uploads").upload(storagePath, params.file as any);
    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from("leaf-uploads").getPublicUrl(storagePath);
    imageUrl = publicUrlData.publicUrl;
  } catch (storageError) {
    console.warn("[Diagnosis] Storage error (non-critical):", storageError);
    imageUrl = await _fileToDataUrl(params.file);
  }

  const { data: diagnosis, error: dbError } = await (supabase.from("diagnoses") as any)
    .insert({
      user_id: params.userId,
      plant_label: params.plantLabel,
      plant_confidence: params.plantConfidence,
      disease_label: params.diseaseLabel,
      disease_confidence: params.diseaseConfidence,
      status: params.status || "completed",
      recommendation: params.recommendation ?? null,
      image_url: imageUrl,
      model_version: "mobilenetv3-two-step",
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

  const { error: imgError } = await (supabase.from("diagnosis_images") as any).insert({
    diagnosis_id: diagnosisRow.id,
    user_id: params.userId,
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

  return {
    data: {
      id: diagnosisRow.id,
      plant_label: diagnosisRow.plant_label ?? "",
      plant_confidence: diagnosisRow.plant_confidence ?? 0,
      disease_label: diagnosisRow.disease_label ?? "",
      disease_confidence: diagnosisRow.disease_confidence ?? 0,
      disease_top_candidates: params.diseaseTopCandidates ?? [],
      recommendation: params.recommendation ?? null,
      image_url: diagnosisRow.image_url ?? "",
      created_at: diagnosisRow.created_at,
    },
  };
}

export async function uploadAndDiagnose(
  formData: FormData
): Promise<{ data?: DiagnosisResult; step1?: Step1PlantResponse; error?: string }> {
  try {
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

    // Step 1: plant classification (may require user confirmation)
    let step1: Step1PlantResponse;
    try {
      step1 = await _callFastApiStep1(file);
    } catch (err) {
      console.error("[Diagnosis] Step1 error:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "FastAPI không phản hồi. Kiểm tra xem server có chạy không.",
      };
    }

    if (step1.requires_confirmation && !step1.auto_confirmed) {
      return { step1 };
    }

    const confirmedPlantLabel =
      step1.plant_label && step1.plant_label !== "unknown_plant"
        ? step1.plant_label
        : step1.top_candidates?.[0]?.label;

    if (!confirmedPlantLabel) {
      return { error: "Không xác định được loại cây. Vui lòng chụp lại ảnh rõ 1 lá." };
    }

    if (!step1.step2_access_token) {
      return { error: "Thiếu token cho Bước 2. Vui lòng chạy lại." };
    }

    // Step 2: disease classification restricted to confirmed plant
    let step2: Step2DiseaseResponse;
    try {
      step2 = await _callFastApiStep2({
        file,
        confirmedPlantLabel,
        step2AccessToken: step1.step2_access_token,
      });
    } catch (err) {
      console.error("[Diagnosis] Step2 error:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "FastAPI không phản hồi ở Bước 2. Kiểm tra server và thử lại.",
      };
    }

    return await _persistDiagnosis({
      file,
      userId: user.id,
      plantLabel: step2.plant_label || confirmedPlantLabel,
      plantConfidence: _clamp01(_toNumber(step1.plant_confidence, 0)),
      diseaseLabel: step2.final_disease_label,
      diseaseConfidence: _clamp01(_toNumber(step2.final_disease_confidence, 0)),
      diseaseTopCandidates: step2.final_disease_top_candidates ?? [],
      status: step2.status || "completed",
      recommendation: step2.recommendation ?? null,
    });
  } catch (error) {
    console.error("[Diagnosis] Unexpected error:", error);
    return {
      error: "Lỗi không mong muốn khi xử lý ảnh",
    };
  }
}

export async function uploadDiagnosis(
  formData: FormData
): Promise<{ data?: DiagnosisResult; step1?: Step1PlantResponse; error?: string }> {
  return uploadAndDiagnose(formData);
}

export async function confirmAndDiagnose(
  formData: FormData
): Promise<{ data?: DiagnosisResult; error?: string }> {
  try {
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

    const confirmedPlantLabel = String(formData.get("confirmed_plant_label") || "").trim();
    const step2AccessToken = String(formData.get("step2_access_token") || "").trim();
    const plantConfidence = _clamp01(_toNumber(formData.get("plant_confidence"), 0));

    if (!confirmedPlantLabel) {
      return { error: "Thiếu loại cây đã xác nhận." };
    }
    if (!step2AccessToken) {
      return { error: "Thiếu token cho Bước 2. Vui lòng chạy lại Bước 1." };
    }

    let step2: Step2DiseaseResponse;
    try {
      step2 = await _callFastApiStep2({
        file,
        confirmedPlantLabel,
        step2AccessToken,
      });
    } catch (err) {
      console.error("[Diagnosis] Step2 error:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "FastAPI không phản hồi ở Bước 2. Kiểm tra server và thử lại.",
      };
    }

    return await _persistDiagnosis({
      file,
      userId: user.id,
      plantLabel: step2.plant_label || confirmedPlantLabel,
      plantConfidence,
      diseaseLabel: step2.final_disease_label,
      diseaseConfidence: _clamp01(_toNumber(step2.final_disease_confidence, 0)),
      diseaseTopCandidates: step2.final_disease_top_candidates ?? [],
      status: step2.status || "completed",
      recommendation: step2.recommendation ?? null,
    });
  } catch (error) {
    console.error("[Diagnosis] Unexpected error:", error);
    return {
      error: "Lỗi không mong muốn khi xử lý ảnh",
    };
  }
}
