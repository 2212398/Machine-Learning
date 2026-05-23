"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiagnosisHistoryItem } from "@/types/dashboard";

type Filter = "all" | "healthy" | "diseased";

function isHealthy(item: DiagnosisHistoryItem) {
  return item.severity === "healthy";
}

export function SimpleHistoryList({ items }: { items: DiagnosisHistoryItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.plantName.toLowerCase().includes(search.trim().toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "healthy" && isHealthy(item)) ||
        (filter === "diseased" && !isHealthy(item));

      return matchesSearch && matchesFilter;
    });
  }, [filter, items, search]);

  const visible = filtered.slice(0, visibleCount);

  if (items.length === 0) {
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
          <article className="flex gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm" key={item.id}>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-primary-pale">
              {item.imageUrl ? <img alt="" className="h-full w-full object-cover" src={item.imageUrl} /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-neutral-900">{item.plantName}</h3>
              <p className="truncate text-base text-neutral-700">{item.diseaseName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                <span>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                <Badge size="sm" variant={isHealthy(item) ? "healthy" : "severe"}>
                  {isHealthy(item) ? "Khỏe" : "Bệnh"}
                </Badge>
              </div>
            </div>
          </article>
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
