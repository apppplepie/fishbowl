'use client';

import React, { useEffect } from 'react';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import SkySection from './background/SkySection';
import WaterSection from './background/WaterSection';
import WaveSeparator from './background/WaveSeparator';

function PageShell({ children }: { children: React.ReactNode }) {
  const { config } = usePageShell();
  const { currentFishbowlTheme } = useAppTheme(); // 直接读取全局主题
  const { isMobile } = useResponsive(); // 响应式判断

  // 计算侧边栏偏移量
  const sidebarOffset = !isMobile && config.sidebarExpanded 
    ? (config.sidebarWidth || 0) 
    : 0;

  console.log('[PageShell] 组件开始渲染:', {
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
    isMobile,
    sidebarOffset,
  });

  const defaultTheme = {
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

  // 主题优先级：页面覆盖 > 全局主题 > 默认主题
  const currentTheme = config.themeOverride || currentFishbowlTheme || defaultTheme;

  console.log('[PageShell] 使用的主题:', {
    themeId: currentTheme.id,
    themeName: currentTheme.name,
    themeSource: config.themeOverride ? 'page override' : (currentFishbowlTheme ? 'global theme' : 'default fallback')
  });

  // 监听配置和主题变化
  useEffect(() => {
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
      sidebarOffset,
    });
  }, [config, currentFishbowlTheme, sidebarOffset]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      minHeight: '100vh',
      paddingTop: '45px', // 为 Header 留出空间
      marginLeft: sidebarOffset, // 侧边栏偏移
      transition: 'margin-left 0.3s ease', // 流畅过渡
    }}>
      {/* Box1 - 永远显示*/}
      <div className="page-shell-box1" style={{ position: 'relative', width: '100%', zIndex: 1 }}>
        <SkySection theme={currentTheme}>
          <div
            style={{
              padding: '20px',
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '100px',
              ...config.box1Style,
            }}
          >
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

      {/* Box2 - 直接渲染 children，无闭包问题 */}
      <div
        className="page-shell-box2"
        style={{
          flex: '1 0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <WaterSection theme={currentTheme}>
          <div
            style={{
              padding: '40px 20px 20px',
              minHeight: '300px',
              width: '100%',
              boxSizing: 'border-box',
              flex: '1 0 auto',
              ...config.box2Style,
            }}
          >
            {children}
          </div>
        </WaterSection>
      </div>
    </div>
  );
}

export default React.memo(PageShell);
