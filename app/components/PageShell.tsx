'use client';

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
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

const TRANSITION_MS = 360; // 动画时长（ms），与 CSS transition 保持一致

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

  // Debug 日志（开发环境）
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

  // container fallback background（确保首屏至少有背景）
  const containerStyle = useMemo(() => ({
    position: 'relative' as const,
    width: '100%',
    minHeight: '100vh',
    paddingTop: '45px',
    marginLeft: sidebarOffset,
    transition: 'margin-left 0.3s ease',
    background: currentTheme?.skyGradient || DEFAULT_THEME.skyGradient,
  }), [sidebarOffset, currentTheme]);

  // box1 动画高度的状态（数字 px 或 'auto'）
  const box1InnerRef = useRef<HTMLDivElement | null>(null);
  const [box1Height, setBox1Height] = useState<number | 'auto'>(() => {
    // 初始采用最小值，避免完全塌陷
    return config.box1Content ? 100 : 0;
  });

  // 计算 box1 style：高度由 box1Height 控制，overflow:hidden 防止溢出
  const box1Style = useMemo(() => ({
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box' as const,
    height: box1Height === 'auto' ? 'auto' : `${box1Height}px`,
    overflow: 'hidden' as const,
    transition: `height ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    ...config.box1Style,
  }), [box1Height, config.box1Style]);

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

  // useLayoutEffect 用于同步测量，避免闪烁
  useLayoutEffect(() => {
    const el = box1InnerRef.current;
    if (!el) {
      // 如果没有内层元素，直接 collapse或保持初始
      setBox1Height(config.box1Content ? 100 : 0);
      return;
    }

    // 当内容变化时：测量并触发平滑过渡
    // 如果有内容（展开）
    if (config.box1Content) {
      // 当前实际高度（可能为 0 或旧值）
      const currentHeight = el.getBoundingClientRect().height || 0;
      // 先把外壳锁为当前高度，确保 transition 从数值开始
      setBox1Height(currentHeight || 0);

      // 在下一个帧设置目标高度（scrollHeight）
      requestAnimationFrame(() => {
        const target = el.scrollHeight || 0;
        setBox1Height(target);

        // 过渡完成后释放为 auto，以便内部内容自适应（避免未来内容变化触发高度不对）
        const t = window.setTimeout(() => {
          setBox1Height('auto');
        }, TRANSITION_MS + 30);

        // cleanup：如果 content 再次变化，清理定时器
        return () => clearTimeout(t);
      });
    } else {
      // 关闭/收起情形：从当前高度过渡到 0
      const currentHeight = el.getBoundingClientRect().height || 0;
      setBox1Height(currentHeight);
      requestAnimationFrame(() => {
        setBox1Height(0);
      });
    }
    // 这里希望在 config.box1Content 变化时触发
  }, [config.box1Content]);

  return (
    <div style={containerStyle}>
      {/* Box1 - 根据内容自动调整高度（外壳动画） */}
      <div className="page-shell-box1" style={{ position: 'relative', width: '100%', zIndex: 1 }}>
        <SkySection theme={currentTheme}>
          <div style={box1Style} aria-hidden={config.hideBox1 ? 'true' : 'false'}>
            {/* 内层真实内容（用于测量高度） */}
            <div ref={box1InnerRef}>
              {config.box1Content}
            </div>
          </div>
        </SkySection>
      </div>

      {/* 波浪分隔器 - 将 zIndex 降低，避免覆盖正文 */}
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
