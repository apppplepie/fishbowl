'use client';

import { ReactNode, CSSProperties, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { Theme } from '@/app/types/background';
import { usePageShell } from '@/app/contexts/PageShellContext';
import SkySection from './background/SkySection';
import WaterSection from './background/WaterSection';
import WaveSeparator from './background/WaveSeparator';

interface PageLayoutProps {
  children: ReactNode;
  theme?: Theme; // 主题对象，包含天空和水体渐变
  box1BgColor?: string; // 盒模型1的背景色（已废弃，使用theme.skyGradient）
  box2BgColor?: string; // 盒模型2的背景色（已废弃，使用theme.waterGradient）
  box1Content?: ReactNode; // 盒模型1的内容（可选）
  box1Style?: CSSProperties; // 自定义盒模型1样式
  box2Style?: CSSProperties; // 自定义盒模型2样式
  containerPaddingTop?: string; // 自定义容器顶部padding（默认45px）
  hideBox1?: boolean; // 是否隐藏盒模型1
}

export default function PageLayout({
  children,
  theme,
  box1BgColor = '#4CAF50',
  box2BgColor = '#f5f5f5',
  box1Content,
  box1Style,
  box2Style,
  containerPaddingTop,
  hideBox1 = false,
}: PageLayoutProps) {
  const { isMobile } = useResponsive();
  const pathname = usePathname();
  const { setConfig } = usePageShell();

  // 阶段 4：如果 Shell 已启用（试点页面），则不显示 box1/box2，不渲染内容
  // Shell 会负责显示 box1/box2 背景和内容
  // 注意：新模式下，页面直接写入 Context，PageLayout 不再同步配置
  const isShellEnabled = pathname === '/gallery';

  // 辅助函数：处理背景色/渐变，避免重复包装 linear-gradient
  const processBg = (bg: string) => {
    if (!bg) return 'transparent';
    if (bg.startsWith('linear-gradient') || bg.startsWith('rgba') || bg.startsWith('rgb') || bg.startsWith('bg-')) {
      return bg;
    }
    // 如果是纯色（如 #fff 或 red），包装成渐变以保持一致性
    return `linear-gradient(to bottom, ${bg}, ${bg})`;
  };

  // 如果没有提供theme，使用默认值
  const defaultTheme: Theme = {
    id: 'default',
    name: 'Default',
    pageBg: 'bg-gray-50',
    skyGradient: processBg(box1BgColor),
    waterGradient: processBg(box2BgColor),
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
      box2Bg: box2BgColor,
      containerPaddingTop: '0px',
    }
  };

  const currentTheme = theme || defaultTheme;

  // 如果 Shell 启用，不渲染任何内容（内容已通过 Context 传递到 Shell）
  if (isShellEnabled) {
    return null; // Shell 模式下，内容由 Shell 负责渲染
  }

  // 传统模式：显示完整的 box1/box2 结构
  return (
    <>
      {/* 内容区域 */}
      <div
        className="fishbowl-layout"
        style={{
          paddingTop: isMobile ? '0' : '0px',
          paddingLeft: isMobile ? '0' : '6px',
          paddingRight: isMobile ? '0' : '6px',
          paddingBottom: isMobile ? '0' : '6px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* 盒模型1：顶部区域，使用天空渐变，高度由内容决定 */}
        {!hideBox1 && (
          <div style={{ position: 'relative', width: '100%' }}>
            <SkySection theme={currentTheme}>
              <div style={{ padding: '20px', width: '100%', boxSizing: 'border-box', ...box1Style }}>
                {box1Content}
              </div>
            </SkySection>
            
            {/* 波浪分隔器 - 跨越两个区域的交界处 */}
            <div 
              className="wave-section" 
              style={{ 
                position: 'absolute', 
                bottom: '-40px', 
                left: 0, 
                right: 0, 
                zIndex: 10,
                height: '80px',
                pointerEvents: 'none'
              }}
            >
              <WaveSeparator colors={currentTheme.waveColors} />
            </div>
          </div>
        )}

        {/* 盒模型2：内容区域，使用水体渐变，高度由内容决定 */}
        <div style={{ flex: '1 0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <WaterSection theme={currentTheme}>
            <div 
              style={{ 
                padding: '40px 20px 20px', 
                minHeight: '200px',
                width: '100%',
                boxSizing: 'border-box',
                flex: '1 0 auto',
                ...box2Style 
              }}
            >
              {children}
            </div>
          </WaterSection>
        </div>
      </div>
    </>
  );
}

