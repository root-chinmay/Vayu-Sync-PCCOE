'use client';

import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  Eye, 
  Gauge, 
  Sunrise, 
  Sunset, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  CloudRain,
  MapPin
} from 'lucide-react';
import { WeatherResponse, EventPlanningIntelligence, VisibilityIntelligence, IntelligenceSummary, UserContext } from '../lib/types';
import { WeatherMap } from './WeatherMap';
import { DetailedUVGraph } from './DetailedUVGraph';
import { DetailedColorCodedGraphs } from './DetailedColorCodedGraphs';
import { VisibilityCard } from './VisibilityCard';
import { EventPlannerCard } from './EventPlannerCard';
import { VayuSyncHeroCard } from './VayuSyncHeroCard';
import { useLanguage } from '../hooks/useLanguage';
import { getLocalizedWeatherCondition, getLocalizedWeekday } from '../lib/weatherConditions';

interface StandardMausamProps {
  weather: WeatherResponse;
  intelligence?: IntelligenceSummary | null;
  context?: UserContext;
  eventIntel?: EventPlanningIntelligence | null;
  visibilityIntel?: VisibilityIntelligence | null;
  onSelectCity: (city: { name: string; state?: string; lat: number; lon: number; default_persona: string }) => void;
  onOpenPersonalizeModal: () => void;
  onEnablePersonalizedMode: () => void;
  activeSection: string;
}

export const StandardMausam: React.FC<StandardMausamProps> = ({
  weather,
  intelligence,
  context = { 
    name: 'Neyan', 
    is_personalized: false, 
    interests: ['running'], 
    priorities: ['rain', 'heat'], 
    preferred_transit: 'two_wheeler', 
    calendar_events: [] 
  },
  eventIntel,
  visibilityIntel,
  onSelectCity,
  onOpenPersonalizeModal,
  onEnablePersonalizedMode,
  activeSection,
}) => {
  const { t, locale, language } = useLanguage();
  const curr = weather.current;
  const loc = weather.location;
  const hourly = weather.hourly || [];
  const daily = weather.daily || [];
  const alerts = weather.alerts || [];

  const formattedLocalTime = React.useMemo(() => {
    try {
      const dateToFormat = curr.observation_time ? new Date(curr.observation_time) : new Date();
      return new Intl.DateTimeFormat(locale || 'en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: loc.timezone || 'Asia/Kolkata',
      }).format(dateToFormat);
    } catch {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }, [curr.observation_time, loc.timezone, locale]);

  return (
    <div className="w-full space-y-6">
      
      {/* 1. VayuSync Natural Invitation Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/70 to-white dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-sky-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shrink-0 mt-0.5 shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t.banner_invitation_tag}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs">
                {t.banner_invitation_badge}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#0B1F33] dark:text-white mt-0.5">
              {t.banner_invitation_title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {t.banner_invitation_desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenPersonalizeModal}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition"
          >
            {t.btn_customize}
          </button>
          <button
            onClick={onEnablePersonalizedMode}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition flex items-center gap-1.5"
          >
            <span>{t.banner_btn_enable}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Official Weather Warnings */}
      <div id="warnings" className="w-full scroll-mt-28">
        {alerts.length > 0 ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-slate-900 dark:text-slate-100 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-600 text-white">
                  Alert: {alerts[0].severity}
                </span>
                <span className="text-xs font-mono text-rose-700 dark:text-rose-400">{alerts[0].source}</span>
              </div>
              <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200 mt-1">{alerts[0].title}</h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">{alerts[0].description}</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{t.bulletin_title}:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{t.bulletin_no_warnings.replace('{city}', loc.name)}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{t.bulletin_normal}</span>
          </div>
        )}
      </div>

      {/* 2-Column Split: Left for Primary Overview & Forecasts, Right for Detailed Analytics Decks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: Overview, Hero Card, Hourly Rail & 7-Day Forecast */}
        <div className="space-y-6">
          {/* 3. VayuSync Primary Weather Hero, Role Score & Highlights (Screen 1 & 3 Design) */}
          <div id="overview" className="scroll-mt-28">
            <VayuSyncHeroCard
              weather={weather}
              intelligence={intelligence}
              context={context}
              onOpenRoleDetail={onEnablePersonalizedMode}
              onOpenPersonalizeModal={onOpenPersonalizeModal}
            />
          </div>

          {/* 8. Hourly Forecast Rail */}
          <div id="hourly" className="rounded-2xl glass-panel p-5 sm:p-6 space-y-4 shadow-sm border border-sky-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 scroll-mt-28">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t.forecast_24h_title}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.forecast_hourly_res}</span>
            </div>

            <div className="w-full overflow-x-auto pb-2">
              <div className="flex items-center gap-2 min-w-[500px]">
                {hourly.slice(0, 16).map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-[60px] p-2.5 rounded-xl text-center bg-white dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80 shadow-xs space-y-1"
                  >
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {h.time.split('T').pop()?.slice(0, 5) || `${h.hour}:00`}
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {Math.round(h.temperature)}°
                    </p>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${h.precipitation_probability > 40 ? 'bg-sky-500 dark:bg-sky-400' : 'bg-slate-300 dark:bg-slate-600'}`}
                        style={{ width: `${h.precipitation_probability}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                      {h.precipitation_probability}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 9. 7-Day Weather Outlook */}
          <div id="daily" className="rounded-2xl glass-panel p-5 sm:p-6 space-y-4 shadow-sm border border-sky-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 scroll-mt-28">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {t.forecast_7d_title}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {daily.map((d, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{getLocalizedWeekday(d.day_name, language)}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{getLocalizedWeatherCondition(d.condition_text, language)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {Math.round(d.temp_max)}° <span className="text-slate-400 dark:text-slate-500 font-normal">/ {Math.round(d.temp_min)}°</span>
                    </p>
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                      {d.precipitation_probability}% {t.forecast_rain_suffix}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Detailed Analytics, UV Index, Multi-Metric Graphs, Visibility & Event Planner */}
        <div className="space-y-6">
          {/* 4. Detailed Solar UV Index Graph (Compulsory Feature) */}
          <div id="uv-analytics">
            <DetailedUVGraph
              hourly={hourly}
              currentUV={curr.uv_index || 0}
            />
          </div>

          {/* 5. Detailed Color-Coded Multi-Metric Graphs (Blue/Green/Amber/Red) */}
          <div id="metric-graphs">
            <DetailedColorCodedGraphs
              hourly={hourly}
            />
          </div>

          {/* 6. Visibility Intelligence & Role Guidance */}
          <div id="visibility">
            <VisibilityCard
              visibilityIntel={visibilityIntel}
              currentVisibilityKm={curr.visibility}
            />
          </div>

          {/* 7. Event & Outdoor Sunlight Planner */}
          <div id="event-planner">
            <EventPlannerCard
              eventIntel={eventIntel}
              sunrise={curr.sunrise}
              sunset={curr.sunset}
              daylightDuration={daily[0]?.daylight_duration}
            />
          </div>
        </div>

      </div>

      {/* 10. Interactive Weather Radar & Satellite Map (Full-Width at Bottom) */}
      <div id="radar" className="w-full scroll-mt-28">
        <WeatherMap
          currentLocation={loc}
          onSelectCoordinates={onSelectCity}
        />
      </div>

    </div>
  );
};
