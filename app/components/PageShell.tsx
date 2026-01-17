'use client';

import React, { useEffect, useMemo } from 'react';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import SkySection from './background/SkySection';
import WaterSection from './background/WaterSection';
import WaveSeparator from './background/WaveSeparator';

// 将 defaultTheme 移到组件外部，避免每次渲染都创建新对象
const DEFAULT_THEME = {
  id: 'default',
  name: 'Default',
  pageBg: 'bg-gray-50',
  skyGradient: 'linear-gradient(to bottom, #87CEEB, #4682B4)',
  waterGradient: 'linear-gradient(to bottom, #4682B4, #1E3A5F)',
  orbColors: {
    sun: 'rgba(255, 255, 255, 0.3)',
    atmosphere: 'rgba(255, 255, 255, 0.2)',
    waterLight: 'rgba(255, 255, 255, 0.2)',
    waterDeep: 'rgba(0, 0, 0, 0.1)',
  },
  waveColors: [
    'rgba(255, 255, 255, 0.7)',
    'rgba(255, 255, 255, 0.5)',
    'rgba(255, 255, 255, 0.6)',
    'rgba(255, 255, 255, 0.2)',
  ],
  pageLayout: {
    box1Bg: 'transparent',
    box2Bg: '#f5f5f5',
    containerPaddingTop: '0px',
  }
};

function PageShell({ children }: { children: React.ReactNode }) {
  const { config } = usePageShell();
  const { currentFishbowlTheme } = useAppTheme();
  const { isMobile } = useResponsive();

  // Memo 化侧边栏偏移量，避免 useEffect 循环触发
  const sidebarOffset = useMemo(() => {
    return !isMobile && config.sidebarExpanded ? (config.sidebarWidth || 0) : 0;
  }, [isMobile, config.sidebarExpanded, config.sidebarWidth]);

  // Memo 化主题计算，只在相关依赖变化时重新计算
  const currentTheme = useMemo(() => {
    return config.themeOverride || currentFishbowlTheme || DEFAULT_THEME;
  }, [config.themeOverride, currentFishbowlTheme]);

  // 开发环境的调试日志
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PageShell] config 或主题发生变化:', {
        globalTheme: currentFishbowlTheme ? {
          id: currentFishbowlTheme.id,
          name: currentFishbowlTheme.name,
        } : null,
        config: {
          hideBox1: config.hideBox1,
          hasBox1Content: !!config.box1Content,
          hasBox1Style: !!config.box1Style,
          hasBox2Style: !!config.box2Style,
          hasThemeOverride: !!config.themeOverride,
          sidebarWidth: config.sidebarWidth,
          sidebarExpanded: config.sidebarExpanded,
        },
      });
    }
  }, [config, currentFishbowlTheme]);

  // Memo 化所有 style 对象，避免每次渲染都创建新引用
  const containerStyle = useMemo(() => ({
    position: 'relative' as const,
    width: '100%',
    minHeight: '100vh',
    paddingTop: '45px',
    marginLeft: sidebarOffset,
    transition: 'margin-left 0.3s ease',
  }), [sidebarOffset]);

  const box1Style = useMemo(() => ({
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box' as const,
    minHeight: config.box1Content ? '100px' : '0px', // 无内容时高度为0
    ...config.box1Style,
  }), [config.box1Content, config.box1Style]);

  const box2InnerStyle = useMemo(() => ({
    padding: '40px 20px 20px',
    minHeight: '1000px',
    width: '100%',
    boxSizing: 'border-box' as const,
    flex: '1 0 auto',
    ...config.box2Style,
  }), [config.box2Style]);

  return (
    <div style={containerStyle}>
      {/* Box1 - 根据内容自动调整高度 */}
      <div className="page-shell-box1" style={{ position: 'relative', width: '100%', zIndex: 1 }}>
        <SkySection theme={currentTheme}>
          <div style={box1Style}>
            {config.box1Content}
          </div>
        </SkySection>
      </div>

      {/* 波浪分隔器 */}
      <div
        className="wave-section"
        style={{
          position: 'relative',
          height: '80px',
          marginTop: '-40px',
          marginBottom: '-40px',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <WaveSeparator colors={currentTheme.waveColors} />
      </div>

      {/* Box2 - 直接渲染 children */}
      <div
        className="page-shell-box2"
        style={{
          flex: '1 0 auto',
          width: '100%',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <WaterSection theme={currentTheme}>
          <div style={box2InnerStyle}>
            {children}
          </div>
        </WaterSection>
      </div>
    </div>
  );
}

export default React.memo(PageShell);
