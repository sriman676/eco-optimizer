"use client";

import { useMemo } from "react";

interface Props {
  value: number;        // 0–100
  size?: number;
  label?: string;
  subtitle?: string;
}

export default function NCVGauge({ value, size = 140, label = "Risk Score", subtitle }: Props) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;

  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);

  const color = useMemo(() => {
    if (clamped <= 20) return "#22c55e";   // green – safe
    if (clamped <= 50) return "#eab308";   // yellow – moderate
    if (clamped <= 75) return "#f97316";   // orange – high
    return "#ef4444";                       // red – critical
  }, [clamped]);

  const status = useMemo(() => {
    if (clamped <= 20) return "Safe";
    if (clamped <= 50) return "Watch";
    if (clamped <= 75) return "Needs attention";
    return "Urgent";
  }, [clamped]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={10}
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-white" style={{ color }}>
          {clamped.toFixed(1)}
        </span>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xs font-semibold mt-0.5" style={{ color }}>
          {status}
        </span>
      </div>
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
