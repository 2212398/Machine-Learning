"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ScanHistoryRow = Database["public"]["Tables"]["scan_history"]["Row"];
export type ScanHistoryInput = Pick<
  Database["public"]["Tables"]["scan_history"]["Insert"],
  "image_url" | "plant_label" | "disease_label" | "confidence" | "status" | "note"
>;
export type ScanHistoryUpdate = Partial<
  Pick<ScanHistoryInput, "image_url" | "plant_label" | "disease_label" | "confidence" | "status" | "note">
>;

const MAX_NOTE_LENGTH = 500;
const ALLOWED_STATUS: ScanHistoryRow["status"][] = ["completed", "unknown", "failed"];

function assertDbOk(error: unknown, fallbackMessage: string) {
  if (error) {
    throw new Error(fallbackMessage);
  }
}

async function requireUser() {
  const { user } = await getCurrentUser();

  // Auth must be checked on the server; RLS is the final database guard.
  if (!user) {
    throw new Error("Bạn cần đăng nhập để xem lịch sử chẩn đoán.");
  }

  return user;
}

function cleanText(value: string | null | undefined, fieldName: string, maxLength = 120) {
  const text = value?.trim() ?? "";

  if (!text) {
    throw new Error(`${fieldName} không được để trống.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName} không được vượt quá ${maxLength} ký tự.`);
  }

  return text;
}

function cleanOptionalText(value: string | null | undefined, maxLength = MAX_NOTE_LENGTH) {
  const text = value?.trim() ?? "";

  if (text.length > maxLength) {
    throw new Error(`Ghi chú không được vượt quá ${maxLength} ký tự.`);
  }

  return text || null;
}

function cleanImageUrl(value: string | null | undefined) {
  const text = value?.trim() ?? "";

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error("URL ảnh phải là đường dẫn http hoặc https hợp lệ.");
  }
}

function cleanConfidence(value: number | undefined) {
  const confidence = Number(value ?? 0);

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Độ tin cậy phải nằm trong khoảng 0 đến 1.");
  }

  return confidence;
}

function cleanStatus(value: ScanHistoryInput["status"] | undefined) {
  const status = value ?? "completed";

  if (!ALLOWED_STATUS.includes(status)) {
    throw new Error("Trạng thái lịch sử không hợp lệ.");
  }

  return status;
}

function cleanCreateInput(
  input: ScanHistoryInput,
  userId: string,
): Database["public"]["Tables"]["scan_history"]["Insert"] {
  return {
    user_id: userId,
    image_url: cleanImageUrl(input.image_url),
    plant_label: cleanText(input.plant_label, "Tên cây"),
    disease_label: cleanText(input.disease_label, "Kết quả bệnh"),
    confidence: cleanConfidence(input.confidence),
    status: cleanStatus(input.status),
    note: cleanOptionalText(input.note),
  };
}

function cleanUpdateInput(input: ScanHistoryUpdate): Database["public"]["Tables"]["scan_history"]["Update"] {
  const payload: Database["public"]["Tables"]["scan_history"]["Update"] = {};

  if ("image_url" in input) {
    payload.image_url = cleanImageUrl(input.image_url);
  }

  if ("plant_label" in input && input.plant_label !== undefined) {
    payload.plant_label = cleanText(input.plant_label, "Tên cây");
  }

  if ("disease_label" in input && input.disease_label !== undefined) {
    payload.disease_label = cleanText(input.disease_label, "Kết quả bệnh");
  }

  if ("confidence" in input) {
    payload.confidence = cleanConfidence(input.confidence);
  }

  if ("status" in input) {
    payload.status = cleanStatus(input.status);
  }

  if ("note" in input) {
    payload.note = cleanOptionalText(input.note);
  }

  return payload;
}

export async function getScanHistory() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const table = supabase.from("scan_history");

  // RLS hides rows from other users; eq(user_id) keeps the query explicit and index-friendly.
  const { data, error } = await table
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  assertDbOk(error, "Không thể tải lịch sử chẩn đoán.");
  return (data ?? []) as ScanHistoryRow[];
}

export async function createScanHistory(input: ScanHistoryInput) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const table = supabase.from("scan_history") as any;
  const payload = cleanCreateInput(input, user.id);

  const { data, error } = await table
    .insert(payload)
    .select()
    .single();

  assertDbOk(error, "Không thể tạo lịch sử chẩn đoán.");
  revalidatePath("/dashboard/scan-history");
  return data as ScanHistoryRow;
}

export async function updateScanHistory(id: string, input: ScanHistoryUpdate) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const table = supabase.from("scan_history") as any;
  const payload = cleanUpdateInput(input);

  if (!Object.keys(payload).length) {
    throw new Error("Không có dữ liệu cần cập nhật.");
  }

  const { data, error } = await table
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  assertDbOk(error, "Không thể cập nhật lịch sử chẩn đoán.");
  revalidatePath("/dashboard/scan-history");
  return data as ScanHistoryRow;
}

export async function updateScanHistoryNote(id: string, note: string) {
  return updateScanHistory(id, { note });
}

export async function deleteScanHistory(id: string) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("scan_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  assertDbOk(error, "Không thể xóa lịch sử chẩn đoán.");
  revalidatePath("/dashboard/scan-history");
}
