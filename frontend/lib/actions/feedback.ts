"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    // Record feedback
    const { error: feedbackError } = await supabase
      .from("feedbacks")
      .insert({
        diagnosis_id: diagnosisId,
        user_id: user.id,
        is_correct: isCorrect,
        note: note || null,
      } as any);

    if (feedbackError) {
      console.error("[Feedback] Error:", feedbackError);
      return { success: false, error: "Lỗi khi lưu phản hồi" };
    }

    console.log("[Feedback] Recorded:", diagnosisId, isCorrect);
    return { success: true };
  } catch (error) {
    console.error("[Feedback] Unexpected error:", error);
    return { success: false, error: "Lỗi không mong muốn" };
  }
}
