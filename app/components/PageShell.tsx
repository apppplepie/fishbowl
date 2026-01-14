'use client';

import React, { useEffect } from 'react';
import { usePageShell } from '@/app/contexts/PageShellContext';
import SkySection from './background/SkySection';
import WaterSection from './background/WaterSection';
import WaveSeparator from './background/WaveSeparator';

function PageShell({ children }: { children: React.ReactNode }) {
  const { config } = usePageShell();

  console.log('[PageShell] 组件开始渲染，接收到 config:', {
    config: {
      hasTheme: !!config.theme,
      theme: config.theme ? {
        id: config.theme.id,
        name: config.theme.name,
        hasSkyGradient: !!config.theme.skyGradient,
        hasWaterGradient: !!config.theme.waterGradient,
        skyGradient: config.theme.skyGradient?.substring(0, 50) + '...',
        waterGradient: config.theme.waterGradient?.substring(0, 50) + '...'
      } : null,
      hideBox1: config.hideBox1,
      hasBox1Content: !!config.box1Content,
      box1Style: config.box1Style,
      box2Style: config.box2Style,
    }
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

  const currentTheme = config.theme || defaultTheme;

  console.log('[PageShell] 使用的主题:', {
    isUsingDefault: !config.theme,
    currentThemeId: currentTheme.id,
    currentThemeName: currentTheme.name,
    themeSource: config.theme ? 'from config' : 'default fallback'
  });

  // 监听配置变化
  useEffect(() => {
    console.log('[PageShell] config 发生变化:', {
      config: {
        hasTheme: !!config.theme,
        theme: config.theme ? {
          id: config.theme.id,
          name: config.theme.name,
          hasSkyGradient: !!config.theme.skyGradient,
          hasWaterGradient: !!config.theme.waterGradient
        } : null,
        hideBox1: config.hideBox1,
        hasBox1Content: !!config.box1Content,
        box1Style: config.box1Style,
        box2Style: config.box2Style,
      }
    });
  }, [config]);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      {/* Box1 - 只在有内容或不隐藏时显示 */}
      {!config.hideBox1 && (
        <div className="page-shell-box1" style={{ position: 'relative', width: '100%', zIndex: 1 }}>
          <SkySection theme={currentTheme}>
            <div
              style={{
                padding: '20px',
                width: '100%',
                boxSizing: 'border-box',
                minHeight: config.box1Content ? '160px' : '0px',
                ...config.box1Style,
              }}
            >
              {config.box1Content}
            </div>
          </SkySection>
        </div>
      )}

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
