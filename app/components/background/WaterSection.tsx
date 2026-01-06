import React from 'react';
import { WaterSectionProps } from '@/app/types/background';

const WaterSection: React.FC<WaterSectionProps> = ({ theme, children }) => {
  const isCustom = !theme.waterGradient.startsWith('bg-');

  return (
    <div
      className={`water-section relative w-full overflow-hidden transition-all duration-1000 ease-in-out flex flex-col ${!isCustom ? theme.waterGradient : ''}`}
      style={isCustom ? { background: theme.waterGradient, minHeight: '200px', flex: 1 } : { minHeight: '200px', flex: 1 }}
    >
      {/* Abstract Underwater Light Volume */}
      <div
        className="absolute -top-[20%] left-[30%] w-[50%] h-full blur-[60px] transform -rotate-12 transition-colors duration-1000"
        style={{
          backgroundColor: theme.orbColors.waterLight,
          mixBlendMode: 'screen',
          zIndex: 0
        }}
      />

      {/* Deep water accent */}
      <div
        className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full blur-[80px] transition-colors duration-1000"
        style={{ 
          backgroundColor: theme.orbColors.waterDeep,
          zIndex: 0
        }}
      />

      {/* Depth Gradients Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10 w-full flex-1">
        {children}
      </div>
    </div>
  );
};

export default WaterSection;