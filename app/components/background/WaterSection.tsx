import React from 'react';
import { WaterSectionProps } from '@/app/types/background';

/**
 * WaterSection - 简化版
 * 只保留渐变背景，移除装饰层以提升性能
 */
const WaterSection: React.FC<WaterSectionProps> = ({ theme, children }) => {
  const isCustom = !theme.waterGradient.startsWith('bg-');

  return (
    <div
      className={`water-section relative w-full transition-colors duration-300 ease-in-out flex flex-col ${!isCustom ? theme.waterGradient : ''}`}
      style={isCustom ? { background: theme.waterGradient, minHeight: '200px', flex: 1 } : { minHeight: '200px', flex: 1 }}
    >
      {children}
    </div>
  );
};

export default React.memo(WaterSection);