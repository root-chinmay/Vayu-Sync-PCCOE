'use client';

import React from 'react';
import { Home, Map, Activity, Bell, MoreHorizontal, SlidersHorizontal, Sparkles } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenPersonalizeModal: () => void;
  activeRoleTitle?: string;
  alertCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPersonalizeModal,
  activeRoleTitle = 'Activity',
  alertCount = 0,
}) => {
  return (
    <nav 
      aria-label="Bottom Navigation" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl px-4 py-2 flex items-center justify-around max-w-lg mx-auto sm:rounded-t-3xl sm:border-x sm:bottom-0 shadow-2xl"
    >
      {/* 1. Home */}
      <button
        onClick={() => onSelectTab('overview')}
        className={`flex flex-col items-center justify-center p-1.5 transition ${
          activeTab === 'overview'
            ? 'text-[#0FB88D] font-bold'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Home</span>
      </button>

      {/* 2. Map */}
      <button
        onClick={() => onSelectTab('radar')}
        className={`flex flex-col items-center justify-center p-1.5 transition ${
          activeTab === 'radar'
            ? 'text-[#0FB88D] font-bold'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Map</span>
      </button>

      {/* 3. Center Activity Button (Elevated Teal Circle) */}
      <button
        onClick={() => onSelectTab('activity')}
        className={`relative -top-4 flex flex-col items-center justify-center transition group`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 active:scale-95 ${
          activeTab === 'activity'
            ? 'bg-[#0FB88D] text-white shadow-teal-500/30'
            : 'bg-white dark:bg-slate-800 text-[#0FB88D] border-2 border-[#0FB88D] shadow-slate-200 dark:shadow-none'
        }`}>
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <span className={`text-[10px] font-bold mt-1 ${activeTab === 'activity' ? 'text-[#0FB88D]' : 'text-slate-500 dark:text-slate-400'}`}>
          {activeRoleTitle}
        </span>
      </button>

      {/* 4. Alerts */}
      <button
        onClick={() => onSelectTab('warnings')}
        className={`relative flex flex-col items-center justify-center p-1.5 transition ${
          activeTab === 'warnings'
            ? 'text-[#0FB88D] font-bold'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          )}
        </div>
        <span className="text-[10px] mt-0.5">Alerts</span>
      </button>

      {/* 5. More / Personalize */}
      <button
        onClick={onOpenPersonalizeModal}
        className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-[#0FB88D] dark:hover:text-white transition font-medium"
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
};
