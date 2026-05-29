"use client";

import { AlertCircle, Camera, ClipboardList, Leaf, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HistoryItem } from "@/components/dashboard/HistoryItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DiagnosisHistoryItem } from "@/types/dashboard";

type Filter = "all" | "healthy" | "diseased";

function isHealthy(item: DiagnosisHistoryItem) {
  return item.severity === "healthy";
}

export function SimpleHistoryList({ items }: { items: DiagnosisHistoryItem[] }) {
  const [rows, setRows] = useState(items);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setRows(items);
  }, [items]);

  const filtered = useMemo(() => {
    return rows.filter((item) => {
      const keyword = search.trim().toLowerCase();
      const searchable = `${item.plantName} ${item.diseaseName} ${item.note ?? ""}`.toLowerCase();
      const matchesSearch = searchable.includes(keyword);
      const matchesFilter =
        filter === "all" ||
        (filter === "healthy" && isHealthy(item)) ||
        (filter === "diseased" && !isHealthy(item));

      return matchesSearch && matchesFilter;
    });
  }, [filter, rows, search]);

  const stats = useMemo(() => {
    const healthy = rows.filter(isHealthy).length;
    return {
      all: rows.length,
      healthy,
      diseased: rows.length - healthy,
    };
  }, [rows]);

  const visible = filtered.slice(0, visibleCount);
  const filterOptions: Array<{ id: Filter; label: string; count: number; icon: typeof ClipboardList }> = [
    { id: "all", label: "Tất cả", count: stats.all, icon: ClipboardList },
    { id: "healthy", label: "Khỏe mạnh", count: stats.healthy, icon: Leaf },
    { id: "diseased", label: "Có bệnh", count: stats.diseased, icon: AlertCircle },
  ];

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-primary/25 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-pale text-primary">
          <ClipboardList className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">Chưa có kết quả nào</h2>
        <p className="mx-auto mt-2 max-w-md text-base leading-7 text-neutral-600">
          Hãy thực hiện chẩn đoán đầu tiên để bắt đầu lưu lịch sử và theo dõi tình trạng cây theo thời gian.
        </p>
        <Button className="mt-5 min-h-[52px] w-full sm:w-auto" href="/dashboard/diagnosis" icon={<Camera className="h-5 w-5" />}>
          Chẩn đoán ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-neutral-100 bg-white p-2 shadow-sm sm:grid-cols-3">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const active = filter === option.id;

          return (
          <button
            aria-pressed={active}
            className={cn(
              "flex min-h-[52px] items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition",
              active ? "bg-primary text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-50",
            )}
            key={option.id}
            onClick={() => setFilter(option.id)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-sm font-bold">{option.label}</span>
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", active ? "bg-white/20" : "bg-primary-pale text-primary")}>
              {option.count}
            </span>
          </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
        <Input
          className="pl-12"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo tên cây, bệnh hoặc ghi chú..."
          value={search}
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-neutral-600 shadow-sm">
          <Search className="mx-auto h-8 w-8 text-neutral-400" />
          <p className="mt-3 font-semibold text-neutral-800">Không tìm thấy kết quả phù hợp.</p>
          <p className="mt-1 text-sm">Thử đổi từ khóa hoặc chọn lại bộ lọc.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {visible.map((item) => (
          <HistoryItem
            item={item}
            key={item.id}
            onDeleted={(id) => setRows((current) => current.filter((row) => row.id !== id))}
            onUpdated={(updated) =>
              setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)))
            }
          />
        ))}
      </div>

      {visibleCount < filtered.length ? (
        <Button className="min-h-[52px] w-full" onClick={() => setVisibleCount((count) => count + 10)} variant="outline">
          Xem thêm 10 kết quả
        </Button>
      ) : null}
    </div>
  );
}
