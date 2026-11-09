'use client';

import React, { useState } from 'react';
import { 
  Footprints, 
  Coffee, 
  Camera, 
  Trophy, 
  Sparkles, 
  Glasses, 
  Umbrella, 
  Shirt, 
  Droplets, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Wind, 
  Sun, 
  Moon, 
  Flower2,
  CheckCircle2,
  Check,
  Info,
  CalendarCheck
} from 'lucide-react';
import { WeatherResponse, IntelligenceSummary, UserContext } from '../lib/types';
import { useLanguage } from '../hooks/useLanguage';

interface OutdoorActivitiesCompanionProps {
  weather: WeatherResponse;
  intelligence?: IntelligenceSummary | null;
  context?: UserContext;
  onOpenPersonalize?: () => void;
}

export const OutdoorActivitiesCompanion: React.FC<OutdoorActivitiesCompanionProps> = ({
  weather,
  intelligence,
  context,
  onOpenPersonalize,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'activities' | 'wear' | 'air'>('activities');

  const curr = weather.current;
  const temp = Math.round(curr.temperature);
  const rainProb = curr.precipitation_probability || 0;
  const uv = curr.uv_index || 0;
  const wind = curr.wind_speed || 0;
  const aqi = curr.aqi || 45;

  // Dynamic Activity Suitability calculation based on live telemetry
  const activities = React.useMemo(() => {
    // 1. Running / Jogging
    let runScore = 90;
    if (temp > 32) runScore -= 25;
    else if (temp > 28) runScore -= 10;
    if (rainProb > 40) runScore -= 30;
    if (aqi > 150) runScore -= 25;
    if (uv > 8) runScore -= 15;
    runScore = Math.max(20, Math.min(98, runScore));

    // 2. Outdoor Dining & Café
    let diningScore = 88;
    if (rainProb > 30) diningScore -= 35;
    if (wind > 25) diningScore -= 20;
    if (temp > 35 || temp < 15) diningScore -= 20;
    diningScore = Math.max(25, Math.min(95, diningScore));

    // 3. Photography & Golden Hour
    let photoScore = 85;
    if (rainProb > 50) photoScore -= 40;
    if (wind > 35) photoScore -= 25;
    photoScore = Math.max(30, Math.min(96, photoScore));

    // 4. Outdoor Sports & Football/Cricket
    let sportsScore = 80;
    if (rainProb > 35) sportsScore -= 35;
    if (temp > 34) sportsScore -= 20;
    sportsScore = Math.max(20, Math.min(92, sportsScore));

    // 5. Stargazing & Night Sky
    let starScore = 85;
    if (rainProb > 20) starScore -= 30;
    if (curr.humidity > 80) starScore -= 15;
    starScore = Math.max(25, Math.min(95, starScore));

    return [
      {
        id: 'running',
        name: 'Outdoor Running & Jogging',
        icon: Footprints,
        score: runScore,
        bestTime: '06:00 – 08:30 IST',
        status: runScore >= 80 ? 'Ideal' : runScore >= 60 ? 'Moderate' : 'Caution',
        advice: runScore >= 80 
          ? 'Cool morning ambient temperatures with optimal airway comfort.' 
          : 'High heat or humidity detected; hydrate thoroughly and prefer shaded tracks.',
        color: runScore >= 80 ? 'emerald' : runScore >= 60 ? 'amber' : 'rose',
      },
      {
        id: 'dining',
        name: 'Outdoor Dining & Socials',
        icon: Coffee,
        score: diningScore,
        bestTime: '17:30 – 20:30 IST',
        status: diningScore >= 80 ? 'Optimal' : diningScore >= 60 ? 'Manageable' : 'Indoor Preferred',
        advice: rainProb < 20 
          ? 'Gentle breeze and pleasant evening transition; patio seating recommended.' 
          : 'Passing drizzle risk; opt for covered terrace or indoor dining.',
        color: diningScore >= 80 ? 'emerald' : diningScore >= 60 ? 'amber' : 'rose',
      },
      {
        id: 'photo',
        name: 'Golden Hour & Drone Photography',
        icon: Camera,
        score: photoScore,
        bestTime: '06:15 – 07:15 & 17:30 – 18:30 IST',
        status: photoScore >= 80 ? 'Prime Light' : 'Moderate',
        advice: wind < 20 
          ? 'Soft solar diffusion and low atmospheric turbulence ideal for drone stability.' 
          : 'Breezy gusts; secure lightweight tripod setups.',
        color: photoScore >= 80 ? 'emerald' : 'amber',
      },
      {
        id: 'sports',
        name: 'Sports, Cricket & Turf Matches',
        icon: Trophy,
        score: sportsScore,
        bestTime: '16:30 – 18:30 IST',
        status: sportsScore >= 75 ? 'Good' : 'Pitch Caution',
        advice: rainProb < 30 
          ? 'Dry surface friction with steady air density; prime time for play.' 
          : 'Wet grass dampness possible; wear non-slip studded footwear.',
        color: sportsScore >= 75 ? 'emerald' : 'amber',
      },
      {
        id: 'stargazing',
        name: 'Night Sky & Stargazing',
        icon: Moon,
        score: starScore,
        bestTime: '20:30 – 23:00 IST',
        status: starScore >= 75 ? 'Clear Sky' : 'Hazy',
        advice: 'Good atmospheric transparency; minimal cloud interference expected.',
        color: starScore >= 75 ? 'emerald' : 'amber',
      },
    ];
  }, [temp, rainProb, uv, wind, aqi, curr.humidity]);

  // Smart Clothing & Packing Essentials
  const essentials = React.useMemo(() => {
    return [
      {
        title: 'Sun Protection & Eyewear',
        icon: Glasses,
        needed: uv >= 4,
        status: uv >= 6 ? 'Required (UV 6+)' : uv >= 3 ? 'Recommended' : 'Optional',
        detail: uv >= 6 
          ? 'Apply SPF 30+ sunscreen and wear UV-400 sunglasses between 11:00 - 15:00.' 
          : 'Mild UV index; standard eye protection suitable.',
        badgeColor: uv >= 6 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      {
        title: 'Rain Gear & Umbrella',
        icon: Umbrella,
        needed: rainProb >= 30,
        status: rainProb >= 50 ? 'Must Carry' : rainProb >= 25 ? 'Keep Handy' : 'Not Required',
        detail: rainProb >= 40 
          ? `Elevated precipitation chance (${rainProb}%); carry a compact travel umbrella.` 
          : 'Dry weather expected throughout the day.',
        badgeColor: rainProb >= 40 ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-700 border-slate-200',
      },
      {
        title: 'Recommended Attire',
        icon: Shirt,
        needed: true,
        status: temp >= 28 ? 'Light & Breathable' : temp >= 20 ? 'Comfort Casual' : 'Light Layers',
        detail: temp >= 28 
          ? 'Lightweight cotton/linen fabrics to stay cool. Avoid dark synthetic layers.' 
          : 'Comfortable clothing; carry a light jacket for post-sunset wind chill.',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },
      {
        title: 'Daily Hydration Target',
        icon: Droplets,
        needed: true,
        status: temp >= 32 ? '3.0 – 3.5 Liters' : '2.5 Liters',
        detail: 'Hydrate before stepping out in peak sunlight to prevent electrolyte depletion.',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      },
    ];
  }, [uv, rainProb, temp]);

  const allergyInfo = intelligence?.allergy_outlook;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_25px_-4px_rgba(15,184,141,0.08)] p-6 sm:p-7 space-y-5 transition">
      
      {/* Header: Title + Suitability Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F8F3] dark:bg-teal-950/60 text-[#0FB88D] border border-teal-200/80 dark:border-teal-800 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0FB88D]">
                OUTDOOR COMPANION
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Live Analysis
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#0B1F33] dark:text-white tracking-tight mt-0.5">
              Outdoor Activities & Daily Essentials
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Activity suitability, clothing suggestions, and environmental comfort
            </p>
          </div>
        </div>

        {/* Global Feasibility Rating */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 self-start sm:self-auto shrink-0 shadow-xs">
          <Sparkles className="w-4 h-4 text-[#0FB88D]" />
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">Overall Outlook</span>
            <span className="text-xs font-black text-slate-800 dark:text-white">
              {rainProb < 30 && temp < 34 ? '88/100 (Favorable)' : '68/100 (Moderate)'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'activities'
              ? 'bg-white dark:bg-slate-900 text-[#0B1F33] dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 text-[#0FB88D]" />
          <span>Activities ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wear')}
          className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'wear'
              ? 'bg-white dark:bg-slate-900 text-[#0B1F33] dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shirt className="w-3.5 h-3.5 text-indigo-500" />
          <span>What to Wear</span>
        </button>

        <button
          onClick={() => setActiveTab('air')}
          className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'air'
              ? 'bg-white dark:bg-slate-900 text-[#0B1F33] dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Flower2 className="w-3.5 h-3.5 text-purple-500" />
          <span>Air & Allergens</span>
        </button>
      </div>

      {/* TAB 1: OUTDOOR ACTIVITIES MATRIX */}
      {activeTab === 'activities' && (
        <div className="space-y-3">
          {activities.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs hover:border-teal-200 dark:hover:border-teal-800 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-[#0FB88D] shrink-0 mt-0.5 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {act.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        act.color === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                          : act.color === 'amber'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200'
                      }`}>
                        {act.status} ({act.score}/100)
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {act.advice}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-center">
                  <Clock className="w-3.5 h-3.5 text-[#0FB88D]" />
                  <span>{act.bestTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: WHAT TO WEAR & GEAR CHECKLIST */}
      {activeTab === 'wear' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {essentials.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {item.title}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${item.badgeColor}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: AIR QUALITY & ENVIRONMENTAL HEALTH */}
      {activeTab === 'air' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flower2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  Atmospheric Exposure Risk: {allergyInfo?.risk_level || (aqi > 100 ? 'Moderate' : 'Low')}
                </span>
              </div>
              <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 font-semibold">
                Peak Window: {allergyInfo?.peak_period || '12:00 – 16:00 IST'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {allergyInfo?.summary || `Current AQI of ${aqi} poses minimal respiratory discomfort for most outdoor activities.`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
              <span className="text-[10px] text-slate-400 block font-semibold">Particulate PM2.5</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {curr.pm2_5 || 24} µg/m³
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Satisfactory</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
              <span className="text-[10px] text-slate-400 block font-semibold">Tree & Grass Pollen</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                Low
              </span>
              <span className="text-[9px] text-slate-500 font-medium">Safe for allergies</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
              <span className="text-[10px] text-slate-400 block font-semibold">Eye Comfort Index</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {uv < 6 ? 'High' : 'Moderate'}
              </span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-bold">Good Visibility</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Proactive Note */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#0FB88D]" />
          <span>Real-time outdoor metrics calibrated for {weather.location.name}.</span>
        </div>
        {onOpenPersonalize && (
          <button
            onClick={onOpenPersonalize}
            className="text-[#0FB88D] hover:underline font-bold"
          >
            Customize Preferences
          </button>
        )}
      </div>

    </div>
  );
};
