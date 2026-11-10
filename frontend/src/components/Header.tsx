'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CloudSun, 
  MapPin, 
  Navigation, 
  Sparkles, 
  RefreshCw, 
  ChevronDown,
  SlidersHorizontal,
  Layers,
  ShieldAlert,
  Calendar,
  Compass,
  Globe,
  LifeBuoy,
  Search,
  Check,
  Mic,
  Sun,
  Moon
} from 'lucide-react';
import { Location } from '../lib/types';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { VayuSyncLogo } from './VayuSyncLogo';
import { Language, ALL_INDIAN_LANGUAGES } from '../lib/i18n';

interface HeaderProps {
  currentLocation: Location;
  cities: Array<{ name: string; state: string; lat: number; lon: number; default_persona: string }>;
  onSelectCity: (city: { name: string; state: string; lat: number; lon: number; default_persona: string }) => void;
  onUseCurrentLocation: () => void;
  activeMode: 'standard' | 'personalized';
  onToggleMode: (mode: 'standard' | 'personalized') => void;
  onOpenPersonalizeModal: () => void;
  onOpenHelpReportModal: () => void;
  onOpenAssistant?: () => void;
  isPersonalized: boolean;
  activeSection: string;
  onSelectSection: (section: string) => void;
  providerName: string;
  isLiveLoading: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  cities,
  onSelectCity,
  onUseCurrentLocation,
  activeMode,
  onToggleMode,
  onOpenPersonalizeModal,
  onOpenHelpReportModal,
  onOpenAssistant,
  isPersonalized,
  activeSection,
  onSelectSection,
  providerName,
  isLiveLoading,
  onRefresh,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    if (langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [langDropdownOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sky-100 dark:border-slate-800/80 glass-panel bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      {/* Top Identity & Location Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Primary VayuSync Branding */}
        <VayuSyncLogo size={36} showTagline={false} />

        {/* Center: Dual Mode Switcher (Standard Mausam vs VayuSync Intelligence) - Visible on md+ */}
        <div className="hidden md:flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <button
            onClick={() => onToggleMode('standard')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeMode === 'standard'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.tab_overview}
          </button>
          <button
            onClick={() => onToggleMode('personalized')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeMode === 'personalized'
                ? 'bg-[#0FB88D] text-white shadow-md shadow-teal-500/20'
                : 'text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.tab_personalized}</span>
          </button>
        </div>

        {/* Right Controls: Theme, Language, Help, Location, Refresh, Personalize */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition shadow-sm shrink-0"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-600" />
            )}
          </button>

          {/* Language Selector (All 22 Official Indian Languages + English) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setLangSearch('');
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition text-slate-700 dark:text-slate-200 shadow-sm shrink-0"
              title="Select Indian Language"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="uppercase font-mono tracking-wider font-bold text-sky-700 dark:text-sky-400">{language}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] sm:w-80 max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-sky-100 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header with Search */}
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between pb-2 px-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Indian Languages (भारतीय भाषाएं)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      22+ Supported
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      placeholder="Search language / भाषा खोजें..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Languages Scrollable List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 py-1">
                  {ALL_INDIAN_LANGUAGES.filter((l) => {
                    if (!langSearch.trim()) return true;
                    const q = langSearch.toLowerCase().trim();
                    return (
                      l.code.toLowerCase().includes(q) ||
                      l.name.toLowerCase().includes(q) ||
                      l.native.toLowerCase().includes(q) ||
                      l.region.toLowerCase().includes(q)
                    );
                  }).map((l) => {
                    const isSelected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          setLangDropdownOpen(false);
                          setLangSearch('');
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[13px] text-slate-900 dark:text-white">{l.native}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">({l.name})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{l.region}</span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {ALL_INDIAN_LANGUAGES.filter((l) => {
                    if (!langSearch.trim()) return true;
                    const q = langSearch.toLowerCase().trim();
                    return (
                      l.code.toLowerCase().includes(q) ||
                      l.name.toLowerCase().includes(q) ||
                      l.native.toLowerCase().includes(q) ||
                      l.region.toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      No language matching "{langSearch}"
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>8th Schedule Languages</span>
                  <span className="text-sky-600 dark:text-sky-400 font-mono font-semibold">VayuSync i18n</span>
                </div>
              </div>
            )}
          </div>

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium transition text-slate-700 dark:text-slate-200 shadow-sm shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="truncate max-w-[65px] sm:max-w-[120px]">{currentLocation.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 py-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  {t.nav_select_observatory}
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {cities.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        onSelectCity(c);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-300 flex items-center justify-between transition ${
                        c.name === currentLocation.name ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{c.state}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GPS Location (visible on sm+) */}
          <button
            onClick={onUseCurrentLocation}
            className="hidden sm:flex p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition shadow-sm shrink-0"
            title={t.nav_gps_location}
          >
            <Navigation className="w-4 h-4" />
          </button>

          {/* Refresh (visible on sm+) */}
          <button
            onClick={onRefresh}
            disabled={isLiveLoading}
            className={`hidden sm:flex p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition shadow-sm shrink-0 ${
              isLiveLoading ? 'animate-spin text-sky-600' : ''
            }`}
            title={t.nav_refresh}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Help & Report Button */}
          <button
            onClick={onOpenHelpReportModal}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold transition shadow-sm shrink-0"
            title={t.btn_help_report}
          >
            <LifeBuoy className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden md:inline">{t.btn_help_report}</span>
          </button>

          {/* Voice Assistant Button */}
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition shrink-0"
              title={t.nav_voice_assistant}
            >
              <Mic className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden md:inline">{t.nav_voice_assistant}</span>
            </button>
          )}

          {/* Personalize Button */}
          <button
            onClick={onOpenPersonalizeModal}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-semibold transition shadow-sm shrink-0"
            title={t.btn_customize}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">{t.btn_customize}</span>
          </button>
        </div>

      </div>

      {/* Mobile Mode Switcher Row (< md) */}
      <div className="md:hidden px-3 pb-2.5 pt-0">
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => onToggleMode('standard')}
            className={`py-1.5 text-xs font-semibold rounded-lg text-center transition ${
              activeMode === 'standard'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.tab_overview}
          </button>
          <button
            onClick={() => onToggleMode('personalized')}
            className={`py-1.5 text-xs font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition ${
              activeMode === 'personalized'
                ? 'bg-[#0FB88D] text-white shadow-md font-bold'
                : 'text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.tab_personalized}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar */}
      <div className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs w-full">
          
          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto -mx-1 px-1 flex-nowrap">
            <button
              onClick={() => onSelectSection('overview')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'overview' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {t.nav_overview}
            </button>
            <button
              onClick={() => onSelectSection('today-vs-normal')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'today-vs-normal' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {language === 'hi' ? 'आज बनाम सामान्य' : language === 'mr' ? 'आज वि. सामान्य' : language === 'bn' ? 'আজ বনাম স্বাভাবিক' : 'Today vs Normal'}
            </button>
            <button
              onClick={() => onSelectSection('hourly')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'hourly' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {t.nav_hourly}
            </button>
            <button
              onClick={() => onSelectSection('daily')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'daily' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {t.nav_daily}
            </button>
            <button
              onClick={() => onSelectSection('hotspots')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'hotspots' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {language === 'hi' ? 'हॉटस्पॉट फ़ाइंडर' : language === 'mr' ? 'हॉटस्पॉट फाइंडर' : 'Hotspot Finder'}
            </button>
            <button
              onClick={() => onSelectSection('radar')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'radar' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {t.nav_radar}
            </button>
            <button
              onClick={() => onSelectSection('warnings')}
              className={`px-3 py-1 rounded-lg transition shrink-0 whitespace-nowrap ${
                activeSection === 'warnings' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {t.nav_warnings}
            </button>

            {activeMode === 'personalized' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0 whitespace-nowrap ml-1 sm:ml-2">
                ✨ {language === 'hi' ? 'वायुसिंक सक्रिय' : language === 'mr' ? 'वायुसिंक सक्रिय' : language === 'bn' ? 'বায়ুসিঙ্ক সক্রিয়' : language === 'te' ? 'వాయుసింక్ యాక్టివ్' : 'VayuSync Active'}
              </span>
            )}
          </nav>

          {/* Source Telemetry Attribution */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-4">
            <span>{language === 'hi' ? 'डेटा' : language === 'mr' ? 'माहिती' : language === 'bn' ? 'উপাত্ত' : language === 'te' ? 'డేటా' : 'Data'}: {providerName}</span>
            <span>•</span>
            <span>{language === 'hi' ? 'अपडेट: अभी' : language === 'mr' ? 'अपडेट: नुकतेच' : language === 'bn' ? 'হালनाগাদ: এইমাত্র' : language === 'te' ? 'నవీకరించబడింది: ఇప్పుడే' : 'Updated: Just now'}</span>
          </div>

        </div>
      </div>
    </header>
  );
};
