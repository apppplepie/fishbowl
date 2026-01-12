'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTheme } from './contexts/AppThemeContext';
import Header from './components/Header';
import PermissionSystemDemo from './components/PermissionSystemDemo';
import WaveSeparator from './components/background/WaveSeparator';
import BaselinePlantViewer from './components/garden/BaselinePlantViewer';
import { theme } from './config/theme';
import { BaselinePlant } from './types/garden';
import { convertGradient } from './utils/colorConverter';
import { PRESET_VINE } from './config/plantPresets';

const { Title, Paragraph } = Typography;

export default function Home() {
  const { currentFishbowlTheme } = useAppTheme();
  const [showNavBar, setShowNavBar] = useState(false);
  const [baselineY, setBaselineY] = useState<number | null>(null);
  const [baselinePlants, setBaselinePlants] = useState<BaselinePlant[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const baselineCanvasRef = useRef<HTMLCanvasElement>(null);
  const box2Ref = useRef<HTMLDivElement | null>(null);
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

  // 获取渐变背景 CSS
  const getSkyGradient = () => {
    return convertGradient(currentFishbowlTheme.skyGradient);
  };

  const getWaterGradient = () => {
    return convertGradient(currentFishbowlTheme.waterGradient);
  };

  // 创建示例基线植物
  const createSampleBaselinePlant = (x: number, y: number, canvasWidth: number, canvasHeight: number): BaselinePlant => {
    // 创建一个小的canvas，只包含植物区域（从基线向上80px）
    const plantWidth = 60; // 植物宽度
    const plantHeight = 100; // 植物高度（从基线向上）
    const canvas = document.createElement('canvas');
    canvas.width = plantWidth;
    canvas.height = plantHeight;
    const ctx = canvas.getContext('2d')!;

    // 在局部canvas上绘制植物（相对于canvas左上角）
    const localX = plantWidth / 2; // 植物在canvas中央
    const localY = plantHeight; // 植物底部对齐canvas底部

    // 绘制茎（从底部向上）
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(localX, localY);
    ctx.lineTo(localX, localY - 80);
    ctx.stroke();

    // 叶子
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.ellipse(localX - 15, localY - 20, 12, 6, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(localX + 15, localY - 40, 12, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 花朵
    ctx.fillStyle = '#ed64a6';
    ctx.beginPath();
    ctx.arc(localX, localY - 80, 6, 0, Math.PI * 2);
    ctx.fill();

    return {
      id: Math.random().toString(36).substr(2, 9),
      originX: x,
      currentX: x,
      y: y,
      canvas: canvas,
      ctx: ctx,
      settings: PRESET_VINE, // 使用默认藤蔓预设
      height: 0 // 初始高度为0
    };
  };

  // 固定基线位置在 box2 顶部（使用世界坐标）
  useEffect(() => {
    const canvas = baselineCanvasRef.current;
    const container = scrollContainerRef.current;
    const box2 = box2Ref.current;
    if (!canvas || !container || !box2) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const height = container.scrollHeight;
      const width = container.clientWidth;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // ⭐ 世界坐标：计算 box2 相对于滚动容器的位置
      let y = 0;
      let el: HTMLElement | null = box2;
      while (el && el !== container) {
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement;
      }

      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      setBaselineY(y);

      // 创建示例基线植物
      const samplePlants: BaselinePlant[] = [];
      const plantCount = 4; // 创建4个示例植物
      const spacing = width / (plantCount + 1);

      for (let i = 0; i < plantCount; i++) {
        const x = spacing * (i + 1);
        const plant = createSampleBaselinePlant(x, y, width, height);
        samplePlants.push(plant);
      }

      setBaselinePlants(samplePlants);
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

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

      {/* 基线植物查看器 - 全屏覆盖整个页面 */}
      {baselinePlants.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 5, // 在所有内容之上
          }}
        >
        <BaselinePlantViewer
          plants={baselinePlants}
          width={window.innerWidth}
          height={window.innerHeight}
        />
        <style>{`
          .baseline-plant-viewer {
            mix-blend-mode: screen;
          }
        `}</style>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        style={{
          height: '100vh',
          overflowY: 'scroll',
          position: 'relative',
        }}
      >
        {/* 基线画布 - 使用世界坐标，跟随滚动内容 */}
        <canvas
          ref={baselineCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

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
            ref={box2Ref}
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
