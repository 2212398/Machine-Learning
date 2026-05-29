"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_FEEDBACK_NOTE_LENGTH = 500;

function normalizeFeedbackNote(note?: string): { note: string | null; error?: string } {
  const normalized = note?.trim() ?? "";

  if (normalized.length > MAX_FEEDBACK_NOTE_LENGTH) {
    // Bound server-action input because clients can bypass UI-level validation.
    return { note: null, error: "Ghi chú không được vượt quá 500 ký tự." };
  }

  return { note: normalized || null };
}

export async function recordFeedback(
  diagnosisId: string,
  isCorrect: boolean,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      return { success: false, error: "Không xác thực" };
    }

    // Verify diagnosis belongs to current user
    const { data: diagnosis, error: diagnosisError } = await supabase
      .from("diagnoses")
      .select("id, user_id")
      .eq("id", diagnosisId)
      .eq("user_id", user.id)
      .single();

    if (diagnosisError || !diagnosis) {
      return { success: false, error: "Không tìm thấy chẩn đoán" };
    }

    const normalizedNote = normalizeFeedbackNote(note);
    if (normalizedNote.error) {
      return { success: false, error: normalizedNote.error };
    }

    // Record feedback
    const { error: feedbackError } = await supabase
      .from("feedbacks")
      .insert({
        diagnosis_id: diagnosisId,
        user_id: user.id,
        is_correct: isCorrect,
        note: normalizedNote.note,
      } as any);

    if (feedbackError) {
      console.error("[Feedback] Error:", feedbackError);
      return { success: false, error: "Lỗi khi lưu phản hồi" };
    }

    return { success: true };
  } catch (error) {
    console.error("[Feedback] Unexpected error:", error);
    return { success: false, error: "Lỗi không mong muốn" };
  }
}

export async function submitFeedback(
  diagnosisId: string,
  isCorrect: boolean,
  correctPlant?: string,
  correctDisease?: string
): Promise<{ success: boolean; error?: string }> {
  const note =
    !isCorrect && (correctPlant || correctDisease)
      ? JSON.stringify({ correctPlant: correctPlant || null, correctDisease: correctDisease || null })
      : undefined;

  return recordFeedback(diagnosisId, isCorrect, note);
}
