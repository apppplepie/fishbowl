'use client';

import React, { useEffect, useMemo, useRef } from 'react';
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
  buttonGradient: 'linear-gradient(135deg, rgb(156, 163, 175), rgb(107, 114, 128), rgb(75, 85, 99))',
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

/** box1 默认固定高度，壳层常驻时无需根据内容测量 */
const DEFAULT_BOX1_HEIGHT = '20vh';

function PageShell({ children }: { children: React.ReactNode }) {
  const { config } = usePageShell();
  const { currentFishbowlTheme } = useAppTheme();
  const { isMobile } = useResponsive();

  const sidebarOffset = useMemo(() => {
    return !isMobile && config.sidebarExpanded ? (config.sidebarWidth || 0) : 0;
  }, [isMobile, config.sidebarExpanded, config.sidebarWidth]);

  const currentTheme = useMemo(() => {
    return config.themeOverride || currentFishbowlTheme || DEFAULT_THEME;
  }, [config.themeOverride, currentFishbowlTheme]);

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useScrollContainer = config.scrollSnapVh != null && !config.hideBox1;

  const containerStyle = useMemo(() => {
    const base = {
      width: sidebarOffset ? `calc(100% - ${sidebarOffset}px)` : '100%',
      marginLeft: sidebarOffset,
      transition: 'width 0.3s ease, margin-left 0.3s ease',
      background: currentTheme?.skyGradient || DEFAULT_THEME.skyGradient,
    } as const;
    if (useScrollContainer) {
      return {
        ...base,
        position: 'fixed' as const,
        top: '45px',
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto' as const,
        paddingTop: 0,
      };
    }
    return {
      ...base,
      position: 'relative' as const,
      minHeight: '100vh',
      paddingTop: '45px',
    };
  }, [sidebarOffset, currentTheme, useScrollContainer]);

  // 进入页：父容器滚到 scrollSnapVh 位置，使「整页从上往下 15vh 的那根线」贴住视口顶部（与 box1 高度无关）
  useEffect(() => {
    if (!useScrollContainer || typeof config.scrollSnapVh !== 'number') return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const top = window.innerHeight * (config.scrollSnapVh / 100);
    el.scrollTo({ top, behavior: 'smooth' });
  }, [useScrollContainer, config.scrollSnapVh]);

  // 唯一吸附：父容器内 scrollTop = scrollSnapVh（整页从上往下 15vh 的那根线贴顶）；0~阈值内松手都吸回该位置
  const snapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSnappingRef = useRef(false);
  useEffect(() => {
    if (!useScrollContainer || typeof config.scrollSnapVh !== 'number') return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const vh = config.scrollSnapVh;
    const getSnapTop = () => Math.round(window.innerHeight * (vh / 100));
    const getCloseMax = () => Math.round(window.innerHeight * 0.25);

    const checkSnap = () => {
      if (isSnappingRef.current) return;
      const top = el.scrollTop;
      const snapTop = getSnapTop();
      const closeMax = getCloseMax();
      const inZone = top <= closeMax && Math.abs(top - snapTop) > 2;
      const aboveLine = top < snapTop;
      if (inZone || aboveLine) {
        isSnappingRef.current = true;
        el.scrollTo({ top: snapTop, behavior: 'smooth' });
        setTimeout(() => { isSnappingRef.current = false; }, 400);
      }
    };

    const onScroll = () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(checkSnap, 80);
    };
    const onTouchEnd = () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(checkSnap, 80);
    };
    const onScrollEnd = () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      checkSnap();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('scrollend', onScrollEnd);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, [useScrollContainer, config.scrollSnapVh]);

  // box1 高度：由 box1Height 或默认值单独决定，与 scrollSnapVh（吸附滚动位置）无关
  const box1Style = useMemo(() => ({
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box' as const,
    height: config.hideBox1 ? '0px' : (config.box1Height ?? DEFAULT_BOX1_HEIGHT),
    overflow: 'hidden' as const,
    ...config.box1Style,
  }), [config.box1Height, config.box1Style, config.hideBox1]);

  // box1 内容区：最多两行，超出显示省略号（不滚动）
  const box1InnerStyle = useMemo(() => ({
    display: '-webkit-box' as const,
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  }), []);

  // box2 内部样式（确保内容层级在 wave 之上，且有安全 top padding）
  const box2InnerStyle = useMemo(() => {
    // 1. 基础样式定义
    const baseStyle = {
      padding: '40px 20px 20px',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box' as const,
      flex: '1 0 auto',
      position: 'relative' as const,
      zIndex: 20,
      // --- 关键补丁：强制布局模式为列式拉伸，防止坍缩 ---
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch' as const, // 强制子元素（1400px层）宽度拉满
    };
  
    // 2. 合并配置，并确保 alignItems 不会被 config 里的 center 覆盖
    const mergedStyle = { ...baseStyle, ...config.box2Style };
  
    // 3. 强制校验：如果配置里误传了 center，我们在这里强行纠正回 stretch
    if (mergedStyle.alignItems === 'center') {
      mergedStyle.alignItems = 'stretch';
    }
  
    return mergedStyle;
  }, [config.box2Style, currentTheme?.pageLayout?.containerPaddingTop]);

  return (
    <div ref={scrollContainerRef} style={containerStyle}>
      {/* Box1 - 高度由 box1Height/默认值决定；吸附位置由 scrollSnapVh 单独控制（父容器 scrollTop） */}
      <div className="page-shell-box1" style={{ position: 'relative', width: '100%', zIndex: 1 }}>
        <SkySection theme={currentTheme}>
          <div
            style={{
              ...box1Style,
              display: 'flex',
              flexDirection: 'column',
            }}
            aria-hidden={config.hideBox1 ? 'true' : 'false'}
          >
            <div style={box1InnerStyle} className="page-shell-box1-inner">
              {config.box1Content}
            </div>
          </div>
        </SkySection>
      </div>

      {/* 波浪分隔器 - zIndex 高于 box2，波浪不被正文遮住；侧边栏/遮罩用 Portal 挂 body 盖在波浪上 */}
      <div
        className="wave-section"
        style={{
          position: 'relative',
          height: '80px',
          marginTop: '-40px',
          marginBottom: '-40px',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        <WaveSeparator colors={currentTheme.waveColors} />
      </div>

      {/* Box2 - zIndex 低于波浪，波浪可见；抽屉/弹窗通过 Portal 挂 body 在波浪之上 */}
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
          paddingTop: currentTheme?.pageLayout?.containerPaddingTop || '100px',
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
