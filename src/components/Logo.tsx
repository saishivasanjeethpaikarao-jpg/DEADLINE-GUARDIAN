import React from 'react';

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon';
  className?: string;
  isDarkBg?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  className = '', 
  isDarkBg = false 
}) => {
  // Charcoal text color matching #292524 (on light bg) or warm parchment #F5F1EB (on dark bg)
  const textColor = isDarkBg ? 'text-[#F5F1EB]' : 'text-[#292524]';
  const mutedTextColor = isDarkBg ? 'text-[#FAF8F5]/60' : 'text-[#292524]/60';
  const starColor = 'text-[#C4705A]'; // terracotta/gold secondary accent

  // 4-point sparkle SVG path
  const SparkleIcon = ({ size = 24, className = "" }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={`inline-block ${className}`}
    >
      <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        {/* Monogram Monopair with absolute positioning to overlap elegantly */}
        <div className="relative w-16 h-16 flex items-center justify-center font-serif">
          {/* Letter D */}
          <span className={`absolute left-0 text-5xl font-extrabold tracking-tight ${textColor} leading-none transition-all`}>
            D
          </span>
          {/* Letter G (overlaps the D) */}
          <span className={`absolute right-0 text-5xl font-extrabold tracking-tight ${textColor} leading-none mix-blend-multiply dark:mix-blend-normal opacity-95 translate-x-1`}>
            G
          </span>
          {/* Monogram gold sparkle inside G */}
          <div className="absolute right-3 top-6 transform translate-x-1.5 translate-y-0.5 animate-pulse">
            <SparkleIcon size={12} className={starColor} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {/* Compact Monogram logo */}
        <div className="relative w-11 h-11 flex items-center justify-center font-serif select-none">
          <span className={`absolute left-0.5 text-3xl font-black ${textColor} leading-none`}>
            D
          </span>
          <span className={`absolute right-0.5 text-3xl font-black ${textColor} leading-none opacity-95 translate-x-0.5`}>
            G
          </span>
          <div className="absolute right-2.5 top-4 transform translate-x-1 translate-y-0.5">
            <SparkleIcon size={8} className={starColor} />
          </div>
        </div>
        <div className="text-left border-l border-stone-300 dark:border-stone-700/50 pl-3 hidden sm:block">
          <h1 className={`font-serif font-black text-xs uppercase tracking-[0.25em] ${textColor} leading-none`}>
            DEADLINE
          </h1>
          <h1 className={`font-serif font-black text-xs uppercase tracking-[0.25em] ${textColor} leading-none mt-1`}>
            GUARDIAN
          </h1>
          <span className="font-mono text-[7px] text-[#C4705A] uppercase tracking-[0.15em] font-bold block mt-1">
            AI-POWERED
          </span>
        </div>
      </div>
    );
  }

  // DEFAULT: FULL BRAND LOGO (Exactly matches the user's requested layout)
  return (
    <div className={`flex flex-col items-center text-center select-none p-4 ${className}`}>
      
      {/* 1. Large elegant overlapping monogram */}
      <div className="relative w-36 h-32 flex items-center justify-center font-serif mb-4">
        {/* Left Letter D */}
        <span className={`absolute left-4 text-9xl font-normal ${textColor} leading-none tracking-tight`}>
          D
        </span>
        {/* Right Letter G */}
        <span className={`absolute right-4 text-9xl font-normal ${textColor} leading-none tracking-tight opacity-95 translate-x-2`}>
          G
        </span>
        {/* Elegant gold star in G's negative space */}
        <div className="absolute right-[44px] top-[50px] transform translate-y-1 hover:scale-125 transition-transform duration-300">
          <SparkleIcon size={26} className={`${starColor} fill-current drop-shadow-sm`} />
        </div>
      </div>

      {/* 2. Main Title in spaced serif lettering */}
      <h2 className={`font-serif text-2xl md:text-3.5xl font-medium tracking-[0.3em] ${textColor} uppercase pl-[0.3em] leading-none`}>
        DEADLINE GUARDIAN
      </h2>

      {/* 3. Horizontal line with central star */}
      <div className="w-full max-w-[280px] flex items-center justify-between gap-4 py-4 opacity-75">
        <div className="h-[1px] bg-gradient-to-r from-transparent to-stone-400 dark:to-stone-600 flex-1" />
        <SparkleIcon size={12} className={`${starColor} transform rotate-45`} />
        <div className="h-[1px] bg-gradient-to-l from-transparent to-stone-400 dark:to-stone-600 flex-1" />
      </div>

      {/* 4. Sub-tagline */}
      <p className="font-serif italic text-xs md:text-sm tracking-[0.2em] uppercase font-semibold text-[#C4705A] pl-[0.2em] leading-none">
        AI-POWERED. DEADLINE-PROOF.
      </p>

    </div>
  );
};

export default Logo;
