"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface Props {
  history: number[];
  height?: number;
  emptyClass?: string;
}

export default function NCVChart({ history, height = 250, emptyClass = "min-h-[250px]" }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className={`flex items-center justify-center text-slate-500 text-sm ${emptyClass}`}>
        No plan history yet
      </div>
    );
  }

  const data = history.map((ncv, i) => ({ step: i, ncv: +ncv.toFixed(2) }));
  const initial = data[0].ncv;
  const final = data[data.length - 1].ncv;
  const reduction = initial - final;

  return (
    <div>
      <div className="flex gap-6 mb-4 text-sm">
        <Stat label="Starting Risk Score" value={initial.toFixed(1)} color="text-red-400" />
        <Stat label="Final Risk Score" value={final.toFixed(1)} color="text-green-400" />
        <Stat label="Risk Reduced" value={`−${reduction.toFixed(1)}`} color="text-brand-400" />
        <Stat label="Steps" value={String(data.length - 1)} color="text-slate-300" />
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="ncvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="step"
            tick={{ fill: "#64748b", fontSize: 11 }}
            label={{ value: "Step", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            domain={[0, Math.ceil(initial * 1.1)]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            label={{ value: "Risk Score", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#22c55e" }}
            formatter={(v) => [typeof v === "number" ? v.toFixed(2) : String(v ?? ""), "Risk Score"]}
            labelFormatter={(l) => `Step ${l}`}
          />
          <ReferenceLine y={0} stroke="#22c55e" strokeDasharray="4 4" opacity={0.4} />
          <Area
            type="monotone"
            dataKey="ncv"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#ncvGrad)"
            dot={history.length < 20 ? { r: 3, fill: "#22c55e", strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: "#22c55e" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}
