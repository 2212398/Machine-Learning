"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ScanHistoryRow = Database["public"]["Tables"]["scan_history"]["Row"];
export type ScanHistoryInput = Pick<
  Database["public"]["Tables"]["scan_history"]["Insert"],
  "image_url" | "plant_label" | "disease_label" | "confidence" | "status" | "note"
>;
export type ScanHistoryUpdate = Partial<ScanHistoryInput>;

function assertDbOk(error: unknown) {
  if (error) {
    throw error;
  }
}

export async function getScanHistory() {
  const supabase = await createSupabaseServerClient();
  const table = supabase.from("scan_history");

  // RLS hides every row that does not belong to the signed-in user.
  const { data, error } = await table
    .select("*")
    .order("created_at", { ascending: false });

  assertDbOk(error);
  return (data ?? []) as ScanHistoryRow[];
}

export async function createScanHistory(input: ScanHistoryInput) {
  const supabase = await createSupabaseServerClient();
  const table = supabase.from("scan_history") as any;

  const { data, error } = await table
    .insert(input)
    .select()
    .single();

  assertDbOk(error);
  revalidatePath("/dashboard/scan-history");
  return data as ScanHistoryRow;
}

export async function updateScanHistory(id: string, input: ScanHistoryUpdate) {
  const supabase = await createSupabaseServerClient();
  const table = supabase.from("scan_history") as any;

  const { data, error } = await table
    .update(input)
    .eq("id", id)
    .select()
    .single();

  assertDbOk(error);
  revalidatePath("/dashboard/scan-history");
  return data as ScanHistoryRow;
}

export async function deleteScanHistory(id: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("scan_history").delete().eq("id", id);

  assertDbOk(error);
  revalidatePath("/dashboard/scan-history");
}
