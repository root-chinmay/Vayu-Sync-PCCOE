'use client';

import React from 'react';
import { MapPin, Bell, Sparkles, SlidersHorizontal, Mic, ChevronDown, ShieldCheck } from 'lucide-react';
import { WeatherResponse } from '../lib/types';
import { useLanguage } from '../hooks/useLanguage';

interface WaveGreetingBannerProps {
  userName?: string;
  cityName: string;
  weather?: WeatherResponse | null;
  onOpenCitySelector?: () => void;
  onOpenPersonalizeModal: () => void;
  onOpenAssistant?: () => void;
  onOpenAlerts?: () => void;
  activeRoleTitle?: string;
}

export const WaveGreetingBanner: React.FC<WaveGreetingBannerProps> = ({
  userName = 'Neyan',
  cityName,
  weather,
  onOpenCitySelector,
  onOpenPersonalizeModal,
  onOpenAssistant,
  onOpenAlerts,
  activeRoleTitle = 'Runner',
}) => {
  const { t } = useLanguage();
  
  // Calculate dynamic greeting based on current time
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 
    ? 'Good Morning' 
    : currentHour < 17 
    ? 'Good Afternoon' 
    : 'Good Evening';
  const greetingEmoji = currentHour >= 6 && currentHour < 18 ? '☀️' : '🌙';

  const hasAlerts = (weather?.alerts && weather.alerts.length > 0);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-lg bg-gradient-to-r from-[#0B1F33] via-[#0da07b] to-[#0FB88D] text-white">
      {/* Decorative Wave Overlays */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          <path d="M0,80 C150,160 350,0 500,80 C650,160 750,40 800,90 L800,200 L0,200 Z" fill="#38BDF8" />
          <path d="M0,120 C200,40 400,160 600,100 C700,70 780,120 800,110 L800,200 L0,200 Z" fill="#FFFFFF" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Side: City Tag + Dynamic Greeting */}
        <div className="space-y-1.5">
          {/* City Pill */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenCitySelector}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-semibold tracking-wide transition border border-white/25 cursor-pointer shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{cityName}</span>
              <ChevronDown className="w-3 h-3 text-white/80" />
            </button>

            {hasAlerts ? (
              <button 
                onClick={onOpenAlerts}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/80 hover:bg-rose-500 text-[11px] font-bold tracking-wide animate-pulse transition"
              >
                <span>⚠️ Alerts Active</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] font-medium border border-emerald-400/30">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>Optimal Forecast</span>
              </span>
            )}
          </div>

          {/* Big Greeting */}
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-medium text-white/85 tracking-wide">
              {greeting},
            </p>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{userName || 'Friend'}</span>
              <span className="text-xl sm:text-2xl select-none">{greetingEmoji}</span>
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-white/90 font-medium pt-1 max-w-xl">
            Personalized weather for a safer, healthier and happier you.
          </p>
        </div>

        {/* Right Side: Quick Action Pills */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-2 md:pt-0">
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition shadow-sm"
              title="Open VayuSync Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Voice Sahayak</span>
            </button>
          )}

          <button
            onClick={onOpenPersonalizeModal}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0FB88D] hover:bg-[#0da07b] text-white text-xs font-bold transition shadow-md shadow-emerald-950/20 border border-white/20"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize Role ({activeRoleTitle})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
