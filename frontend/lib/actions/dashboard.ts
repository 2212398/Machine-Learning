"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityPoint,
  DiagnosisFilters,
  DiagnosisHistoryItem,
  DiagnosisPageResult,
  DiagnosisSeverity,
  DiagnosisStats,
} from "@/types/dashboard";

type DiagnosisRow = {
  id: string;
  created_at: string;
  plant_label: string | null;
  disease_label: string | null;
  disease_confidence: number | null;
  image_url: string | null;
};

type PlantRow = { plant_label: string | null };
type ActivityRow = { created_at: string };

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function getDiagnosisSeverity(diseaseName: string, confidence: number): DiagnosisSeverity {
  const label = diseaseName.toLowerCase();

  if (!label || label.includes("unknown")) {
    return "unknown";
  }

  if (label.includes("healthy") || label.includes("normal")) {
    return "healthy";
  }

  return confidence >= 0.8 ? "severe" : "mild";
}

function mapDiagnosis(row: DiagnosisRow): DiagnosisHistoryItem {
  const diseaseName = row.disease_label || "Unknown disease";
  const confidence = row.disease_confidence ?? 0;

  return {
    id: row.id,
    createdAt: row.created_at,
    plantName: row.plant_label || "Unknown plant",
    diseaseName,
    severity: getDiagnosisSeverity(diseaseName, confidence),
    imageUrl: row.image_url || undefined,
    confidence,
  };
}

function modePlant(rows: PlantRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    if (row.plant_label) {
      counts.set(row.plant_label, (counts.get(row.plant_label) ?? 0) + 1);
    }
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No data";
}

function lastSevenDays(rows: ActivityRow[]): ActivityPoint[] {
  const formatter = new Intl.DateTimeFormat("en", { month: "2-digit", day: "2-digit" });
  const points = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toISOString().slice(0, 10), date: formatter.format(date), count: 0 };
  });
  const counts = new Map(points.map((point) => [point.key, point]));

  rows.forEach((row) => {
    const point = counts.get(new Date(row.created_at).toISOString().slice(0, 10));
    if (point) {
      point.count += 1;
    }
  });

  return points.map(({ date, count }) => ({ date, count }));
}

export async function getDiagnoses(
  cursor: string | null = null,
  limit = 10,
  filters: DiagnosisFilters = {},
): Promise<DiagnosisPageResult> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  let query = supabase
    .from("diagnoses")
    .select("id, created_at, plant_label, disease_label, disease_confidence, image_url")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (filters.plant && filters.plant !== "all") {
    query = query.eq("plant_label", filters.plant);
  }

  if (filters.timeRange && filters.timeRange !== "all") {
    query = query.gte("created_at", daysAgo(Number(filters.timeRange)));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Dashboard] getDiagnoses error:", error);
    return { items: [], nextCursor: null, hasMore: false };
  }

  const rows = ((data as DiagnosisRow[] | null) ?? []).slice(0, limit);
  const hasMore = ((data as DiagnosisRow[] | null) ?? []).length > limit;

  return {
    items: rows.map(mapDiagnosis),
    nextCursor: rows.at(-1)?.created_at ?? null,
    hasMore,
  };
}

export async function getDiagnosisStats(): Promise<DiagnosisStats> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { total: 0, thisWeek: 0, topPlant: "No data", feedbackRate: "No data", activity: [] };
  }

  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);
  const [
    totalResult,
    weekResult,
    popularResult,
    feedbackResult,
    correctFeedbackResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("diagnoses").select("*", { count: "exact", head: true }).eq("user_id", authData.user.id),
    supabase.from("diagnoses").select("*", { count: "exact", head: true }).eq("user_id", authData.user.id).gte("created_at", weekStart),
    supabase.from("diagnoses").select("plant_label").eq("user_id", authData.user.id).gte("created_at", monthStart),
    supabase.from("feedbacks").select("*", { count: "exact", head: true }).eq("user_id", authData.user.id),
    supabase.from("feedbacks").select("*", { count: "exact", head: true }).eq("user_id", authData.user.id).eq("is_correct", true),
    supabase.from("diagnoses").select("created_at").eq("user_id", authData.user.id).gte("created_at", weekStart),
  ]);

  const feedbackTotal = feedbackResult.count ?? 0;
  const feedbackCorrect = correctFeedbackResult.count ?? 0;

  return {
    total: totalResult.count ?? 0,
    thisWeek: weekResult.count ?? 0,
    topPlant: modePlant((popularResult.data as PlantRow[] | null) ?? []),
    feedbackRate: feedbackTotal > 0 ? `${Math.round((feedbackCorrect / feedbackTotal) * 100)}%` : "No data",
    activity: lastSevenDays((activityResult.data as ActivityRow[] | null) ?? []),
  };
}
