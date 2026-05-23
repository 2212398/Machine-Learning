export type DiagnosisSeverity = "healthy" | "mild" | "severe" | "unknown";

export interface DiagnosisHistoryItem {
  id: string;
  createdAt: string;
  plantName: string;
  diseaseName: string;
  severity: DiagnosisSeverity;
  imageUrl?: string;
  confidence: number;
}

export interface DiagnosisPageResult {
  items: DiagnosisHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface DiagnosisFilters {
  severities?: DiagnosisSeverity[];
  plant?: string;
  timeRange?: "all" | "7" | "30" | "90";
  search?: string;
}

export interface DiagnosisStats {
  total: number;
  thisWeek: number;
  topPlant: string;
  feedbackRate: string;
  activity: ActivityPoint[];
}
