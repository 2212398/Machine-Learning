"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { ActivityPoint } from "@/types/dashboard";

function formatDate(dateLabel: string): string {
  const [day, month] = dateLabel.split(/[/-]/).map((part) => Number(part));
  if (!day || !month) {
    return dateLabel;
  }

  const date = new Date(new Date().getFullYear(), month - 1, day);
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "Hôm nay";
  }

  if (diffDays === 1) {
    return "Hôm qua";
  }

  return days[date.getDay()];
}

function CustomTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number }>;
}) {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#1e2235] p-2 text-sm shadow-lg">
        <p className="text-white/60">{label}</p>
        <p className="font-semibold text-primary-light">{payload[0].value ?? 0} lần chẩn đoán</p>
      </div>
    );
  }

  return null;
}

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const hasData = data?.some((point) => point.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-neutral-500">
        <span className="text-3xl" aria-hidden="true">📊</span>
        <span className="text-sm">Chưa có dữ liệu chẩn đoán</span>
      </div>
    );
  }

  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <XAxis axisLine={false} dataKey="date" tickFormatter={formatDate} tickLine={false} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(45,106,79,0.08)" }} />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
