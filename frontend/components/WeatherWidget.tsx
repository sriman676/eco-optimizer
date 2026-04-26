"use client";

import { useState } from "react";
import { Cloud, Wind, Droplets, Thermometer, RefreshCw } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function WeatherWidget() {
  const { weather, weatherCity, fetchWeather } = useStore();
  const [input, setInput] = useState(weatherCity);

  const handleFetch = () => fetchWeather(input.trim() || "London");

  return (
    <div className="bg-slate-800/95 border border-slate-600/70 rounded-xl p-4 min-w-[240px]">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="w-4 h-4 text-blue-400" />
        <span className="text-base font-semibold text-slate-100">Weather Context</span>
        {weather && !weather.is_simulated && (
          <span className="text-xs bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
            Live API
          </span>
        )}
        {weather?.is_simulated && (
          <span className="text-xs bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded">
            Simulated
          </span>
        )}
        {weather?.cached && (
          <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
            Cached
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          placeholder="City name"
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
        />
        <button
          onClick={handleFetch}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          title="Refresh weather"
        >
          <RefreshCw className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {weather ? (
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-white">{weather.city}</p>
          <p className="text-sm text-slate-300 italic">{weather.conditions}</p>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <Stat icon={<Thermometer className="w-3 h-3 text-orange-400" />} label={`${weather.temperature}°C`} />
            <Stat icon={<Droplets className="w-3 h-3 text-blue-400" />} label={`${weather.humidity}% RH`} />
            <Stat icon={<Cloud className="w-3 h-3 text-sky-400" />} label={`${weather.precipitation}mm`} />
            <Stat icon={<Wind className="w-3 h-3 text-teal-400" />} label={`${weather.wind_speed} m/s`} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Enter a city and press Enter</p>
      )}
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2 py-1">
      {icon}
      <span className="text-sm text-slate-200">{label}</span>
    </div>
  );
}
