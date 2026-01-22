import React from 'react';
import { SkySectionProps } from '@/app/types/background';

/**
 * SkySection - 简化版
 * 只保留渐变背景，移除装饰层以提升性能
 */
const SkySection: React.FC<SkySectionProps> = ({ theme, children }) => {
  const isCustom = !theme.skyGradient.startsWith('bg-');

  return (
    <div
      className={`sky-section relative w-full transition-colors duration-300 ease-in-out ${!isCustom ? theme.skyGradient : ''}`}
      style={isCustom ? { background: theme.skyGradient } : undefined}
    >
      {children}
    </div>
  );
};

export default React.memo(SkySection);