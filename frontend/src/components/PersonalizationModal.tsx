'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Calendar, 
  SlidersHorizontal,
  Briefcase,
  Activity,
  Compass,
  Users,
  CalendarDays,
  Sprout,
  Waves,
  HeartPulse,
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  Sun
} from 'lucide-react';
import { UserContext, CalendarEvent, UserRoleDetails } from '../lib/types';
import { useLanguage } from '../hooks/useLanguage';
import { DatePicker } from './DatePicker';
import { formatDisplayDate } from '../lib/weatherConditions';

interface PersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: UserContext;
  onSaveContext: (updatedContext: UserContext) => void;
}

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  isOpen,
  onClose,
  context,
  onSaveContext,
}) => {
  const { language, t } = useLanguage();
  const [stage, setStage] = useState<'general' | 'role_questions'>('general');

  const INTEREST_OPTIONS = [
    { id: 'commute', label: t.role_commute_title, desc: t.role_commute_desc, icon: Briefcase },
    { id: 'running', label: t.role_running_title, desc: t.role_running_desc, icon: Activity },
    { id: 'travel', label: t.role_travel_title, desc: t.role_travel_desc, icon: Compass },
    { id: 'family', label: t.role_family_title, desc: t.role_family_desc, icon: Users },
    { id: 'gardening', label: t.role_gardening_title, desc: t.role_gardening_desc, icon: Sprout },
    { id: 'beach', label: t.role_beach_title, desc: t.role_beach_desc, icon: Waves },
    { id: 'health', label: t.role_health_title, desc: t.role_health_desc, icon: HeartPulse },
    { id: 'event_planning', label: t.role_event_planning_title, desc: t.role_event_planning_desc, icon: CalendarDays },
  ];

  const PRIORITY_OPTIONS = [
    { id: 'rain', label: t.priority_rain, color: 'text-blue-400' },
    { id: 'heat', label: t.priority_heat, color: 'text-amber-400' },
    { id: 'aqi', label: t.priority_aqi, color: 'text-rose-400' },
    { id: 'uv', label: t.priority_uv, color: 'text-purple-400' },
    { id: 'wind', label: t.priority_wind, color: 'text-teal-400' },
    { id: 'cold', label: t.priority_cold, color: 'text-sky-400' },
  ];

  const SENSITIVITY_OPTIONS = [
    { id: 'Pollen', label: t.sensitivity_pollen },
    { id: 'Dust', label: t.sensitivity_dust },
    { id: 'Air Pollution', label: t.sensitivity_pollution },
    { id: 'Humidity', label: t.sensitivity_humidity },
    { id: 'Heat', label: t.sensitivity_heat },
    { id: 'UV Radiation', label: t.sensitivity_uv },
  ];

  const TRANSIT_OPTIONS = [
    { id: 'two_wheeler', label: t.transit_two_wheeler },
    { id: 'four_wheeler', label: t.transit_four_wheeler },
    { id: 'public', label: t.transit_public },
    { id: 'walking', label: t.transit_walking },
  ];

  const validInitialInterests = (context.interests || ['commute', 'running']).filter(
    (i) => i !== 'cycling' && i !== 'events'
  );

  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    validInitialInterests.length > 0 ? validInitialInterests.slice(0, 3) : ['commute']
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(context.priorities || ['rain', 'heat']);
  const [selectedSensitivities, setSelectedSensitivities] = useState<string[]>(context.sensitivities || ['Dust', 'Air Pollution']);
  const [preferredTransit, setPreferredTransit] = useState(context.preferred_transit || 'two_wheeler');
  const [events, setEvents] = useState<CalendarEvent[]>(context.calendar_events || []);
  
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [commuteTiming, setCommuteTiming] = useState(
    context.role_details?.commute?.office_timing || '09:30 AM - 06:30 PM'
  );
  const [commuteLocation, setCommuteLocation] = useState(
    context.role_details?.commute?.office_location || ''
  );

  const [runnerTimeOfDay, setRunnerTimeOfDay] = useState<'Morning' | 'Evening'>(
    context.role_details?.running?.time_of_day || 'Morning'
  );
  const [runnerTime, setRunnerTime] = useState(
    context.role_details?.running?.running_time || '06:00 AM'
  );

  const [travelType, setTravelType] = useState(
    context.role_details?.travel?.travel_type || 'Road Trips / Highway'
  );
  const [travelDest, setTravelDest] = useState(
    context.role_details?.travel?.frequent_destination || ''
  );

  const [familyAge, setFamilyAge] = useState(
    context.role_details?.family?.children_age_group || 'Young Children (2-10 yrs)'
  );
  const [familyPlayTime, setFamilyPlayTime] = useState(
    context.role_details?.family?.outdoor_play_time || 'Evening (05:00 PM - 07:00 PM)'
  );

  const [gardeningCrop, setGardeningCrop] = useState(
    context.role_details?.gardening?.crop_type || 'Vegetables & Herbs'
  );
  const [gardeningWatering, setGardeningWatering] = useState(
    context.role_details?.gardening?.watering_schedule || 'Early Morning'
  );

  const [beachActivity, setBeachActivity] = useState(
    context.role_details?.beach?.activity_type || 'Swimming & Watersports'
  );
  const [beachTiming, setBeachTiming] = useState(
    context.role_details?.beach?.preferred_timing || 'Sunrise / Early Morning'
  );

  const [healthCondition, setHealthCondition] = useState(
    context.role_details?.health?.primary_condition || 'Asthma / Bronchial'
  );
  const [healthThreshold, setHealthThreshold] = useState(
    context.role_details?.health?.air_quality_threshold || 'Moderate (AQI > 100)'
  );

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStart, setNewEventStart] = useState(17);
  const [newEventEnd, setNewEventEnd] = useState(19);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStage('general');
      setWarningMessage(null);
      setDateError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleInterest = (id: string) => {
    setWarningMessage(null);
    if (selectedInterests.includes(id)) {
      setSelectedInterests((prev) => prev.filter((i) => i !== id));
    } else {
      if (selectedInterests.length >= 3) {
        setWarningMessage(t.pers_warning_max_roles);
        return;
      }
      setSelectedInterests((prev) => [...prev, id]);
    }
  };

  const togglePriority = (id: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSensitivity = (id: string) => {
    setSelectedSensitivities((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return;
    if (!newEventDate) {
      setDateError(t.pers_date_required || 'Please select a date.');
      return;
    }
    setDateError(null);
    const newEv: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: newEventTitle.trim(),
      date: newEventDate,
      start_hour: newEventStart,
      end_hour: newEventEnd,
      is_outdoor: true,
    };
    setEvents([...events, newEv]);
    setNewEventTitle('');
    setNewEventDate('');
  };

  const handleRemoveEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  const handleSaveAndNext = () => {
    if (selectedInterests.length === 0) {
      setWarningMessage(t.pers_warning_select_role);
      return;
    }
    setWarningMessage(null);
    setStage('role_questions');
  };

  const handleFinalSaveAndApply = () => {
    setWarningMessage(null);

    if (selectedInterests.includes('commute')) {
      if (!commuteTiming.trim() || !commuteLocation.trim()) {
        setWarningMessage(t.pers_warning_commute_fields);
        return;
      }
    }

    if (selectedInterests.includes('running')) {
      if (!runnerTime.trim()) {
        setWarningMessage(t.pers_warning_runner_fields);
        return;
      }
    }

    if (selectedInterests.includes('event_planning')) {
      if (newEventTitle.trim() && !newEventDate) {
        setWarningMessage(t.pers_date_required || 'Please select a date for your event.');
        return;
      }
    }


    const updatedRoleDetails: UserRoleDetails = {
      commute: selectedInterests.includes('commute')
        ? { office_timing: commuteTiming, office_location: commuteLocation }
        : undefined,
      running: selectedInterests.includes('running')
        ? { time_of_day: runnerTimeOfDay, running_time: runnerTime }
        : undefined,
      travel: selectedInterests.includes('travel')
        ? { travel_type: travelType, frequent_destination: travelDest }
        : undefined,
      family: selectedInterests.includes('family')
        ? { children_age_group: familyAge, outdoor_play_time: familyPlayTime }
        : undefined,
      gardening: selectedInterests.includes('gardening')
        ? { crop_type: gardeningCrop, watering_schedule: gardeningWatering }
        : undefined,
      beach: selectedInterests.includes('beach')
        ? { activity_type: beachActivity, preferred_timing: beachTiming }
        : undefined,
      health: selectedInterests.includes('health')
        ? { primary_condition: healthCondition, air_quality_threshold: healthThreshold }
        : undefined,
      event_planning: selectedInterests.includes('event_planning')
        ? { events }
        : undefined,
    };

    onSaveContext({
      ...context,
      is_personalized: true,
      interests: selectedInterests,
      priorities: selectedPriorities,
      sensitivities: selectedSensitivities,
      preferred_transit: preferredTransit,
      calendar_events: events,
      role_details: updatedRoleDetails,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header with Stepper matching Screen 2 Design */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-4">
          
          {/* Top Title & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-xl tracking-tight text-[#0B1F33] dark:text-white font-sans">
                Vayu<span className="text-[#0FB88D]">Sync</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper: Location -> Language -> Role -> Preferences */}
          <div className="flex items-center justify-between max-w-md mx-auto w-full px-2">
            
            {/* Step 1: Location */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#0FB88D] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                ✓
              </div>
              <span className="text-[10px] font-semibold text-[#0FB88D] mt-1">Location</span>
            </div>
            <div className="flex-1 h-0.5 bg-[#0FB88D] mx-2 -mt-4" />

            {/* Step 2: Language */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#0FB88D] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                ✓
              </div>
              <span className="text-[10px] font-semibold text-[#0FB88D] mt-1">Language</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 -mt-4 ${stage === 'role_questions' ? 'bg-[#0FB88D]' : 'bg-slate-200 dark:bg-slate-700'}`} />

            {/* Step 3: Role */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${
                stage === 'general' ? 'bg-[#0FB88D] text-white ring-4 ring-teal-100 dark:ring-teal-900/40' : 'bg-[#0FB88D] text-white'
              }`}>
                3
              </div>
              <span className="text-[10px] font-bold text-[#0FB88D] mt-1">Role</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 -mt-4 ${stage === 'role_questions' ? 'bg-[#0FB88D]' : 'bg-slate-200 dark:bg-slate-700'}`} />

            {/* Step 4: Preferences */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${
                stage === 'role_questions' ? 'bg-[#0FB88D] text-white ring-4 ring-teal-100 dark:ring-teal-900/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                4
              </div>
              <span className={`text-[10px] font-semibold mt-1 ${stage === 'role_questions' ? 'text-[#0FB88D]' : 'text-slate-400'}`}>
                Preferences
              </span>
            </div>

          </div>

          {/* Screen 2 Subtitle */}
          <div className="text-left pt-1">
            <h3 className="text-xl font-black text-[#0B1F33] dark:text-white tracking-tight">
              {stage === 'general' ? 'Choose your role' : 'Role Preferences & Details'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stage === 'general' ? 'This helps us personalize your weather experience' : 'Fine-tune your schedule, priorities and sensitivities'}
            </p>
          </div>

        </div>

        {/* Warning Notification banner */}
        {warningMessage && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{warningMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {stage === 'general' ? (
            <>
              {/* Section 1: Choose Your Role (Matching Screen 2 Design) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t.pers_roles_heading}
                  </label>
                  <span className={`text-[11px] font-bold ${selectedInterests.length > 0 ? 'text-[#0FB88D]' : 'text-amber-600 dark:text-amber-400'}`}>
                    {selectedInterests.length} / 3 selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INTEREST_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedInterests.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleInterest(opt.id)}
                        className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-3 transition relative group ${
                          isSelected
                            ? 'bg-[#E6F8F3] dark:bg-teal-950/50 border-[#0FB88D] text-slate-900 dark:text-white ring-2 ring-[#0FB88D]/30 shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                            isSelected 
                              ? 'bg-[#0FB88D] text-white shadow-xs' 
                              : 'bg-teal-50 dark:bg-teal-950/60 text-[#0FB88D] border border-teal-100 dark:border-teal-900/60'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-[#0B1F33] dark:text-white leading-tight">
                              {opt.label}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                              {opt.desc}
                            </p>
                          </div>
                        </div>

                        {/* Top-right Circular Check Badge */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition ${
                          isSelected
                            ? 'bg-[#0FB88D] border-[#0FB88D] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* "Your Personalized Homepage" Callout Box (Screen 2) */}
                <div className="p-3.5 rounded-2xl bg-[#E6F8F3] dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 flex items-start gap-3 mt-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0FB88D] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="text-xs">
                    <h4 className="font-extrabold text-[#0B1F33] dark:text-white">Your Personalized Homepage</h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      We'll show you the most relevant weather insights based on your role and preferences.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Weather Priorities */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t.pers_priorities_heading}
                  </label>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{selectedPriorities.length} {t.pers_active_count}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const isSelected = selectedPriorities.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => togglePriority(opt.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Environmental Sensitivities */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t.pers_sensitivities_heading}
                  </label>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">{selectedSensitivities.length} {t.pers_tracked_count}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SENSITIVITY_OPTIONS.map((opt) => {
                    const isSelected = selectedSensitivities.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleSensitivity(opt.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500 text-purple-800 dark:text-purple-300 ring-1 ring-purple-400/40 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="text-left">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ml-1.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Transit Preference */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t.pers_transit_heading}
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRANSIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPreferredTransit(opt.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold capitalize transition ${
                        preferredTransit === opt.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* STAGE 2: ROLE-SPECIFIC QUESTIONS */
            <div className="space-y-6 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>
                  {t.pers_step2_instruction} ({selectedInterests.map(r => r.replace('_', ' ')).join(', ')}):
                </span>
              </div>

              {/* 1. Daily Commute Role */}
              {selectedInterests.includes('commute') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>{t.pers_commute_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t.pers_office_timing_label} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={commuteTiming}
                        onChange={(e) => setCommuteTiming(e.target.value)}
                        placeholder={t.pers_office_timing_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t.pers_office_location_label} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={commuteLocation}
                        onChange={(e) => setCommuteLocation(e.target.value)}
                        placeholder={t.pers_office_location_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Runner / Fitness Role */}
              {selectedInterests.includes('running') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.pers_running_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t.pers_running_pref_label} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={runnerTimeOfDay}
                        onChange={(e) => setRunnerTimeOfDay(e.target.value as 'Morning' | 'Evening')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Morning">{t.opt_morning}</option>
                        <option value="Evening">{t.opt_evening}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {t.pers_running_time_label} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={runnerTime}
                        onChange={(e) => setRunnerTime(e.target.value)}
                        placeholder={t.pers_running_time_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Event Planner Role */}
              {selectedInterests.includes('event_planning') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      {t.pers_event_heading}
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.pers_event_conflict_hint}</span>
                  </div>

                  {/* Event List */}
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs shadow-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{ev.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ev.date ? `${formatDisplayDate(ev.date, language)} • ` : ''}
                            {ev.start_hour}:00 - {ev.end_hour}:00 IST ({t.pers_outdoor_tag})
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveEvent(ev.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Event Input with Date Picker */}
                  <div className="space-y-1.5">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-2 shadow-xs">
                      <input
                        type="text"
                        value={newEventTitle}
                        onChange={(e) => {
                          setNewEventTitle(e.target.value);
                          if (dateError) setDateError(null);
                        }}
                        placeholder={t.pers_add_event_placeholder}
                        className="flex-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />

                      {/* Date Selection Field */}
                      <div className="w-full md:w-auto">
                        <DatePicker
                          value={newEventDate}
                          onChange={(d) => {
                            setNewEventDate(d);
                            if (dateError) setDateError(null);
                          }}
                          placeholder={t.pers_select_date || 'Select Date'}
                          hasError={Boolean(dateError)}
                        />
                      </div>

                      {/* Time Selection */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <select
                          value={newEventStart}
                          onChange={(e) => setNewEventStart(Number(e.target.value))}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>{i}:00</option>
                          ))}
                        </select>
                        <span className="text-slate-400 dark:text-slate-500 text-xs">{t.pers_time_to}</span>
                        <select
                          value={newEventEnd}
                          onChange={(e) => setNewEventEnd(Number(e.target.value))}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>{i}:00</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddEvent}
                          className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shrink-0 shadow-xs"
                          title="Add Event"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {dateError && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 px-1 font-medium flex items-center gap-1">
                        <span>•</span> {dateError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Travel & Trips Role */}
              {selectedInterests.includes('travel') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>{t.pers_travel_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_travel_mode_label}</label>
                      <select
                        value={travelType}
                        onChange={(e) => setTravelType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="Road Trips / Highway">{t.opt_road_trip}</option>
                        <option value="Flights / Air Travel">{t.opt_flight}</option>
                        <option value="Train / Intercity Rail">{t.opt_train}</option>
                        <option value="Trekking & Mountain Excursions">{t.opt_trekking}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_travel_dest_label}</label>
                      <input
                        type="text"
                        value={travelDest}
                        onChange={(e) => setTravelDest(e.target.value)}
                        placeholder={t.pers_travel_dest_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Family & Children Role */}
              {selectedInterests.includes('family') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Users className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    <span>{t.pers_family_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_family_age_label}</label>
                      <select
                        value={familyAge}
                        onChange={(e) => setFamilyAge(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                      >
                        <option value="Toddlers (0-3 yrs)">{t.opt_toddlers}</option>
                        <option value="Young Children (4-10 yrs)">{t.opt_young_kids}</option>
                        <option value="Teenagers (11-18 yrs)">{t.opt_teenagers}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_family_play_label}</label>
                      <input
                        type="text"
                        value={familyPlayTime}
                        onChange={(e) => setFamilyPlayTime(e.target.value)}
                        placeholder={t.pers_family_play_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Gardening / Krishi Role */}
              {selectedInterests.includes('gardening') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.pers_gardening_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_crop_label}</label>
                      <input
                        type="text"
                        value={gardeningCrop}
                        onChange={(e) => setGardeningCrop(e.target.value)}
                        placeholder={t.pers_crop_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_watering_label}</label>
                      <select
                        value={gardeningWatering}
                        onChange={(e) => setGardeningWatering(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Early Morning">{t.opt_early_morning}</option>
                        <option value="Late Evening">{t.opt_late_evening}</option>
                        <option value="Twice Daily">{t.opt_twice_daily}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Beach & Marine Role */}
              {selectedInterests.includes('beach') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Waves className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{t.pers_beach_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_beach_act_label}</label>
                      <select
                        value={beachActivity}
                        onChange={(e) => setBeachActivity(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="Swimming & Watersports">{t.opt_swimming}</option>
                        <option value="Coastal Walking / Relaxation">{t.opt_coastal_walk}</option>
                        <option value="Boating / Angling">{t.opt_boating}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_beach_timing_label}</label>
                      <input
                        type="text"
                        value={beachTiming}
                        onChange={(e) => setBeachTiming(e.target.value)}
                        placeholder={t.pers_beach_timing_placeholder}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 8. Health & Air Quality Role */}
              {selectedInterests.includes('health') && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>{t.pers_health_heading}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_health_cond_label}</label>
                      <select
                        value={healthCondition}
                        onChange={(e) => setHealthCondition(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="Asthma / Bronchial">{t.opt_asthma}</option>
                        <option value="Seasonal Dust / Pollen Allergy">{t.opt_allergy}</option>
                        <option value="Cardiac / Hypertension in Heat">{t.opt_cardiac}</option>
                        <option value="Sun / UV Sensitive Skin">{t.opt_skin}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">{t.pers_health_thresh_label}</label>
                      <select
                        value={healthThreshold}
                        onChange={(e) => setHealthThreshold(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="Moderate (AQI > 100)">{t.opt_aqi_mod}</option>
                        <option value="Poor (AQI > 200)">{t.opt_aqi_poor}</option>
                        <option value="Very Poor (AQI > 300)">{t.opt_aqi_very_poor}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {stage === 'general' ? t.pers_step1_footer : t.pers_step2_footer}
          </p>
          <div className="flex items-center gap-2">
            {stage === 'role_questions' ? (
              <button
                type="button"
                onClick={() => {
                  setStage('general');
                  setWarningMessage(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
              >
                {t.pers_btn_back}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
              >
                {t.pers_btn_cancel}
              </button>
            )}

            {stage === 'general' ? (
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="px-6 py-2.5 rounded-2xl bg-[#0FB88D] hover:bg-[#0da07b] text-white text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSaveAndApply}
                className="px-6 py-2.5 rounded-2xl bg-[#0FB88D] hover:bg-[#0da07b] text-white text-xs font-bold shadow-md shadow-teal-500/20 transition"
              >
                {t.pers_btn_save_apply}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
