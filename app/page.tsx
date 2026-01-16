'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTheme } from './contexts/AppThemeContext';
import PermissionSystemDemo from './components/PermissionSystemDemo';
import WaveSeparator from './components/background/WaveSeparator';
import BaselinePlantViewer from './components/garden/BaselinePlantViewer';
import RootSystem from './components/garden/RootSystem';
import Header from './components/Header';
import { theme } from './config/theme';
import { BaselinePlant, PlantSettings } from './types/garden';
import { convertGradient } from './utils/colorConverter';
import { PRESET_VINE } from './config/plantPresets';
import { PlantGrowthEngine } from './engine/PlantGrowthEngine';

const { Title, Paragraph } = Typography;

// 根系数据类型
interface RootData {
  id: string;
  x: number;
  dna: PlantSettings;
}

export default function Home() {
  const { currentFishbowlTheme } = useAppTheme();
  const [showNavBar, setShowNavBar] = useState(false);
  const [baselineY, setBaselineY] = useState<number | null>(null);
  const [baselinePlants, setBaselinePlants] = useState<BaselinePlant[]>([]);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [rootSystems, setRootSystems] = useState<RootData[]>([]); // 根系数据

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const baselineCanvasRef = useRef<HTMLCanvasElement>(null);
  const plantCanvasRef = useRef<HTMLCanvasElement>(null); // 植物画布层
  const box2Ref = useRef<HTMLDivElement | null>(null);
  const isAutoScrolling = useRef(false);
  const hideNavBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const scrollToPositionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 植物系统引用
  const engineRef = useRef<PlantGrowthEngine>(new PlantGrowthEngine());
  const growthAnimationRef = useRef<number | null>(null); // 生长动画帧 ID
  const baselinePlantsDataRef = useRef<BaselinePlant[]>([]); // 基线植物数据
  const hasInitializedPlantsRef = useRef(false); // 防止重复初始化
  const MAX_BASELINE_PLANTS = 5; // 最大植物数量
  const [loadedPlants, setLoadedPlants] = useState<Array<{
    id: string;
    position_x_ratio: number;
    position_y_offset: number;
    dna: PlantSettings;
  }> | null>(null); // 从数据库加载的植物数据

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
    if (scrollToPositionTimerRef.current) {
      clearTimeout(scrollToPositionTimerRef.current);
    }
    scrollToPositionTimerRef.current = setTimeout(() => {
      isAutoScrolling.current = false;
      scrollToPositionTimerRef.current = null;
    }, 150);
  };

  // 滑动吸附逻辑和滚动位置检测
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof window === 'undefined') return;

    const getSnapPoint = () => window.innerHeight * 0.8; // 80vh
    const getThreshold = () => window.innerHeight * 0.79; // 导航栏显示阈值

    let scrollEndTimer: NodeJS.Timeout | null = null;
    let snapToTimer: NodeJS.Timeout | null = null;
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
      if (snapToTimer) {
        clearTimeout(snapToTimer);
      }
      snapToTimer = setTimeout(() => {
        isAutoScrolling.current = false;
        updateNavBar(container.scrollTop, getThreshold()); // 确保状态同步
        snapToTimer = null;
      }, 30);
    };

    // 检查是否需要吸附
    const checkSnap = () => {
      if (isAutoScrolling.current) return;

      const y = container.scrollTop;
      const SNAP_POINT = getSnapPoint();

      // 已经进入 par2 内容区 → 完全放行
      if (y >= SNAP_POINT) {
        return;
      }

      // 仍在 par1 区域，决定回去还是进 par2
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
      if (touchEndTimerRef.current) {
        clearTimeout(touchEndTimerRef.current);
      }
      touchEndTimerRef.current = setTimeout(() => {
        checkSnap();
        touchEndTimerRef.current = null;
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
      if (scrollToPositionTimerRef.current) {
        clearTimeout(scrollToPositionTimerRef.current);
        scrollToPositionTimerRef.current = null;
      }
      if (touchEndTimerRef.current) {
        clearTimeout(touchEndTimerRef.current);
        touchEndTimerRef.current = null;
      }
      if (snapToTimer) {
        clearTimeout(snapToTimer);
        snapToTimer = null;
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

  // 固定基线位置在 box2 顶部（使用世界坐标）
  useEffect(() => {
    const canvas = baselineCanvasRef.current;
    const container = scrollContainerRef.current;
    const box2 = box2Ref.current;
    if (!canvas || !container || !box2) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      // 固定画布高度为2000px
      const height = 2000;
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

      ctx.strokeStyle = 'transparent';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      setBaselineY(y);
      setCanvasHeight(height); // 同时更新画布高度
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  // 生成单株植物
  const spawnPlant = useCallback((x: number, y: number, settings: PlantSettings = PRESET_VINE) => {
    if (!plantCanvasRef.current) return;
    if (!scrollContainerRef.current) return;

    // 使用逻辑宽度，而不是物理像素宽度
    const width = scrollContainerRef.current.clientWidth;
    const height = canvasHeight;

    // 创建离屏 canvas（不考虑 DPR，节省内存）
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;

    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    const plantId = Math.random().toString(36).substr(2, 9);

    const plant: BaselinePlant = {
      id: plantId,
      originX: x,
      currentX: x,
      y: y,
      canvas: offCanvas,
      ctx: offCtx,
      settings: settings,
    };

    baselinePlantsDataRef.current.push(plant);
    engineRef.current.spawnGrower(x, y, settings, offCtx);

    // 同时添加根系数据
    setRootSystems(prev => [...prev, {
      id: plantId,
      x: x,
      dna: settings,
    }]);
  }, [canvasHeight]);

  // 使用 ref 存储 canvasHeight，避免闭包问题
  const canvasHeightRef = useRef(canvasHeight);
  useEffect(() => {
    canvasHeightRef.current = canvasHeight;
  }, [canvasHeight]);

  // 合成所有植物到主画布
  const compositeAllPlants = useCallback(() => {
    const canvas = plantCanvasRef.current;
    const container = scrollContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 使用逻辑尺寸（因为 ctx 已经 scale(dpr, dpr)）
    const width = container.clientWidth;
    const height = canvasHeightRef.current;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制每株植物
    baselinePlantsDataRef.current.forEach((plant) => {
      const dx = plant.currentX - plant.originX;
      ctx.drawImage(plant.canvas, dx, 0);
    });
  }, []); // 移除 canvasHeight 依赖，使用 ref 代替

  // 主更新循环
  const updatePlantGrowth = useCallback(() => {
    // 检查组件是否已卸载
    if (growthAnimationRef.current === null) return;

    // 更新生长引擎
    engineRef.current.update();

    // 合成到主画布
    compositeAllPlants();

    // 检查是否所有植物都生长完成
    if (engineRef.current.areAllPlantsFinished()) {
      // 停止动画循环
      if (growthAnimationRef.current) {
        cancelAnimationFrame(growthAnimationRef.current);
        growthAnimationRef.current = null;
      }
      console.log('🌱 所有植物生长完成，动画已停止');
      return;
    }

    // 继续下一帧（仅在未卸载时）
    if (growthAnimationRef.current !== null) {
      growthAnimationRef.current = requestAnimationFrame(updatePlantGrowth);
    }
  }, [compositeAllPlants]);

  // 从数据库加载植物配置（类似 garden/page.tsx 的逻辑）
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadPlantsFromDatabase = async () => {
      try {
        const response = await fetch('/api/garden/config?page_id=', {
          signal: abortController.signal,
        });
        const data = await response.json();

        // 检查是否已取消
        if (abortController.signal.aborted) return;

        if (data.success && data.plants && data.plants.length > 0) {
          // 限制加载数量以保护内存
          const plantsToLoad = data.plants.slice(0, MAX_BASELINE_PLANTS);
          setLoadedPlants(plantsToLoad);
          if (data.plants.length > MAX_BASELINE_PLANTS) {
            console.log(`已加载前 ${MAX_BASELINE_PLANTS} 株植物，其余未加载以避免占用过多内存`);
          }
        } else {
          // 没有保存的植物，设置为空数组
          setLoadedPlants([]);
        }
      } catch (error: any) {
        // 忽略取消错误
        if (error.name === 'AbortError') return;
        
        console.error('加载植物配置失败:', error);
        // 加载失败时设置为空数组，使用默认逻辑
        if (!abortController.signal.aborted) {
          setLoadedPlants([]);
        }
      }
    };

    loadPlantsFromDatabase();
    
    return () => {
      abortController.abort();
    };
  }, []);

  // 初始化植物系统（仅首次加载）
  useEffect(() => {
    // 等待基线和画布高度就绪，以及植物数据加载完成
    if (!baselineY || !canvasHeight) return;
    if (loadedPlants === null) return; // 等待数据库加载完成
    if (hasInitializedPlantsRef.current) return; // 防止重复初始化

    const canvas = plantCanvasRef.current;
    const container = scrollContainerRef.current;
    if (!canvas || !container) return;

    // 设置植物画布尺寸（与基线画布一致）
    const width = container.clientWidth;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 缩放上下文以适配 DPR
    ctx.scale(dpr, dpr);

    // 根据数据库中的植物数据生成植物
    if (loadedPlants.length > 0) {
      // 使用数据库中的植物
      loadedPlants.forEach((plant) => {
        const x = width * plant.position_x_ratio;
        const y = baselineY + plant.position_y_offset;
        spawnPlant(x, y, plant.dna);
      });
      console.log(`🌱 已从数据库加载 ${loadedPlants.length} 株植物，开始生长动画`);
    } else {
      // 如果没有保存的植物，不生成默认植物（保持空白）
      console.log('🌱 没有保存的植物，保持空白');
    }

    // 标记已初始化
    hasInitializedPlantsRef.current = true;

    // 启动生长动画循环
    growthAnimationRef.current = requestAnimationFrame(updatePlantGrowth);

    // 清理函数
    return () => {
      if (growthAnimationRef.current) {
        cancelAnimationFrame(growthAnimationRef.current);
        growthAnimationRef.current = null;
      }
    };
  }, [baselineY, canvasHeight, loadedPlants, spawnPlant, updatePlantGrowth]);

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
          background: getSkyGradient(),
        }}
      >
        {/* 根系层 - 在基线下方生长，叠在 box2 背景上 */}
        {baselineY !== null && canvasHeight > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${canvasHeight}px`, // 使用实际高度 2000px
              pointerEvents: 'none',
              zIndex: 1, // 在内容之上，根系可见
            }}
          >
            {rootSystems.map((root) => (
              <RootSystem
                key={root.id}
                x={root.x}
                baselineY={baselineY}
                dna={root.dna}
                containerHeight={canvasHeight}
                animationProgress={1}
              />
            ))}
          </div>
        )}

        {/* 基线画布 - 使用世界坐标，跟随滚动内容（红线层）*/}
        <canvas
          ref={baselineCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            // height 由 JavaScript 代码控制（2000px），不在这里设置
            pointerEvents: 'none',
            zIndex: 2, // 在根系之上
          }}
        />

        {/* 植物画布 - 基线植物生长层 */}
        <canvas
          ref={plantCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            // height 由 JavaScript 代码控制（2000px），不在这里设置
            pointerEvents: 'none',
            zIndex: 3, // 在基线之上
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
          <div className="text-center text-white px-8" style={{ position: 'relative', zIndex: 5 }}>
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
                marginTop: '40px',
              }}
              onClick={() => {
                const snapPoint = window.innerHeight * 0.8;
                scrollToPosition(snapPoint);
              }}
            >
              下拉
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
            <div 
              style={{ 
                zIndex: 10, 
                position: 'relative',
                opacity: showNavBar ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <Header embedded={true} isVisible={true} />
            </div>
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
            <div className="text-center text-white" style={{ padding: '0 24px 40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', position: 'relative', zIndex: 5 }}>
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
