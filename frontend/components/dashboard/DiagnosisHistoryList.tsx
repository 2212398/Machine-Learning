"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiagnosisHistory } from "@/lib/hooks/useDiagnosisHistory";
import { vi } from "@/lib/vi";
import type { BadgeVariant } from "@/components/ui/badge";
import type { DiagnosisHistoryItem, DiagnosisSeverity } from "@/types/dashboard";

interface DiagnosisHistoryListProps {
  items: DiagnosisHistoryItem[];
  isLoading?: boolean;
  initialCursor?: string | null;
  initialHasMore?: boolean;
}

const severityLabel: Record<DiagnosisHistoryItem["severity"], { label: string; variant: BadgeVariant }> = {
  healthy: { label: "Khỏe mạnh", variant: "healthy" },
  mild: { label: "Bệnh nhẹ", variant: "mild" },
  severe: { label: "Bệnh nặng", variant: "severe" },
  unknown: { label: "Không rõ", variant: "unknown" },
};

const severityOptions: Array<{ value: DiagnosisSeverity; label: string }> = [
  { value: "healthy", label: "Khỏe" },
  { value: "mild", label: "Nhẹ" },
  { value: "severe", label: "Nặng" },
  { value: "unknown", label: "Không rõ" },
];

const timeOptions = [
  { value: "all", label: "Tất cả" },
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "3 tháng" },
];

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-neutral-100 bg-white p-3" key={index}>
          <div className="h-12 w-12 rounded-lg bg-neutral-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-neutral-100" />
            <div className="h-3 w-1/2 rounded bg-neutral-100" />
          </div>
          <div className="h-6 w-16 rounded-full bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function DiagnosisHistoryList({
  items,
  isLoading = false,
  initialCursor = null,
  initialHasMore = false,
}: DiagnosisHistoryListProps) {
  const [selectedSeverities, setSelectedSeverities] = useState<DiagnosisSeverity[]>([]);
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [selectedTime, setSelectedTime] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const queryFilters = useMemo(
    () => ({
      plant: selectedPlant,
      search: debouncedSearch,
      severities: selectedSeverities,
      timeRange: selectedTime as "all" | "7" | "30" | "90",
    }),
    [debouncedSearch, selectedPlant, selectedSeverities, selectedTime],
  );
  const initialPage = useMemo(
    () => ({ items, nextCursor: initialCursor, hasMore: initialHasMore }),
    [initialCursor, initialHasMore, items],
  );
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useDiagnosisHistory(queryFilters, initialPage);
  const rows = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const plantOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.plantName).filter(Boolean))).sort(),
    [rows],
  );

  const toggleSeverity = (severity: DiagnosisSeverity) => {
    setSelectedSeverities((current) =>
      current.includes(severity) ? current.filter((item) => item !== severity) : [...current, severity],
    );
  };

  const filterRows = useCallback(
    (source: DiagnosisHistoryItem[]) => {
      const now = Date.now();
      const timeLimit = selectedTime === "all" ? null : Number(selectedTime) * 24 * 60 * 60 * 1000;

      return source.filter((item) => {
        const matchesSeverity =
          selectedSeverities.length === 0 || selectedSeverities.includes(item.severity);
        const matchesPlant = selectedPlant === "all" || item.plantName === selectedPlant;
        const matchesTime =
          !timeLimit || now - new Date(item.createdAt).getTime() <= timeLimit;
        const searchable = `${item.plantName} ${item.diseaseName}`.toLowerCase();
        const matchesSearch = !debouncedSearch || searchable.includes(debouncedSearch);

        return matchesSeverity && matchesPlant && matchesTime && matchesSearch;
      });
    },
    [debouncedSearch, selectedPlant, selectedSeverities, selectedTime],
  );

  const filteredRows = useMemo(() => filterRows(rows), [filterRows, rows]);
  const hasActiveFilters =
    selectedSeverities.length > 0 || selectedPlant !== "all" || selectedTime !== "all" || debouncedSearch.length > 0;

  if (isLoading) {
    return <SkeletonRows />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">
        {vi.dashboard.noDiagnoses}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-100 bg-white p-4">
        <button
          className="flex min-h-[44px] w-full items-center justify-between text-sm font-semibold text-neutral-800 md:hidden"
          onClick={() => setFiltersOpen((open) => !open)}
          type="button"
        >
          Bộ lọc
          <span aria-hidden="true">{filtersOpen ? "^" : "v"}</span>
        </button>

        <div className={`${filtersOpen ? "mt-4 grid" : "hidden"} gap-3 md:grid md:grid-cols-[1.2fr_1fr_1fr] md:items-end`}>
          <div className="space-y-2">
            <label className="text-sm sm:text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor="history-search">
              Tìm kiếm
            </label>
            <Input
              id="history-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={vi.history.searchPlaceholder}
              value={search}
            />
          </div>

          <label className="space-y-2 text-sm">
            <span className="text-sm sm:text-xs font-semibold uppercase tracking-wide text-neutral-500">Loại cây</span>
            <select
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              onChange={(event) => setSelectedPlant(event.target.value)}
              value={selectedPlant}
            >
              <option value="all">Tất cả cây</option>
              {plantOptions.map((plant) => (
                <option key={plant} value={plant}>
                  {plant}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm sm:text-xs font-semibold uppercase tracking-wide text-neutral-500">Thời gian</legend>
            <div className="flex flex-wrap gap-2">
              {timeOptions.map((option) => (
                <label className="cursor-pointer text-sm" key={option.value}>
                  <input
                    checked={selectedTime === option.value}
                    className="sr-only"
                    name="history-time"
                    onChange={() => setSelectedTime(option.value)}
                    type="radio"
                  />
                  <span className={`rounded-full border px-3 py-1.5 ${selectedTime === option.value ? "bg-primary text-white" : "text-neutral-600"}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2 md:col-span-3">
            <legend className="text-sm sm:text-xs font-semibold uppercase tracking-wide text-neutral-500">Mức độ</legend>
            <div className="flex flex-wrap gap-2">
              <button
                className={`min-h-[44px] rounded-full border px-3 py-1.5 text-sm ${selectedSeverities.length === 0 ? "bg-primary text-white" : "text-neutral-600"}`}
                onClick={() => setSelectedSeverities([])}
                type="button"
              >
                Tất cả
              </button>
              {severityOptions.map((option) => (
                <button
                  className={`min-h-[44px] rounded-full border px-3 py-1.5 text-sm ${
                    selectedSeverities.includes(option.value) ? "bg-primary text-white" : "text-neutral-600"
                  }`}
                  key={option.value}
                  onClick={() => toggleSeverity(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
          Không tìm thấy kết quả phù hợp.
        </div>
      ) : null}

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-100 bg-white">
        {filteredRows.map((item) => {
          const severity = severityLabel[item.severity];
          const confidence = Math.round(item.confidence * 100);

          return (
            <article className="flex items-center gap-3 p-3 transition hover:bg-neutral-50" key={item.id}>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary-pale">
                {item.imageUrl ? (
                  <img alt="" className="h-full w-full object-cover" src={item.imageUrl} />
                ) : (
                  <div className="h-full w-full bg-primary-pale" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">{item.plantName}</p>
                <p className="truncate text-sm text-neutral-600">{item.diseaseName}</p>
              </div>
              <Badge size="sm" variant={severity.variant}>
                {severity.label}
              </Badge>
              <span className="w-12 text-right text-sm font-semibold text-primary">{confidence}%</span>
              <span aria-hidden="true" className="text-neutral-400">
                &gt;
              </span>
            </article>
          );
        })}
      </div>

      {hasNextPage && !hasActiveFilters ? (
        <div className="flex justify-center">
          <Button disabled={isFetchingNextPage} loading={isFetchingNextPage} onClick={() => fetchNextPage()} variant="outline">
                {vi.dashboard.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
