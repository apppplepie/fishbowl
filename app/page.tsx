'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTheme } from './contexts/AppThemeContext';
import Header from './components/Header';
import PermissionSystemDemo from './components/PermissionSystemDemo';
import WaveSeparator from './components/background/WaveSeparator';
import { theme } from './config/theme';

const { Title, Paragraph } = Typography;

export default function Home() {
  const { currentFishbowlTheme } = useAppTheme();
  const [showNavBar, setShowNavBar] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);
  const hideNavBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const router = useRouter();

  // 统一的导航栏更新函数：立即显示 + 防抖隐藏
  const updateNavBar = (scrollTop: number, threshold: number) => {
    const shouldShow = scrollTop >= threshold;

    // 取消之前的 requestAnimationFrame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 使用 requestAnimationFrame 优化性能
    rafIdRef.current = requestAnimationFrame(() => {
      // 超过阈值：立即显示
      if (shouldShow) {
        // 清除隐藏定时器
        if (hideNavBarTimerRef.current) {
          clearTimeout(hideNavBarTimerRef.current);
          hideNavBarTimerRef.current = null;
        }
        setShowNavBar(true);
      }
      // 低于阈值：防抖隐藏（避免滚动中频繁闪烁）
      else {
        // 清除之前的隐藏定时器
        if (hideNavBarTimerRef.current) {
          clearTimeout(hideNavBarTimerRef.current);
        }
        // 延迟 200ms 后隐藏（防抖）
        hideNavBarTimerRef.current = setTimeout(() => {
          setShowNavBar(false);
          hideNavBarTimerRef.current = null;
        }, 200);
      }
      rafIdRef.current = null;
    });
  };

  // 滚动到指定位置
  const scrollToPosition = (position: number) => {
    const container = scrollContainerRef.current;
    if (!container || typeof window === 'undefined') return;

    isAutoScrolling.current = true;
    container.scrollTo({
      top: position,
      behavior: 'smooth',
    });

    // 使用统一的更新函数
    const threshold = window.innerHeight * 0.8;
    updateNavBar(position, threshold);

    // 减少完成时间，让响应更快
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 150);
  };

  // 滑动吸附逻辑和滚动位置检测
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof window === 'undefined') return;

    const getSnapPoint = () => window.innerHeight * 0.8; // 80vh
    const getThreshold = () => window.innerHeight * 0.79; // 导航栏显示阈值

    let scrollEndTimer: NodeJS.Timeout | null = null;
    let lastScrollTop = container.scrollTop;
    let lastScrollTime = Date.now();
    let isScrolling = false;
    let snapRafId: number | null = null;

    const snapTo = (target: number) => {
      isAutoScrolling.current = true;
      container.scrollTo({
        top: target,
        behavior: 'smooth',
      });

      // 在滚动结束后更新导航位置
      setTimeout(() => {
        isAutoScrolling.current = false;
        updateNavBar(container.scrollTop, getThreshold()); // 确保状态同步
      }, 30);
    };

    // 检查是否需要吸附
    const checkSnap = () => {
      if (isAutoScrolling.current) return;

      const y = container.scrollTop;
      const SNAP_POINT = getSnapPoint();

      // [表情] 已经进入 par2 内容区 → 完全放行
      if (y >= SNAP_POINT) return;

      // [表情] 仍在 par1 区域，决定回去还是进 par2
      const target = y < SNAP_POINT * 0.4 ? 0 : SNAP_POINT;

      if (Math.abs(y - target) < 5) {
        if (Math.abs(y - target) > 1) {
          snapTo(target);
        }
        return;
      }

      const scrollSpeed = Math.abs(y - lastScrollTop);
      if (scrollSpeed < 1 && !isScrolling) {
        snapTo(target);
      }
    };

    const onScroll = () => {
      // 使用统一的导航栏更新函数
      updateNavBar(container.scrollTop, getThreshold());

      if (isAutoScrolling.current) return;

      const currentScrollTop = container.scrollTop;
      const currentTime = Date.now();

      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);

      if (scrollDelta > 0) {
        isScrolling = true;
        lastScrollTop = currentScrollTop;
        lastScrollTime = currentTime;
      }

      if (snapRafId) cancelAnimationFrame(snapRafId);

      snapRafId = requestAnimationFrame(() => {
        checkSnap();
      });

      if (scrollEndTimer) clearTimeout(scrollEndTimer);

      scrollEndTimer = setTimeout(() => {
        isScrolling = false;
        checkSnap();
      }, 30);
    };

    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = () => {
      setTimeout(() => {
        checkSnap();
      }, 30);
    };

    // 初始化时更新导航栏状态
    updateNavBar(container.scrollTop, getThreshold());

    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    const handleResize = () => {
      // 窗口大小改变时重新计算并更新
      updateNavBar(container.scrollTop, getThreshold());
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
      if (snapRafId) cancelAnimationFrame(snapRafId);
      if (hideNavBarTimerRef.current) {
        clearTimeout(hideNavBarTimerRef.current);
        hideNavBarTimerRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // 将 Tailwind 渐变类名转换为 CSS 渐变字符串
  const tailwindToCSS = (tailwindClass: string): string => {
    // Tailwind 颜色映射表（常用颜色）
    const colorMap: Record<string, string> = {
      // Orange
      'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa', 'orange-300': '#fdba74',
      'orange-400': '#fb923c', 'orange-500': '#f97316',
      // Rose
      'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3', 'rose-300': '#fda4af',
      // Indigo
      'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe', 'indigo-300': '#a5b4fc',
      // Teal
      'teal-50': '#f0fdfa', 'teal-100': '#ccfbf1', 'teal-200': '#99f6e4', 'teal-300': '#5eead4',
      'teal-400': '#2dd4bf', 'teal-500': '#14b8a6',
      // Emerald
      'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0', 'emerald-300': '#6ee7b7',
      // Pink
      'pink-50': '#fdf2f8', 'pink-100': '#fce7f3', 'pink-200': '#fbcfe8',
      // Purple
      'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe',
      // Violet
      'violet-50': '#f5f3ff', 'violet-100': '#ede9fe', 'violet-200': '#ddd6fe', 'violet-300': '#c4b5fd',
      // Red
      'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
      // Yellow
      'yellow-50': '#fefce8', 'yellow-100': '#fef9c3', 'yellow-200': '#fef08a',
      // Amber
      'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a',
      // Lime
      'lime-50': '#f7fee7', 'lime-100': '#ecfccb', 'lime-200': '#d9f99d',
      // Green
      'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
      // Cyan
      'cyan-50': '#ecfeff', 'cyan-100': '#cffafe', 'cyan-200': '#a5f3fc', 'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4',
      // Blue
      'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe', 'blue-600': '#2563eb',
      // Sky
      'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-200': '#bae6fd', 'sky-300': '#7dd3fc',
      // Slate
      'slate-50': '#f8fafc', 'slate-900': '#0f172a', 'slate-950': '#020617',
      // Fuchsia
      'fuchsia-900': '#701a75', 'fuchsia-950': '#4a044e',
      // Stone
      'stone-100': '#f5f5f4',
      // Gray
      'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db',
      'gray-400': '#9ca3af', 'gray-500': '#6b7280', 'gray-700': '#374151',
      // Black
      'black': '#000000',
    };

    // 解析 Tailwind 类名
    const fromMatch = tailwindClass.match(/from-(\S+)/);
    const viaMatch = tailwindClass.match(/via-(\S+)/);
    const toMatch = tailwindClass.match(/to-(\S+)/);

    const fromColor = fromMatch ? colorMap[fromMatch[1]] || '#ffffff' : '#ffffff';
    const toColor = toMatch ? colorMap[toMatch[1]] || '#ffffff' : '#ffffff';

    if (viaMatch) {
      const viaColor = colorMap[viaMatch[1]] || '#ffffff';
      return `linear-gradient(to bottom, ${fromColor} 0%, ${viaColor} 50%, ${toColor} 100%)`;
    }

    return `linear-gradient(to bottom, ${fromColor} 0%, ${toColor} 100%)`;
  };

  // 获取渐变背景 CSS
  const getSkyGradient = () => {
    const gradient = currentFishbowlTheme.skyGradient;
    if (gradient.startsWith('bg-')) {
      // Tailwind 类名，转换为 CSS
      return tailwindToCSS(gradient);
    }
    return gradient;
  };

  const getWaterGradient = () => {
    const gradient = currentFishbowlTheme.waterGradient;
    if (gradient.startsWith('bg-')) {
      // Tailwind 类名，转换为 CSS
      return tailwindToCSS(gradient);
    }
    return gradient;
  };

  return (
    <>
      {/* 固定背景层 - 只铺 100vh，显示天空渐变 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          background: getSkyGradient(),
          zIndex: -1,
        }}
      />

      <div
        ref={scrollContainerRef}
        style={{
          height: '100vh',
          overflowY: 'scroll',
        }}
      >
        {/* 第一部分 - 首屏 */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            height: '80vh',
            background: 'transparent',
          }}
        >
          <div className="text-center text-white px-8">
            <Title level={1} className="!text-white mb-6" style={{ fontSize: '3.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Fishbowl
            </Title>
            <Paragraph className="!text-white text-xl mb-8 max-w-2xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              没开发完，先这样吧
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<DownOutlined />}
              className="animate-bounce"
              style={{
                height: '50px',
                fontSize: '18px',
                borderRadius: '25px',
                padding: '0 32px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
              }}
              onClick={() => scrollToPosition(window.innerHeight * 0.8)}
            >
              探索更多
            </Button>
          </div>
        </div>

        {/* 第二部分 - 内容展示 */}
        <div
          className="flex flex-col items-center"
          style={{
            background: 'transparent',
            minHeight: 'calc(100vh - 80vh)', // 至少占据剩余空间
            borderLeft: `6px solid ${theme.colors.black}`,
            borderRight: `6px solid ${theme.colors.black}`,
            borderBottom: `6px solid ${theme.colors.black}`,
            boxSizing: 'border-box',
            padding: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 45px导航栏区域 */}
          <div
            style={{
              height: '45px',
              width: 'calc(100% + 12px)',
              marginLeft: '-6px',
              marginRight: '-6px',
              background: showNavBar ? 'transparent' : theme.colors.black,
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              transition: 'background-color 0.3s ease',
              overflow: 'hidden',
            }}
          >
            {showNavBar && (
              <Header embedded={true} />
            )}
          </div>

          {/* 盒模型1：7vh高的透明顶部区域 */}
          <div 
            style={{ 
              height: '7vh', 
              background: 'transparent', 
              width: '100%', 
              flexShrink: 0, 
              flexGrow: 0, 
            }}
          >
          </div>

          {/* 盒模型2：主要内容区域（包含波浪） */}
          <div
            style={{
              flex: 1,
              width: '100%',
              background: getWaterGradient(),
              boxSizing: 'border-box',
              position: 'relative',
              paddingTop: '40px', // 给波浪留空间
              minHeight: 'calc(100vh - 45px - 7vh)', // 至少填满屏幕减去导航栏和透明区域
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 波浪分隔器 - 在 box2 内部顶部 */}
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                left: 0,
                right: 0,
                width: '100%',
                height: '80px',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <WaveSeparator colors={currentFishbowlTheme.waveColors} />
            </div>

            {/* 内容区 */}
            <div className="text-center text-white" style={{ padding: '0 24px 40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <Title level={2} className="!text-white mb-6" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                权限系统
              </Title>
              <Paragraph className="!text-white text-lg mb-6" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                体验渐进式内容浏览
              </Paragraph>

              <div className="max-w-5xl mx-auto" style={{ flex: 1 }}>
                <PermissionSystemDemo />
              </div>

              <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '20px' }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => router.push('/archive')}
                  style={{
                    height: '50px',
                    fontSize: '16px',
                    borderRadius: '25px',
                    padding: '0 40px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                  }}
                >
                  进入文章归档
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
