'use client';

import React from 'react';
import { 
  Droplets, 
  Wind, 
  Sun, 
  CloudRain, 
  Sunrise, 
  Sunset, 
  Sparkles, 
  ArrowRight, 
  Activity, 
  Leaf, 
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { WeatherResponse, IntelligenceSummary, UserContext } from '../lib/types';
import { getLocalizedWeatherCondition, formatDisplayDate } from '../lib/weatherConditions';
import { useLanguage } from '../hooks/useLanguage';
import { getPersonaConfig } from '../lib/personaConfig';

interface VayuSyncHeroCardProps {
  weather: WeatherResponse;
  intelligence?: IntelligenceSummary | null;
  context: UserContext;
  onOpenRoleDetail?: () => void;
  onOpenPersonalizeModal?: () => void;
}

export const VayuSyncHeroCard: React.FC<VayuSyncHeroCardProps> = ({
  weather,
  intelligence,
  context,
  onOpenRoleDetail,
  onOpenPersonalizeModal,
}) => {
  const { language, t } = useLanguage();
  const curr = weather.current;
  const loc = weather.location;
  const daily = weather.daily || [];
  const hourly = weather.hourly || [];

  // Active persona calculation
  const activeRole = context.interests?.[0] || 'running';
  const personaCfg = getPersonaConfig(activeRole);
  const PersonaIcon = personaCfg.icon;

  // Score calculation
  const score = intelligence?.mausam_score?.score || 82;
  const ratingText = intelligence?.mausam_score?.rating || 'Great conditions for outdoor activity!';

  // Today formatted date
  const todayFormatted = React.useMemo(() => {
    try {
      const d = curr.observation_time ? new Date(curr.observation_time) : new Date();
      return `Today, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Today';
    }
  }, [curr.observation_time]);

  // High / Low temp
  const highTemp = daily[0] ? Math.round(daily[0].temp_max) : Math.round(curr.temperature + 4);
  const lowTemp = daily[0] ? Math.round(daily[0].temp_min) : Math.round(curr.temperature - 5);

  // Circular gauge circumference
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Next 6 hours forecast slice
  const next6Hours = React.useMemo(() => {
    if (!hourly || hourly.length === 0) return [];
    return hourly.slice(0, 6).map((h, i) => {
      let timeLabel = `${i + 1}h`;
      try {
        const d = new Date(h.time);
        timeLabel = d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      } catch {
        // fallback
      }
      return {
        time: timeLabel,
        temp: Math.round(h.temperature),
        pop: h.precipitation_probability || 0,
        condition: h.condition_text || 'Clear',
      };
    });
  }, [hourly]);

  // AQI color and label
  const aqiValue = curr.aqi || 42;
  let aqiLabel = 'Good';
  let aqiBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300';
  if (aqiValue > 100) {
    aqiLabel = 'Moderate';
    aqiBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300';
  } else if (aqiValue > 200) {
    aqiLabel = 'Poor';
    aqiBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300';
  }

  // UV index evaluation
  const uvValue = curr.uv_index || 5;
  let uvLabel = 'Moderate';
  if (uvValue <= 2) uvLabel = 'Low';
  else if (uvValue >= 6 && uvValue <= 7) uvLabel = 'High';
  else if (uvValue >= 8) uvLabel = 'Very High';

  // Sunrise / Sunset times
  const sunriseTime = daily[0]?.sunrise ? daily[0].sunrise.slice(11, 16) + ' AM' : '6:12 AM';
  const sunsetTime = daily[0]?.sunset ? daily[0].sunset.slice(11, 16) + ' PM' : '6:48 PM';

  return (
    <div className="w-full space-y-5">
      
      {/* ── 1. PRIMARY WEATHER HERO CARD (Screen 1 Design) ───────────────── */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_25px_-4px_rgba(16,42,67,0.06)] p-6 sm:p-7 relative overflow-hidden transition">
        
        {/* Soft Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-sky-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top: Date & High/Low Sun Badge */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              {todayFormatted}
            </span>
          </div>

          {/* High / Low badge with sun icon */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-xs">
            <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>H {highTemp}°</span>
            <span className="text-amber-300 dark:text-amber-600">|</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">L {lowTemp}°</span>
          </div>
        </div>

        {/* Temperature & Condition */}
        <div className="mt-3 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <div className="text-5xl sm:text-7xl font-black text-[#0B1F33] dark:text-white tracking-tight">
              {Math.round(curr.temperature)}°C
            </div>
            <div className="mt-1 space-y-0.5">
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                {getLocalizedWeatherCondition(curr.condition_text, language)}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Feels like {Math.round(curr.feels_like)}°C
              </p>
            </div>
          </div>

          {/* Weather Visual Graphic */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 opacity-90 blur-sm absolute" />
            <Sun className="w-14 h-14 sm:w-16 sm:h-16 text-amber-500 relative z-10 drop-shadow-md" />
          </div>
        </div>

        {/* Bottom Key Metrics Row inside Card */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 sm:gap-4 items-center text-center">
          
          {/* Humidity */}
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-500" /> Humidity
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white mt-0.5">
              {curr.humidity}%
            </span>
          </div>

          {/* Wind */}
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium flex items-center gap-1">
              <Wind className="w-3 h-3 text-teal-500" /> Wind
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white mt-0.5">
              {curr.wind_speed} km/h
            </span>
          </div>

          {/* AQI Pill */}
          <div className={`flex flex-col items-center justify-center p-2 rounded-2xl border ${aqiBadgeBg}`}>
            <span className="text-[10px] sm:text-xs font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              AQI {aqiValue}
            </span>
            <span className="text-xs sm:text-sm font-black mt-0.5">
              {aqiLabel}
            </span>
          </div>

        </div>

      </div>

      {/* ── 2. YOUR ROLE SCORE CARD (Screen 1 & Screen 3 Design) ─────────── */}
      <div 
        onClick={onOpenRoleDetail}
        className="cursor-pointer group rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_25px_-4px_rgba(15,184,141,0.08)] p-5 sm:p-6 transition hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-800"
      >
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Persona Icon + Title & Verdict */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F8F3] dark:bg-teal-950/60 text-[#0FB88D] border border-teal-200/80 dark:border-teal-800 flex items-center justify-center shrink-0 shadow-xs">
              <PersonaIcon className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#0B1F33] dark:text-white tracking-tight truncate">
                  Your {personaCfg.shortTitle} Score
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {ratingText}
              </p>
            </div>
          </div>

          {/* Right: Circular Score Progress Ring + Chevron */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="5"
                  fill="transparent"
                  className="dark:stroke-slate-800"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#0FB88D"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-[#0B1F33] dark:text-white leading-none">
                  {score}
                </span>
                <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                  /100
                </span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#0FB88D] group-hover:translate-x-0.5 transition">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. TODAY'S HIGHLIGHTS (Screen 1 Design) ──────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-sm sm:text-base font-black text-[#0B1F33] dark:text-white tracking-tight">
          Today's Highlights
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* UV */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mb-2">
              <Sun className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">UV</span>
            <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{uvValue}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{uvLabel}</span>
          </div>

          {/* Rain */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center mb-2">
              <CloudRain className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Rain</span>
            <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {curr.precipitation_probability || 0}%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              ({curr.precipitation || 0} mm)
            </span>
          </div>

          {/* Sunrise */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-500 flex items-center justify-center mb-2">
              <Sunrise className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Sunrise</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">{sunriseTime}</span>
          </div>

          {/* Sunset */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-2">
              <Sunset className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Sunset</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">{sunsetTime}</span>
          </div>

        </div>
      </div>

      {/* ── 4. NEXT 6 HOURS HOURLY FORECAST STRIP (Screen 3 Design) ──────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm sm:text-base font-black text-[#0B1F33] dark:text-white tracking-tight">
            Next 6 Hours
          </h4>
          <span className="text-xs font-semibold text-[#0FB88D]">
            Hourly Forecast
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-800">
          {next6Hours.map((h, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center px-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">{h.time}</span>
              <div className="my-2 text-amber-500">
                {h.pop > 30 ? (
                  <CloudRain className="w-5 h-5 text-sky-500 mx-auto" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500 mx-auto" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                {h.temp}°
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. BEST TIME CALLOUT BANNER (Screen 3 Design) ────────────────── */}
      <div className="p-4 rounded-2xl bg-[#E6F8F3] dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 flex items-center justify-between gap-3 text-xs sm:text-sm text-teal-900 dark:text-teal-200 shadow-xs">
        <div className="flex items-center gap-2.5 font-medium">
          <div className="w-7 h-7 rounded-xl bg-[#0FB88D] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <strong className="font-extrabold text-[#0B1F33] dark:text-white">
              Best time for {personaCfg.shortTitle.toLowerCase()}:
            </strong>{' '}
            <span>6 AM – 9 AM (Lower UV & AQI)</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
      </div>

    </div>
  );
};
