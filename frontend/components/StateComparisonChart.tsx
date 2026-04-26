"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { VariableChange } from "@/types";

interface Props {
  changes: VariableChange[];
  height?: number;
}

export default function StateComparisonChart({ changes, height = 300 }: Props) {
  if (!changes || changes.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No variable changes to display
      </div>
    );
  }

  const data = changes.map((c) => ({
    name: c.variable_name.length > 18 ? c.variable_name.slice(0, 16) + "…" : c.variable_name,
    "Before (norm)": +c.initial_normalized.toFixed(1),
    "After (norm)": +c.final_normalized.toFixed(1),
    domain: c.domain_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#64748b", fontSize: 10 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#64748b", fontSize: 11 }}
          label={{ value: "Normalized (0–100)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Legend
          wrapperStyle={{ color: "#94a3b8", fontSize: 12, paddingTop: 8 }}
          verticalAlign="top"
        />
        <Bar dataKey="Before (norm)" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.8} />
        <Bar dataKey="After (norm)" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.9} />
      </BarChart>
    </ResponsiveContainer>
  );
}
