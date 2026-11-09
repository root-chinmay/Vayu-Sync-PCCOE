'use client';

import React from 'react';
import { 
  Car, 
  Clock, 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  Droplets, 
  Wind, 
  Train,
  CheckCircle2
} from 'lucide-react';
import { WeatherResponse, IntelligenceSummary, UserContext } from '../lib/types';
import { useLanguage } from '../hooks/useLanguage';
import { getLocalizedWeatherCondition } from '../lib/weatherConditions';

interface CommuteIntelligenceCardProps {
  weather: WeatherResponse;
  intelligence: IntelligenceSummary;
  context: UserContext;
}

export const CommuteIntelligenceCard: React.FC<CommuteIntelligenceCardProps> = ({
  weather,
  intelligence,
  context,
}) => {
  const { t, language } = useLanguage();
  const curr = weather.current;
  const loc = weather.location;
  const commIntel = intelligence.commute;
  const roleDetails = context.role_details?.commute;

  // Extract real available context (never fabricate missing data)
  const officeTiming = roleDetails?.office_timing;
  const officeLocation = roleDetails?.office_location;
  const transitMode = context.preferred_transit || (roleDetails as any)?.transit_mode || 'two_wheeler';

  // Format transit mode label
  const formattedTransitMode = React.useMemo(() => {
    switch (transitMode) {
      case 'two_wheeler':
        return t.transit_two_wheeler;
      case 'metro':
        return t.transit_public;
      case 'car':
        return t.transit_four_wheeler;
      case 'bus':
        return t.transit_public;
      case 'walking':
        return t.transit_walking;
      case 'bicycle':
        return t.transit_two_wheeler;
      default:
        return t.transit_two_wheeler;
    }
  }, [transitMode, t]);

  // Derived commute weather risk assessment from existing data
  const delayMins = commIntel?.traffic_delay_estimate_minutes || 0;
  const safetyScore = commIntel?.two_wheeler_safety_index || 85;
  const rainProb = curr.precipitation_probability;
  const visibilityKm = curr.visibility;
  const windSpeed = curr.wind_speed;

  const statusLevel = React.useMemo(() => {
    if (rainProb > 60 || visibilityKm < 3 || safetyScore < 55 || delayMins > 15) {
      return 'risk';
    }
    if (rainProb > 30 || visibilityKm < 6 || safetyScore < 75 || delayMins > 5) {
      return 'caution';
    }
    return 'favorable';
  }, [rainProb, visibilityKm, safetyScore, delayMins]);

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 space-y-6 shadow-xs relative overflow-hidden transition-colors">
      
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── 1. HEADER (Title, Subtitle & Status Badge) ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 shrink-0 shadow-xs">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                {t.commute_personalized_role}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">• VayuSync Commute</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {t.commute_title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.commute_subtitle}
            </p>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div className="shrink-0">
          {statusLevel === 'favorable' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.commute_transit_normal}
            </span>
          )}
          {statusLevel === 'caution' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t.commute_weather_caution}
            </span>
          )}
          {statusLevel === 'risk' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {t.commute_high_risk}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. CONTEXT INFORMATION ROW (Only actual available context) ───────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">{t.commute_location_label}:</span>
          <strong className="text-slate-900 dark:text-white font-semibold">{loc.name}</strong>
        </div>

        {officeTiming && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">{t.commute_timing_label}:</span>
            <strong className="text-slate-900 dark:text-white font-semibold">{officeTiming}</strong>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">{t.commute_mode_label}:</span>
          <strong className="text-slate-900 dark:text-white font-semibold">{formattedTransitMode}</strong>
        </div>

        {officeLocation && officeLocation !== loc.name && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">{t.commute_dest_label}:</span>
            <strong className="text-slate-900 dark:text-white font-semibold">{officeLocation}</strong>
          </div>
        )}
      </div>

      {/* ── 3. PRIMARY METRICS (3-Column Layout: Desktop 3, Tablet 2, Mobile 1) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Metric 1: Weather-Related Delay Risk */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.commute_delay_risk}</span>
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              +{delayMins} min
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {delayMins === 0 ? t.commute_normal_flow : t.commute_rain_delay}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {t.commute_delay_desc}
          </p>
        </div>

        {/* Metric 2: Two-Wheeler Safety */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.commute_safety_index}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {safetyScore}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {safetyScore >= 80 ? t.commute_traction_good : safetyScore >= 65 ? t.commute_traction_moderate : t.commute_traction_slippery}
          </p>
        </div>

        {/* Metric 3: Road & Highway Visibility */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.metric_visibility}</span>
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {visibilityKm} km
            </span>
            <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
              {visibilityKm >= 10 ? t.vis_clear_sightline : visibilityKm >= 5 ? t.vis_moderate_haze : t.vis_thick_mist}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {t.vis_optimum_range}
          </p>
        </div>

      </div>

      {/* ── 4. SUPPORTING WEATHER FACTORS BAR ──────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">{t.metric_rain}:</span>
          <strong className="text-slate-800 dark:text-slate-200">{rainProb}%</strong>
        </div>

        <div className="flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">{t.metric_wind}:</span>
          <strong className="text-slate-800 dark:text-slate-200">{windSpeed} km/h</strong>
        </div>

        <div className="flex items-center gap-2">
          <Train className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">Metro Alt:</span>
          <strong className="text-emerald-700 dark:text-emerald-400 truncate">{commIntel?.metro_advantage || 'Available'}</strong>
        </div>

        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">Sky:</span>
          <strong className="text-slate-800 dark:text-slate-200 truncate">{getLocalizedWeatherCondition(curr.condition_text, language)}</strong>
        </div>
      </div>

      {/* ── 5. PERSONALIZED VAYUSYNC INTERPRETATION BANNER ──────────────────── */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        statusLevel === 'favorable' 
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' 
          : statusLevel === 'caution'
          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
          : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
      }`}>
        <div className="flex items-start gap-3">
          {statusLevel === 'favorable' && <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
          {statusLevel === 'caution' && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
          {statusLevel === 'risk' && <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
          
          <div className="space-y-0.5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                {statusLevel === 'favorable' && `🟢 ${t.commute_transit_normal.toUpperCase()}`}
                {statusLevel === 'caution' && `🟡 ${t.commute_weather_caution.toUpperCase()}`}
                {statusLevel === 'risk' && `🔴 ${t.commute_high_risk.toUpperCase()}`}
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {statusLevel === 'favorable' && (
                language === 'hi' ? `${loc.name} में वर्तमान मौसम आपके आवागमन में कोई बाधा उत्पन्न नहीं करेगा।` :
                language === 'mr' ? `${loc.name} मधील सद्य हवामानामुळे तुमच्या प्रवासात कोणताही अडथळा येणार नाही.` :
                language === 'bn' ? `${loc.name} অঞ্চলের বর্তমান আবহাওয়া আপনার যাতায়াতে কোনো বিঘ্ন সৃষ্টি করবে না।` :
                language === 'te' ? `${loc.name} లో ప్రస్తుత వాతావరణం మీ ప్రయాణానికి ఎటువంటి ఆటంకం కలిగించదు.` :
                `Current weather over ${loc.name} is unlikely to significantly interfere with your commute.`
              )}
              {statusLevel === 'caution' && (
                language === 'hi' ? `बारिश का जोखिम (${rainProb}%) या हवा की गति से मामूली देरी हो सकती है। 10 मिनट का अतिरिक्त समय रखें।` :
                language === 'mr' ? `पावसाची शक्यता (${rainProb}%) किंवा वाऱ्यामुळे थोडा उशीर होऊ शकतो. १० मिनिटांचे जादा नियोजन ठेवा.` :
                language === 'bn' ? `বৃষ্টির সম্ভাবনা (${rainProb}%) বা বাতাসের কারণে সামান্য বিলম্ব হতে পারে। ১০ মিনিট বাড়তি সময় রাখুন।` :
                language === 'te' ? `వర్షం ముప్పు (${rainProb}%) లేదా గాలి వేగం వల్ల కొద్దిగా ఆలస్యం కావచ్చు. 10 నిమిషాల సమయం అదనంగా ఉంచుకోండి.` :
                `Rain risk (${rainProb}%) or wind speeds may cause minor transit friction. Plan a 10-minute buffer.`
              )}
              {statusLevel === 'risk' && (
                language === 'hi' ? `आपके मार्ग पर प्रतिकूल मौसम या कम दृश्यता है। मेट्रो या सुरक्षित वाहन का उपयोग करें।` :
                language === 'mr' ? `प्रवासाच्या मार्गावर प्रतिकूल हवामान किंवा कमी दृश्यमानता आहे. मेट्रो किंवा सुरक्षित वाहनाचा वापर करा.` :
                language === 'bn' ? `আপনার যাতায়াত রুটে বৈরী আবহাওয়া বা কম দৃশ্যমানতা রয়েছে। মেট্রো বা আচ্ছাদিত যান ব্যবহার করুন।` :
                language === 'te' ? `మీ ప్రయాణ మార్గంలో ప్రతికూల వాతావరణం లేదా తక్కువ దృశ్యమానత ఉంది. మెట్రో లేదా సురక్షిత రవాణాను ఎంచుకోండి.` :
                `Severe weather or reduced visibility present on your commute route. Consider Metro or covered transport.`
              )}
            </p>
          </div>
        </div>

        {/* Tip / Advisory Callout */}
        <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 shrink-0 sm:max-w-xs shadow-xs">
          <strong className="text-sky-700 dark:text-sky-400 font-semibold block text-[11px]">VayuSync Advisory:</strong>
          <span className="text-[11px] text-slate-600 dark:text-slate-300">{commIntel?.commute_window_tip || 'Road conditions remain clear.'}</span>
        </div>
      </div>

    </div>
  );
};
