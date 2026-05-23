"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getDiagnoses } from "@/lib/actions/dashboard";
import type { DiagnosisFilters, DiagnosisPageResult } from "@/types/dashboard";

export function useDiagnosisHistory(filters: DiagnosisFilters, initialData?: DiagnosisPageResult) {
  return useInfiniteQuery({
    queryKey: ["diagnoses", filters],
    queryFn: ({ pageParam }) => getDiagnoses(pageParam, 10, filters),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialData
      ? {
          pages: [initialData],
          pageParams: [null],
        }
      : undefined,
    initialPageParam: null as string | null,
  });
}
