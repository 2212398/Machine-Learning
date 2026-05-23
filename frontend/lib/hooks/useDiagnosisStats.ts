"use client";

import { useQuery } from "@tanstack/react-query";
import { getDiagnosisStats } from "@/lib/actions/dashboard";

export function useDiagnosisStats() {
  return useQuery({
    queryKey: ["diagnosis-stats"],
    queryFn: getDiagnosisStats,
    staleTime: 5 * 60 * 1000,
  });
}
