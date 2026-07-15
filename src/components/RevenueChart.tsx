"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#22262D" vertical={false} />
        <XAxis dataKey="label" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={{ background: "#181B20", border: "1px solid #22262D", borderRadius: 3, fontSize: 12 }}
          labelStyle={{ color: "#D1D5DB" }}
          formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#E8A33D" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
