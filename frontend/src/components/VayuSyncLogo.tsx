'use client';

import React from 'react';

interface VayuSyncLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
}

export const VayuSyncLogo: React.FC<VayuSyncLogoProps> = ({
  className = '',
  size = 40,
  showText = true,
  showTagline = false,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Stylized VayuSync Wave & Sun Mark */}
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Glowing Sun circle in background */}
          <circle cx="68" cy="28" r="16" fill="#FBBF24" />
          
          {/* Top wave layer (Sky Cyan #38BDF8) */}
          <path 
            d="M15 48C28 36 46 36 60 48C74 60 88 56 94 48" 
            stroke="#38BDF8" 
            strokeWidth="9" 
            strokeLinecap="round" 
          />
          
          {/* Middle wave layer (Teal #0FB88D) */}
          <path 
            d="M8 64C22 52 42 50 58 64C72 76 86 70 94 62" 
            stroke="#0FB88D" 
            strokeWidth="10" 
            strokeLinecap="round" 
          />

          {/* Deep Navy baseline fluid curve (#0B1F33) */}
          <path 
            d="M18 78C30 70 48 68 62 78C74 86 84 82 90 76" 
            stroke="#0B1F33" 
            strokeWidth="8" 
            strokeLinecap="round" 
            className="dark:stroke-sky-200"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#0B1F33] dark:text-white font-sans">
              Vayu<span className="text-[#0FB88D]">Sync</span>
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Your Weather. Your Way.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
