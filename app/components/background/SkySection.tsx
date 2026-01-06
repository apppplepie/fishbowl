import React from 'react';
import { SkySectionProps } from '@/app/types/background';

const SkySection: React.FC<SkySectionProps> = ({ theme, children }) => {
  const isCustom = !theme.skyGradient.startsWith('bg-');

  return (
    <div
      className={`sky-section relative w-full overflow-hidden transition-all duration-1000 ease-in-out flex flex-col ${!isCustom ? theme.skyGradient : ''}`}
      style={isCustom ? { background: theme.skyGradient, minHeight: 'fit-content' } : { minHeight: 'fit-content' }}
    >
      {/* Abstract Sun/Light Source */}
      <div
        className="absolute top-[-10%] right-[10%] w-64 h-64 rounded-full blur-[80px] transition-colors duration-1000"
        style={{
          backgroundColor: theme.orbColors.sun,
          mixBlendMode: 'overlay',
          zIndex: 0
        }}
      />

      {/* Secondary atmospheric tint */}
      <div
        className="absolute top-[20%] left-[20%] w-96 h-96 rounded-full blur-[100px] transition-colors duration-1000"
        style={{ 
          backgroundColor: theme.orbColors.atmosphere,
          zIndex: 0
        }}
      />

      {/* Base overlay for smoothness */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-50 z-0" />

      {/* Content */}
      <div className="relative z-10 w-full flex-1">
        {children}
      </div>
    </div>
  );
};

export default SkySection;