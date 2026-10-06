import React from 'react';

interface CivicLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  tagline?: string | null;
  className?: string;
}

export const CivicLogoIcon: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const containerClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
    xl: 'w-14 h-14 rounded-3xl',
  };

  const iconSizes = {
    xs: 16,
    sm: 19,
    md: 22,
    lg: 26,
    xl: 34,
  };

  const px = iconSizes[size];

  return (
    <div
      className={`${containerClasses[size]} bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-sm shadow-blue-500/25 border border-white/20 shrink-0 select-none group-hover:scale-105 transition-transform duration-200 ${className}`}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-xs"
      >
        <defs>
          <linearGradient id="cf-shield-grad" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="cf-accent-grad" x1="10" y1="10" x2="22" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>

        {/* Outer Civic Shield / Location Pin Mark */}
        <path
          d="M16 3C10.48 3 6 7.48 6 13C6 19.8 14.5 27.8 15.36 28.59C15.73 28.94 16.27 28.94 16.64 28.59C17.5 27.8 26 19.8 26 13C26 7.48 21.52 3 16 3Z"
          fill="url(#cf-shield-grad)"
          fillOpacity="0.18"
          stroke="url(#cf-shield-grad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Civic Dome / Wrench / Checkmark Fusion */}
        <path
          d="M16 7.5L20.5 10.8V13.8H11.5V10.8L16 7.5Z"
          fill="white"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Civic Pillars */}
        <path
          d="M12.5 13.8V18.2M16 13.8V18.2M19.5 13.8V18.2"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Base Platform */}
        <path
          d="M10.5 18.2H21.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Dynamic Resolution Spark at bottom */}
        <circle cx="16" cy="22.5" r="1.4" fill="#67E8F9" />
      </svg>
    </div>
  );
};

export const CivicLogo: React.FC<CivicLogoProps> = ({
  size = 'md',
  showText = true,
  textClassName = '',
  tagline = 'Civic Grievance Platform',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <CivicLogoIcon size={size} />
      {showText && (
        <div className="flex flex-col min-w-0">
          <span className={`text-base sm:text-lg font-extrabold tracking-tight leading-tight text-slate-900 ${textClassName}`}>
            Civic<span className="text-blue-600">Fix</span>
          </span>
          {tagline && (
            <span className="text-[10px] text-slate-400 font-medium tracking-tight -mt-0.5 truncate">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
