'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Globe, 
  Search, 
  Check, 
  ArrowRight, 
  Sparkles,
  Navigation,
  Mic
} from 'lucide-react';
import { Header } from '../components/Header';
import { StandardMausam } from '../components/StandardMausam';
import { VayuSyncPersonalized } from '../components/VayuSyncPersonalized';
import { PersonalizationModal } from '../components/PersonalizationModal';
import { AIAssistantModal } from '../components/AIAssistantModal';
import { HelpReportModal } from '../components/HelpReportModal';
import { useLanguage } from '../hooks/useLanguage';
import { ALL_INDIAN_LANGUAGES, Language } from '../lib/i18n';
import { 
  WeatherResponse, 
  IntelligenceSummary, 
  UserContext 
} from '../lib/types';
import { 
  fetchWeather, 
  fetchIntelligence, 
  fetchCities,
  reverseGeocodeLocation
} from '../lib/api';
import { WaveGreetingBanner } from '../components/WaveGreetingBanner';
import { BottomNavBar } from '../components/BottomNavBar';
import { getPersonaConfig } from '../lib/personaConfig';

const todayDateString = new Date().toISOString().split('T')[0];

const DEFAULT_USER_CONTEXT: UserContext = {
  name: 'Ameya',
  is_personalized: false,
  interests: ['commute', 'running'],
  priorities: ['rain', 'heat', 'aqi'],
  preferred_transit: 'two_wheeler',
  calendar_events: [
    { id: 'ev-1', title: 'Morning Run / Jog', date: todayDateString, start_hour: 6, end_hour: 7, is_outdoor: true },
    { id: 'ev-2', title: 'Daily Office Commute', date: todayDateString, start_hour: 8, end_hour: 10, is_outdoor: true },
  ],
};

function MainApp() {
  const { language, setLanguage, t } = useLanguage();
  const [activeMode, setActiveMode] = useState<'standard' | 'personalized'>('standard');
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [context, setContext] = useState<UserContext>(DEFAULT_USER_CONTEXT);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);
  const [cities, setCities] = useState<Array<{ name: string; state: string; lat: number; lon: number; default_persona: string }>>([]);
  const [currentCity, setCurrentCity] = useState({
    name: 'Pune',
    state: 'Maharashtra',
    lat: 18.5204,
    lon: 73.8567,
    default_persona: 'student',
  });
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [simulatedHour, setSimulatedHour] = useState<number>(new Date().getHours());
  
  // Modals
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isHelpReportOpen, setIsHelpReportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── ONBOARDING FLOW STATE ──────────────────────────────────────────────────
  // Step 1: 'location' -> Step 2: 'language' -> Step 3: 'personalize' -> 'completed'
  const [onboardingStep, setOnboardingStep] = useState<'location' | 'language' | 'personalize' | 'completed'>('completed');
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [tempSelectedLang, setTempSelectedLang] = useState<Language>(language || 'en');

  // Keep tempSelectedLang synchronized with active language
  useEffect(() => {
    if (language) {
      setTempSelectedLang(language);
    }
  }, [language]);

  // Check onboarding status and load saved context on mount
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem('vayusync_onboarded');
      if (!onboarded) {
        setOnboardingStep('location');
      } else {
        setOnboardingStep('completed');
      }

      const savedContext = localStorage.getItem('vayusync_user_context');
      if (savedContext) {
        const parsed = JSON.parse(savedContext);
        setContext(parsed);
        if (parsed.is_personalized) {
          setActiveMode('personalized');
        }
      }
    } catch {
      // In restricted storage environments
    }
  }, []);


  // Load cities on mount
  useEffect(() => {
    fetchCities().then(setCities).catch(console.error);
  }, []);

  // Fetch Weather & Compute Intelligence
  const loadData = useCallback(async (
    lat: number,
    lon: number,
    cityName: string,
    scenario: string | null,
    activeCtx: UserContext,
    forceRefresh: boolean = false
  ) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const wData = await fetchWeather(
        lat, 
        lon, 
        cityName, 
        scenario ? 'mock' : 'open_meteo', 
        scenario || undefined,
        forceRefresh
      );
      setWeather(wData);

      const iData = await fetchIntelligence(wData, activeCtx);
      setIntelligence(iData);
    } catch (err: any) {
      console.error('Failed to load telemetry or intelligence:', err);
      setFetchError(err.message || 'Live weather data unavailable');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentCity.lat, currentCity.lon, currentCity.name, activeScenario, context);
  }, [currentCity, activeScenario, loadData]);

  // Handle saving personalization preferences
  const handleSaveContext = async (updatedCtx: UserContext) => {
    setContext(updatedCtx);
    setActiveMode('personalized'); // Automatically transition to personalized view upon saving!
    try {
      localStorage.setItem('vayusync_user_context', JSON.stringify(updatedCtx));
      localStorage.setItem('vayusync_onboarded', 'true');
    } catch {
      // ignore
    }
    setOnboardingStep('completed');
    setIsPersonalizeOpen(false);

    if (weather) {
      try {
        const iData = await fetchIntelligence(weather, updatedCtx);
        setIntelligence(iData);
      } catch (err) {
        console.error('Failed to recompute intelligence:', err);
      }
    }
  };

  // Switch City
  const handleSelectCity = (c: { name: string; state?: string; lat: number; lon: number; default_persona: string }) => {
    setCurrentCity({
      name: c.name,
      state: c.state || '',
      lat: c.lat,
      lon: c.lon,
      default_persona: c.default_persona,
    });
    setActiveScenario(null);
  };

  // Browser Geolocation with Live Reverse Geocoding
  const handleUseCurrentLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const geo = await reverseGeocodeLocation(lat, lon);
            setCurrentCity({
              name: geo.name,
              state: geo.state || 'GPS Station',
              lat,
              lon,
              default_persona: geo.default_persona || 'commuter',
            });
          } catch {
            setCurrentCity({
              name: `Station (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
              state: 'GPS Telemetry',
              lat,
              lon,
              default_persona: 'commuter',
            });
          }
          setActiveScenario(null);
        },
        (err) => {
          console.warn(`Geolocation error: ${err.message}`);
        }
      );
    }
  };

  // Onboarding Step 1: Accept Location Permission (ONLY Accept button)
  const handleAcceptLocation = () => {
    setIsRequestingLocation(true);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const geo = await reverseGeocodeLocation(lat, lon);
            setCurrentCity({
              name: geo.name,
              state: geo.state || 'Local Station',
              lat,
              lon,
              default_persona: geo.default_persona || 'commuter',
            });
          } catch {
            setCurrentCity({
              name: `Station (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
              state: 'GPS Telemetry',
              lat,
              lon,
              default_persona: 'commuter',
            });
          }
          setIsRequestingLocation(false);
          setOnboardingStep('language');
        },
        () => {
          setIsRequestingLocation(false);
          setOnboardingStep('language');
        },
        { timeout: 8000 }
      );
    } else {
      setIsRequestingLocation(false);
      setOnboardingStep('language');
    }
  };

  // Onboarding Step 2: Complete Language Selection
  const handleCompleteLanguage = () => {
    setLanguage(tempSelectedLang);
    setOnboardingStep('personalize');
    setIsPersonalizeOpen(true);
  };

  // Handle section scrolling
  const handleSelectSection = (sec: string) => {
    setActiveSection(sec);

    if (sec === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If the section doesn't exist in current mode, switch to standard mode so target exists
    const elem = document.getElementById(sec);
    if (!elem && activeMode === 'personalized') {
      setActiveMode('standard');
    }

    setTimeout(() => {
      const target = document.getElementById(sec);
      if (target) {
        const headerOffset = 110;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 60);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Application Header */}
      <Header
        currentLocation={weather?.location || currentCity}
        cities={cities}
        onSelectCity={handleSelectCity}
        onUseCurrentLocation={handleUseCurrentLocation}
        activeMode={activeMode}
        onToggleMode={(mode) => setActiveMode(mode)}
        onOpenPersonalizeModal={() => setIsPersonalizeOpen(true)}
        onOpenHelpReportModal={() => setIsHelpReportOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        isPersonalized={context.is_personalized}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        providerName={weather?.provider || 'VayuSync Data Standard'}
        isLiveLoading={isLoading}
        onRefresh={() => loadData(currentCity.lat, currentCity.lon, currentCity.name, activeScenario, context, true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6 pb-28">
        
        {/* Dynamic Wave Greeting Hero Banner (Screen 1 & Screen 3 Design) */}
        {weather && (
          <WaveGreetingBanner
            userName={context?.name || 'Neyan'}
            cityName={weather.location.name || currentCity.name}
            weather={weather}
            onOpenCitySelector={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPersonalizeModal={() => setIsPersonalizeOpen(true)}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onOpenAlerts={() => handleSelectSection('warnings')}
            activeRoleTitle={getPersonaConfig(context.interests?.[0] || 'running').shortTitle}
          />
        )}
        
        {fetchError && !weather && (
          <div className="rounded-3xl glass-panel p-8 text-center space-y-4 max-w-xl mx-auto border border-rose-200 dark:border-rose-900/50 bg-white/80 dark:bg-slate-900/80">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Data Unavailable</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {fetchError}. Per live compliance requirements, no fake placeholder weather is being substituted.
            </p>
            <button
              onClick={() => loadData(currentCity.lat, currentCity.lon, currentCity.name, activeScenario, context, true)}
              className="px-4 py-2 rounded-xl bg-[#0FB88D] hover:bg-[#0da07b] text-white text-xs font-bold transition"
            >
              Retry Live Connection
            </button>
          </div>
        )}

        {weather && (
          <>
            {activeMode === 'standard' ? (
              /* State 1: Standard Mausam Official Weather Experience */
              <StandardMausam
                weather={weather}
                intelligence={intelligence}
                context={context}
                eventIntel={intelligence?.event_planning}
                visibilityIntel={intelligence?.visibility_intel}
                onSelectCity={handleSelectCity}
                onOpenPersonalizeModal={() => setIsPersonalizeOpen(true)}
                onEnablePersonalizedMode={() => {
                  setActiveMode('personalized');
                  if (!context.is_personalized) {
                    setIsPersonalizeOpen(true);
                  }
                }}
                activeSection={activeSection}
              />
            ) : (
              /* State 2: VayuSync Personalized Experience */
              intelligence && (
                <VayuSyncPersonalized
                  weather={weather}
                  intelligence={intelligence}
                  context={context}
                  onOpenPersonalizeModal={() => setIsPersonalizeOpen(true)}
                  onOpenAssistant={() => setIsAssistantOpen(true)}
                  onSelectCity={handleSelectCity}
                />
              )
            )}
          </>
        )}

      </main>

      {/* Floating Bottom Navigation Dock (Screen 1 & Screen 3 Design) */}
      <BottomNavBar
        activeTab={activeMode === 'personalized' ? 'activity' : activeSection}
        onSelectTab={(tab) => {
          if (tab === 'activity') {
            setActiveMode('personalized');
          } else {
            setActiveMode('standard');
            handleSelectSection(tab);
          }
        }}
        onOpenPersonalizeModal={() => setIsPersonalizeOpen(true)}
        activeRoleTitle={getPersonaConfig(context.interests?.[0] || 'running').shortTitle}
        alertCount={weather?.alerts?.length || 0}
      />

      {/* Help & Report / Contact & Feedback Modal */}
      <HelpReportModal
        isOpen={isHelpReportOpen}
        onClose={() => setIsHelpReportOpen(false)}
        currentCity={weather?.location.name || currentCity.name}
        lat={weather?.location.lat || currentCity.lat}
        lon={weather?.location.lon || currentCity.lon}
        userName={context?.name}
      />

      {/* Personalization Modal ("What matters to you?") */}
      <PersonalizationModal
        isOpen={isPersonalizeOpen}
        onClose={() => {
          setIsPersonalizeOpen(false);
          if (onboardingStep === 'personalize') {
            setOnboardingStep('completed');
          }
        }}
        context={context}
        onSaveContext={handleSaveContext}
      />

      {/* Conversational AI Assistant (VayuSync Sahayak) */}
      {weather && intelligence && (
        <>
          <AIAssistantModal
            isOpen={isAssistantOpen}
            onClose={() => setIsAssistantOpen(false)}
            weather={weather}
            intelligence={intelligence}
            context={context}
          />
          {/* Floating Voice Assistant Trigger (Bottom Right, elevated above telemetry bar) */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-sky-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2.5 border border-white/20 group"
            title="Open VayuSync Sahayak Voice Assistant"
          >
            <div className="relative">
              <Mic className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            </div>
            <span className="text-xs font-bold tracking-wide hidden sm:inline">VayuSync Sahayak</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </>
      )}

      {/* ── ONBOARDING MODAL 1: LOCATION PERMISSION (ONLY ACCEPT BUTTON) ────── */}
      {onboardingStep === 'location' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-teal-100 dark:border-slate-800 shadow-2xl space-y-5 text-center">
            
            {/* Stepper (Location Active) */}
            <div className="flex items-center justify-between max-w-xs mx-auto w-full px-2">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-[#0FB88D] text-white flex items-center justify-center text-[10px] font-bold shadow-xs ring-4 ring-teal-100 dark:ring-teal-900/40">
                  1
                </div>
                <span className="text-[10px] font-bold text-[#0FB88D] mt-1">Location</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2 -mt-4" />
              <div className="flex flex-col items-center opacity-40">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-1">Language</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2 -mt-4" />
              <div className="flex flex-col items-center opacity-40">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                  3
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-1">Role</span>
              </div>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#0FB88D] border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto shadow-sm">
              <MapPin className="w-8 h-8 animate-bounce text-[#0FB88D]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#0B1F33] dark:text-white tracking-tight">
                {t.onboarding_location_title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.onboarding_location_desc}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#E6F8F3] dark:bg-teal-950/30 border border-teal-100 dark:border-teal-800 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-medium">
                <Navigation className="w-3.5 h-3.5 text-[#0FB88D]" />
                <span>Hyperlocal Doppler telemetry</span>
              </div>
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Automated station synchronization</span>
              </div>
            </div>

            {/* ONLY ACCEPT BUTTON per strict instructions */}
            <button
              onClick={handleAcceptLocation}
              disabled={isRequestingLocation}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0FB88D] hover:bg-[#0da07b] text-white text-sm font-bold shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRequestingLocation ? (
                <span>{t.onboarding_locating}</span>
              ) : (
                <>
                  <span>{t.onboarding_accept}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── ONBOARDING MODAL 2: LANGUAGE SELECTION (ALL 23 INDIAN LANGUAGES) ─ */}
      {onboardingStep === 'language' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-teal-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-800/50 flex flex-col gap-3">
              {/* Stepper (Language Active) */}
              <div className="flex items-center justify-between max-w-xs mx-auto w-full px-2">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#0FB88D] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    ✓
                  </div>
                  <span className="text-[10px] font-semibold text-[#0FB88D] mt-1">Location</span>
                </div>
                <div className="flex-1 h-0.5 bg-[#0FB88D] mx-2 -mt-4" />
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#0FB88D] text-white flex items-center justify-center text-[10px] font-bold shadow-xs ring-4 ring-teal-100 dark:ring-teal-900/40">
                    2
                  </div>
                  <span className="text-[10px] font-bold text-[#0FB88D] mt-1">Language</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2 -mt-4" />
                <div className="flex flex-col items-center opacity-40">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                    3
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1">Role</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-[#0FB88D] border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {t.onboarding_lang_title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.onboarding_lang_desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={langSearchQuery}
                  onChange={(e) => setLangSearchQuery(e.target.value)}
                  placeholder={t.onboarding_search_lang}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Language Selection Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_INDIAN_LANGUAGES.filter((l) => {
                if (!langSearchQuery.trim()) return true;
                const q = langSearchQuery.toLowerCase().trim();
                return (
                  l.code.toLowerCase().includes(q) ||
                  l.name.toLowerCase().includes(q) ||
                  l.native.toLowerCase().includes(q) ||
                  l.region.toLowerCase().includes(q)
                );
              }).map((l) => {
                const isSelected = tempSelectedLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      setTempSelectedLang(l.code);
                      setLanguage(l.code);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-[#E6F8F3] dark:bg-teal-950/60 border-[#0FB88D] text-teal-900 dark:text-teal-200 ring-2 ring-[#0FB88D]/40 shadow-sm'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{l.native}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{l.name} • {l.region}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#0FB88D] shrink-0 ml-2 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Footer Continue Button */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t.onboarding_selected}: <strong className="text-[#0FB88D] uppercase font-mono">{tempSelectedLang}</strong>
              </span>
              <button
                onClick={handleCompleteLanguage}
                className="px-6 py-2.5 rounded-2xl bg-[#0FB88D] hover:bg-[#0da07b] text-white text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center gap-1.5"
              >
                <span>{t.onboarding_continue}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 py-6 mt-12 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-slate-800 dark:text-white">VAYUSYNC</strong>
            <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
            <span>Personalized Meteorological Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Dynamic Dual-Theme (Light / Dark)</span>
            <span>•</span>
            <span>National Meteorological Service Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return <MainApp />;
}

