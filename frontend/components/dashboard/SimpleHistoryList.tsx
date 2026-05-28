"use client";

import { useEffect, useMemo, useState } from "react";
import { HistoryItem } from "@/components/dashboard/HistoryItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const visible = filtered.slice(0, visibleCount);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">Chưa có kết quả nào</h2>
        <p className="mt-2 text-base text-neutral-600">Hãy thực hiện chẩn đoán đầu tiên!</p>
        <Button className="mt-5 min-h-[52px] w-full sm:w-auto" href="/dashboard/diagnosis">
          📷 Chẩn đoán ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex border-b border-neutral-200">
        {[
          { id: "all", label: "Tất cả" },
          { id: "healthy", label: "🌱 Khỏe mạnh" },
          { id: "diseased", label: "🔴 Có bệnh" },
        ].map((option) => (
          <button
            className={`min-h-[44px] flex-1 border-b-2 px-3 py-3 text-base font-semibold ${
              filter === option.id ? "border-primary text-primary" : "border-transparent text-neutral-500"
            }`}
            key={option.id}
            onClick={() => setFilter(option.id as Filter)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <Input
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm theo tên cây..."
        value={search}
      />

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-neutral-600">
          Không tìm thấy kết quả.
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
