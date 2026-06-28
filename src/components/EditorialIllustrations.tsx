import React from 'react';

// Illustration for Empty Tasks state: Clean cozy desk with plant, book, coffee/warm mug
export const EmptyTasksIllustration: React.FC<{ className?: string }> = ({ className = "w-48 h-48" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background soft circle */}
      <circle cx="100" cy="100" r="75" fill="#F5F0EB" />
      <circle cx="100" cy="100" r="75" stroke="#292524" strokeWidth="2.5" strokeDasharray="6 6" />

      {/* Desk surface */}
      <path d="M25 145 H175" stroke="#292524" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 145 V170" stroke="#292524" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M155 145 V170" stroke="#292524" strokeWidth="3.5" strokeLinecap="round" />

      {/* Potted Plant */}
      {/* Pot */}
      <path d="M115 145 L118 120 H132 L135 145 Z" fill="#C4705A" stroke="#292524" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Plant stems and leaves */}
      <path d="M125 120 Q122 100 112 95 Q105 105 125 118" fill="#5B6B4F" stroke="#292524" strokeWidth="2" strokeLinejoin="round" />
      <path d="M127 120 Q135 95 145 92 Q148 105 127 118" fill="#5B6B4F" stroke="#292524" strokeWidth="2" strokeLinejoin="round" />
      <path d="M125 120 Q125 80 126 75 Q132 85 126 100" fill="#5B6B4F" stroke="#292524" strokeWidth="2" strokeLinejoin="round" />

      {/* Stack of books/planners */}
      {/* Book 1 */}
      <rect x="50" y="133" width="45" height="12" rx="2" fill="#FAF8F5" stroke="#292524" strokeWidth="2.5" />
      <path d="M50 137 H85" stroke="#292524" strokeWidth="1.5" />
      {/* Book 2 (Tilted on top) */}
      <g transform="rotate(-8, 65, 125)">
        <rect x="52" y="121" width="40" height="12" rx="2" fill="#5B6B4F" stroke="#292524" strokeWidth="2.5" />
        <rect x="84" y="121" width="8" height="12" fill="#C4705A" stroke="#292524" strokeWidth="2" />
      </g>

      {/* Cozy Warm mug with steam */}
      <path d="M100 145 V133 H110 V145 Z" fill="#FAF8F5" stroke="#292524" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Mug handle */}
      <path d="M110 136 C113 136 114 142 110 142" stroke="#292524" strokeWidth="2" />
      {/* Steam lines */}
      <path d="M102 128 Q104 125 102 122" stroke="#C4705A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M106 129 Q108 126 106 123" stroke="#C4705A" strokeWidth="1.5" strokeLinecap="round" />

      {/* Floating Sparkles of productivity / peace */}
      <g transform="translate(65, 55)">
        <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#C9A96E" stroke="#292524" strokeWidth="1" />
      </g>
      <g transform="translate(145, 65) scale(0.7)">
        <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#C4705A" stroke="#292524" strokeWidth="1" />
      </g>
      <g transform="translate(45, 95) scale(0.5)">
        <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#5B6B4F" stroke="#292524" strokeWidth="1" />
      </g>
    </svg>
  );
};

// Illustration for Empty Calendar/Schedule state: Abstract celestial clock/calendar grid
export const EmptyCalendarIllustration: React.FC<{ className?: string }> = ({ className = "w-48 h-48" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background soft circle */}
      <circle cx="100" cy="100" r="75" fill="#F5F0EB" />
      <circle cx="100" cy="100" r="75" stroke="#292524" strokeWidth="2.5" />

      {/* Abstract Sun & Moon Dial (Guardian celestial indicator) */}
      {/* Moon half */}
      <path d="M100 45 C130.376 45 155 69.6243 155 100 C155 130.376 130.376 155 100 155 Z" fill="#5B6B4F" fillOpacity="0.1" />
      
      {/* Calendar Grid Sheet overlay */}
      <g transform="translate(55, 65)">
        {/* Main plate */}
        <rect x="0" y="0" width="90" height="75" rx="8" fill="#FAF8F5" stroke="#292524" strokeWidth="2.5" />
        
        {/* Binder rings */}
        <path d="M20 -6 V4" stroke="#292524" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M45 -6 V4" stroke="#292524" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M70 -6 V4" stroke="#292524" strokeWidth="2.5" strokeLinecap="round" />

        {/* Calendar interior grid lines */}
        <line x1="12" y1="20" x2="78" y2="20" stroke="#292524" strokeWidth="2" strokeLinecap="round" />
        
        {/* Tiny grid squares */}
        <rect x="15" y="32" width="10" height="8" rx="1.5" fill="#F5F0EB" stroke="#292524" strokeWidth="1.5" />
        <rect x="31" y="32" width="10" height="8" rx="1.5" fill="#F5F0EB" stroke="#292524" strokeWidth="1.5" />
        <rect x="47" y="32" width="10" height="8" rx="1.5" fill="#5B6B4F" stroke="#292524" strokeWidth="1.5" />
        <rect x="63" y="32" width="10" height="8" rx="1.5" fill="#FAF8F5" stroke="#292524" strokeWidth="1.5" />

        <rect x="15" y="48" width="10" height="8" rx="1.5" fill="#FAF8F5" stroke="#292524" strokeWidth="1.5" />
        <rect x="31" y="48" width="10" height="8" rx="1.5" fill="#FAF8F5" stroke="#292524" strokeWidth="1.5" />
        <rect x="47" y="48" width="10" height="8" rx="1.5" fill="#FAF8F5" stroke="#292524" strokeWidth="1.5" />
        <rect x="63" y="48" width="10" height="8" rx="1.5" fill="#C4705A" stroke="#292524" strokeWidth="1.5" />
      </g>

      {/* Hour/Minute hands sweeping gracefully outside */}
      <line x1="100" y1="100" x2="140" y2="75" stroke="#292524" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="5" fill="#FAF8F5" stroke="#292524" strokeWidth="2.5" />

      {/* Little star accents */}
      <g transform="translate(150, 50)">
        <path d="M0 -5 L1 -1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1 -1 Z" fill="#C4705A" />
      </g>
      <g transform="translate(45, 140)">
        <path d="M0 -4 L0.8 -0.8 L4 0 L0.8 0.8 L0 4 L-0.8 0.8 L-4 0 L-0.8 -0.8 Z" fill="#C9A96E" />
      </g>
    </svg>
  );
};
