'use client';

import React, { useState } from 'react';
import { 
  History, 
  CloudRain, 
  Thermometer, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  RefreshCw,
  WifiOff,
  BarChart3
} from 'lucide-react';
import { HistoricalAnomalyReport } from '../lib/types';
import { useLanguage } from '../hooks/useLanguage';

interface TodayVsNormalCardProps {
  anomalyReport?: HistoricalAnomalyReport | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  cityName?: string;
}

export const TodayVsNormalCard: React.FC<TodayVsNormalCardProps> = ({
  anomalyReport,
  isLoading = false,
  onRefresh,
  cityName = 'Pune',
}) => {
  const { language } = useLanguage();
  const [selectedMetric, setSelectedMetric] = useState<'rainfall' | 'temperature'>('rainfall');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading && !anomalyReport) {
    return (
      <div className="w-full rounded-3xl bg-[#090D14] border border-slate-800/80 p-6 sm:p-8 text-white shadow-2xl animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-800 rounded-lg"></div>
            <div className="h-3 w-72 bg-slate-850 rounded"></div>
          </div>
          <div className="h-7 w-24 bg-slate-800 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          <div className="h-28 bg-slate-900/60 rounded-2xl"></div>
          <div className="h-28 bg-slate-900/60 rounded-2xl"></div>
        </div>
        <div className="h-48 bg-slate-900/40 rounded-2xl"></div>
      </div>
    );
  }

  if (!anomalyReport) {
    return (
      <div className="w-full rounded-3xl bg-[#090D14] border border-slate-800/80 p-6 text-white text-center space-y-3">
        <History className="w-8 h-8 text-slate-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-300">Historical Telemetry Baseline Initializing</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Synchronizing 10-year historical climate reanalysis for {cityName}...
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition"
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  const rain = anomalyReport.rainfall;
  const temp = anomalyReport.temperature;
  const isRainSelected = selectedMetric === 'rainfall';
  const activeTrend = isRainSelected ? anomalyReport.rainfall_trend : anomalyReport.temperature_trend;
  const activeParam = isRainSelected ? rain : temp;

  // Badge configuration based on anomaly category
  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'UNUSUAL':
        return 'bg-[#7c2d12] text-[#fdba74] border border-[#ea580c]/60 shadow-lg shadow-orange-950/40';
      case 'ABOVE_NORMAL':
        return 'bg-amber-950/70 text-amber-300 border border-amber-600/50';
      case 'BELOW_NORMAL':
        return 'bg-sky-950/70 text-sky-300 border border-sky-600/50';
      default:
        return 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/50';
    }
  };

  // SVG Geometry for 30-Day Trend Chart
  const svgWidth = 800;
  const svgHeight = 220;
  const padX = 40;
  const padTop = 20;
  const padBottom = 35;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padTop - padBottom;

  // Value ceiling and floor for scaling
  const allCurrent = activeTrend.map((p) => p.current_val);
  const allHistoricalAvg = activeTrend.map((p) => p.historical_avg);
  const allUpper = activeTrend.map((p) => p.historical_upper);
  const allLower = activeTrend.map((p) => p.historical_lower);

  const rawMax = Math.max(...allCurrent, ...allHistoricalAvg, ...allUpper, 1);
  const rawMin = isRainSelected ? 0 : Math.min(...allCurrent, ...allHistoricalAvg, ...allLower, 10);

  const maxVal = isRainSelected ? Math.max(10, Math.ceil(rawMax * 1.2)) : Math.ceil(rawMax + 3);
  const minVal = isRainSelected ? 0 : Math.floor(rawMin - 3);
  const range = maxVal - minVal || 1;

  const points = activeTrend.map((p, i) => {
    const x = padX + (i / (activeTrend.length - 1 || 1)) * chartW;
    const yCur = padTop + chartH - ((p.current_val - minVal) / range) * chartH;
    const yAvg = padTop + chartH - ((p.historical_avg - minVal) / range) * chartH;
    const yLower = padTop + chartH - ((p.historical_lower - minVal) / range) * chartH;
    const yUpper = padTop + chartH - ((p.historical_upper - minVal) / range) * chartH;
    return { ...p, x, yCur, yAvg, yLower, yUpper };
  });

  // Current year line (solid blue)
  const currentPathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.yCur}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (p.x - prev.x) / 2;
    const cpy1 = prev.yCur;
    const cpx2 = prev.x + (p.x - prev.x) / 2;
    const cpy2 = p.yCur;
    return `${acc} C ${cpx1},${cpy1} ${cpx2},${cpy2} ${p.x},${p.yCur}`;
  }, '');

  // Historical average line (dashed green)
  const avgPathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.yAvg}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (p.x - prev.x) / 2;
    const cpy1 = prev.yAvg;
    const cpx2 = prev.x + (p.x - prev.x) / 2;
    const cpy2 = p.yAvg;
    return `${acc} C ${cpx1},${cpy1} ${cpx2},${cpy2} ${p.x},${p.yAvg}`;
  }, '');

  // Historical normal range band (shaded polygon between upper and lower)
  const upperPoints = points.map((p) => `${p.x},${p.yUpper}`).join(' ');
  const lowerPointsReversed = [...points].reverse().map((p) => `${p.x},${p.yLower}`).join(' ');
  const bandPolygonPoints = `${upperPoints} ${lowerPointsReversed}`;

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="w-full rounded-3xl bg-[#070A0F] border border-slate-800/90 p-5 sm:p-7 text-white shadow-2xl relative overflow-hidden transition-all duration-300">
      
      {/* Subtle Background Glow Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Today vs Normal
            </h3>
            {anomalyReport.is_cached && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                Cached Telemetry
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span>{anomalyReport.location.name}</span>
            <span>•</span>
            <span>{anomalyReport.target_date}</span>
            <span>•</span>
            <span className="text-slate-400">
              10-Year Climatological Baseline ({anomalyReport.comparison_window.start_year}–{anomalyReport.comparison_window.end_year}, ±7 Days)
            </span>
          </p>
        </div>

        {/* Anomaly Category Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-4 py-1.5 rounded-2xl text-xs font-bold uppercase tracking-wider ${getBadgeStyle(anomalyReport.overall_status)}`}>
            {anomalyReport.overall_status_label}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh Historical Climate Telemetry"
              className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ── SUMMARY TILES: RAINFALL & TEMPERATURE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 pb-5">
        
        {/* Metric 1: Today's Rainfall */}
        <div 
          onClick={() => setSelectedMetric('rainfall')}
          className={`cursor-pointer rounded-2xl p-4 sm:p-5 transition border ${
            isRainSelected 
              ? 'bg-slate-900/90 border-teal-500/50 shadow-md shadow-teal-950/20 ring-1 ring-teal-500/30' 
              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-sky-400" />
              Today&apos;s rainfall
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              rain.category === 'UNUSUAL' ? 'bg-orange-950 text-orange-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {rain.category_label}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {rain.current_value} mm
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Historical average: <strong className="text-slate-200">{rain.historical_mean} mm</strong></span>
            <span className="font-mono text-[11px] text-slate-500">
              Z-score: {rain.z_score >= 0 ? `+${rain.z_score}` : rain.z_score}
            </span>
          </div>
        </div>

        {/* Metric 2: Today's Temperature */}
        <div 
          onClick={() => setSelectedMetric('temperature')}
          className={`cursor-pointer rounded-2xl p-4 sm:p-5 transition border ${
            !isRainSelected 
              ? 'bg-slate-900/90 border-teal-500/50 shadow-md shadow-teal-950/20 ring-1 ring-teal-500/30' 
              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-400" />
              Today&apos;s temperature
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              temp.category === 'UNUSUAL' ? 'bg-orange-950 text-orange-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {temp.category_label}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {temp.current_value} °C
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Historical average: <strong className="text-slate-200">{temp.historical_mean} °C</strong></span>
            <span className="font-mono text-[11px] text-slate-500">
              Z-score: {temp.z_score >= 0 ? `+${temp.z_score}` : temp.z_score}
            </span>
          </div>
        </div>

      </div>

      {/* ── EXPANDABLE TREND CHART & STATISTICAL TELEMETRY ── */}
      {isExpanded && (
        <div className="pt-2 pb-3 space-y-4 animate-in fade-in duration-200">
          
          {/* Chart Header & Metric Switcher Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{isRainSelected ? 'Historical rainfall trend' : 'Historical temperature trend'}</span>
              <span className="text-xs font-normal text-slate-400">
                (Past 30 Days vs 10-Year Normal Range)
              </span>
            </h4>

            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedMetric('rainfall')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  isRainSelected 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Rainfall (mm)</span>
              </button>

              <button
                onClick={() => setSelectedMetric('temperature')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  !isRainSelected 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>Temperature (°C)</span>
              </button>
            </div>
          </div>

          {/* SVG Trend Chart Canvas */}
          <div className="relative w-full overflow-x-auto bg-[#04060A] rounded-2xl border border-slate-850 p-2 sm:p-4">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-auto min-w-[580px] select-none"
            >
              <defs>
                {/* Green Shaded Normal Band Gradient */}
                <linearGradient id="normalBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                </linearGradient>

                {/* Glowing Blue Current Line Gradient */}
                <linearGradient id="currentLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = padTop + chartH * ratio;
                const valLabel = Math.round(maxVal - ratio * range);
                return (
                  <g key={idx}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={svgWidth - padX}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-slate-500 font-mono"
                    >
                      {valLabel}{isRainSelected ? 'mm' : '°'}
                    </text>
                  </g>
                );
              })}

              {/* 1. Shaded Historical Normal Range Band */}
              <polygon
                points={bandPolygonPoints}
                fill="url(#normalBandGrad)"
                stroke="#059669"
                strokeWidth="0.75"
                strokeOpacity="0.3"
              />

              {/* 2. Historical Average Dashed Line */}
              <path
                d={avgPathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />

              {/* 3. Current Year Solid Line */}
              <path
                d={currentPathD}
                fill="none"
                stroke="url(#currentLineGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Clean X-Axis Baseline */}
              <line
                x1={padX}
                y1={padTop + chartH}
                x2={svgWidth - padX}
                y2={padTop + chartH}
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* Data Interactive Nodes & X-Axis Labels */}
              {points.map((p, i) => {
                const showLabel = i % 5 === 0 || i === points.length - 1;
                const isHovered = hoveredIndex === i;

                return (
                  <g 
                    key={i} 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Invisible Hitbox */}
                    <rect
                      x={p.x - 12}
                      y={padTop}
                      width="24"
                      height={chartH + padBottom}
                      fill="transparent"
                    />

                    {/* Point indicator on current line */}
                    <circle
                      cx={p.x}
                      cy={p.yCur}
                      r={isHovered ? 6 : i === points.length - 1 ? 4.5 : 2.5}
                      fill={isHovered ? '#38bdf8' : '#2563eb'}
                      stroke="#070A0F"
                      strokeWidth={isHovered ? 2 : 1}
                    />

                    {/* Date Tick Marks & Labels */}
                    {showLabel && (
                      <g>
                        <line
                          x1={p.x}
                          y1={padTop + chartH}
                          x2={p.x}
                          y2={padTop + chartH + 5}
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                        <text
                          x={p.x}
                          y={padTop + chartH + 18}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-400 font-mono select-none"
                        >
                          {p.day_label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Active Hover Crosshair Line */}
              {activePoint && (
                <g className="pointer-events-none">
                  <line
                    x1={activePoint.x}
                    y1={padTop}
                    x2={activePoint.x}
                    y2={padTop + chartH}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yCur}
                    r={7}
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yAvg}
                    r={5}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <div
                className="absolute top-4 pointer-events-none transform -translate-x-1/2 bg-slate-900/95 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl z-20 backdrop-blur-md text-xs space-y-1"
                style={{
                  left: `${(activePoint.x / svgWidth) * 100}%`,
                }}
              >
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                  {activePoint.date}
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sky-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    Current Year:
                  </span>
                  <span className="font-bold font-mono text-white">
                    {activePoint.current_val} {isRainSelected ? 'mm' : '°C'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Historical Avg:
                  </span>
                  <span className="font-mono text-slate-300">
                    {activePoint.historical_avg} {isRainSelected ? 'mm' : '°C'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                  Normal Range: {activePoint.historical_lower} – {activePoint.historical_upper} {isRainSelected ? 'mm' : '°C'}
                </div>
              </div>
            )}
          </div>

          {/* ── LEGEND BAR & CHEVRON COLLAPSE TOGGLE ── */}
          <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-400">
            {/* Legend Left */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
              <span className="font-medium text-slate-300">Current year</span>
            </div>

            {/* Chevron Toggle Button in Center (As shown in reference image) */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition shadow-xs"
              title={isExpanded ? 'Collapse Trend Details' : 'Expand Trend Details'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Legend Right */}
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#10b981]"></span>
              <span className="font-medium text-slate-300">Historical average</span>
            </div>
          </div>

          {/* ── ANOMALY EXPLANATION & STATISTICAL INSIGHTS ── */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Anomaly Explanation</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              &quot;{activeParam.explanation}&quot;
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span>Empirical Percentile: <strong className="text-white">{activeParam.historical_percentile}th %</strong></span>
                <span>•</span>
                <span>Z-Score: <strong className="text-white">{activeParam.z_score >= 0 ? `+${activeParam.z_score}` : activeParam.z_score}</strong></span>
                <span>•</span>
                <span>Baseline Samples: <strong className="text-white">{activeParam.sample_count}</strong></span>
              </div>
              <span className="text-slate-500 font-mono">
                Source: {anomalyReport.data_source}
              </span>
            </div>
          </div>

          {/* Cautious Scientific Disclaimer Notice */}
          <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-850 text-[11px] text-slate-400 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Statistical Anomaly Notice:</strong> This analysis measures mathematical deviation from verified 10-year climate reanalysis records. Weather anomalies indicate unusual conditions relative to local historical norms and do not independently constitute a disaster declaration.
            </span>
          </div>

        </div>
      )}

      {/* If Collapsed, show compact expand bar */}
      {!isExpanded && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 text-xs font-medium transition"
          >
            <span>Show 30-Day Climate Trend & Explanations</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
