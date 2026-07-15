"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS: Record<string, string> = {
  TODO: "#6B7280",
  IN_PROGRESS: "#E8A33D",
  REVIEW: "#FBBF24",
  DONE: "#4ADE80",
};

export default function TaskStatusChart({ data }: { data: { status: string; count: number }[] }) {
  const chartData = data.filter((d) => d.count > 0);

  if (chartData.length === 0) {
    return <div className="h-60 flex items-center justify-center text-base-500 text-sm">No tasks yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {chartData.map((d) => (
            <Cell key={d.status} fill={COLORS[d.status] ?? "#6B7280"} stroke="#0A0B0D" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#181B20", border: "1px solid #22262D", borderRadius: 3, fontSize: 12 }}
          labelStyle={{ color: "#D1D5DB" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
