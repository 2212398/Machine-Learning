"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { ActivityPoint } from "@/types/dashboard";

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <XAxis axisLine={false} dataKey="date" tickLine={false} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(45,106,79,0.08)" }} />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
