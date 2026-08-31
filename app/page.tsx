'use client';

import { Button } from '@/app/components/ui';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppTheme } from './contexts/AppThemeContext';
import { useAuth } from './hooks/useAuth';
import { apiGetJson } from '@/lib/apiClient';
import WaveSeparator from './components/background/WaveSeparator';
import RootSystem from './components/garden/RootSystem';
import Header from './components/Header';
import { theme } from './config/theme';
import { BaselinePlant, PlantSettings } from './types/garden';
import { convertGradient, isTailwindGradient } from './utils/colorConverter';
import { PRESET_VINE } from './config/plantPresets';
import { DEFAULT_FISH_CONFIG } from './config/fishConfig';
import { PlantGrowthEngine } from './engine/PlantGrowthEngine';
import Goldfish, { FishBounds } from './components/fish/Goldfish';
import { FishConfig } from './components/fish/Sidebar';
import { Crow } from './components/Crow';

// 首屏标语列表（可随意增删改，随机展示，打字机效果，5s 切换）
const HERO_SLOGANS = [
  'next.js 搭建的个人博客',
  '不要给鱼喂太多食物！',
  '这里很难找到学习资料，但有很多奇怪的文字。',
  '她叫雷梅黛丝，那条鱼',
  '哦，这里有一只乌鸦',
  '一般来说植物全部长出来需要3s，如果多于3s，那是就说明你要换新手机了',
  '我是这里的主人，是的，就是你看到的这只乌鸦',
  '想跟我聊天吗？双击试试',
];

const CROW_FOOT_POSITION_RATIO = 902 / 1400;
const TARGET_FOOT_VH = 80;

// 根系数据类型
interface RootData {
  id: string;
  x: number;
  dna: PlantSettings;
}

export default function Home() {
  const { currentFishbowlTheme } = useAppTheme();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [showNavBar, setShowNavBar] = useState(false);
  const [baselineY, setBaselineY] = useState<number | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [rootSystems, setRootSystems] = useState<RootData[]>([]); // 根系数据

  // 鱼配置 - 从API获取或使用默认（类似植物系统的加载方式）
  const [fishConfig, setFishConfig] = useState<FishConfig | null>(null); // 初始为 null，等待加载
  const [fishBounds, setFishBounds] = useState<FishBounds | null>(null);
  const fishTopPadding = 20;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const baselineCanvasRef = useRef<HTMLCanvasElement>(null);
  const plantCanvasRef = useRef<HTMLCanvasElement>(null); // 植物画布层
  const box2Ref = useRef<HTMLDivElement | null>(null);
  const isAutoScrolling = useRef(false);
  const hideNavBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const scrollToPositionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const snapRafIdRef = useRef<number | null>(null);
  const snapScrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const snapToTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 乌鸦位置相关
  const crowContainerRef = useRef<HTMLDivElement>(null);
  const lastCrowTapRef = useRef(0); // 手机端双触：上次触摸结束时间
  const [crowTop, setCrowTop] = useState<string>('60vh'); // 默认值，会在 useEffect 中动态计算
  const [crowVisible, setCrowVisible] = useState(false); // 控制乌鸦渐显

  // 首屏打字机标语：当前标语全文、已打出字符、5s 切换
  const [sloganText, setSloganText] = useState('');
  const [typedSlogan, setTypedSlogan] = useState('');
  const sloganSwitchRef = useRef<NodeJS.Timeout | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  const handleCrowDoubleTap = useCallback(() => {
    if (!isLoggedIn) return;
    router.push('/chat');
  }, [router, isLoggedIn]);

  const handleCrowTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now();
      if (now - lastCrowTapRef.current < 400) {
        lastCrowTapRef.current = 0;
        e.preventDefault();
        handleCrowDoubleTap();
        return;
      }
      lastCrowTapRef.current = now;
    },
    [handleCrowDoubleTap]
  );
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

    let lastScrollTop = container.scrollTop;
    let isScrolling = false;

    const snapTo = (target: number) => {
      isAutoScrolling.current = true;
      container.scrollTo({
        top: target,
        behavior: 'smooth',
      });

      // 在滚动结束后更新导航位置
      if (snapToTimerRef.current) {
        clearTimeout(snapToTimerRef.current);
      }
      snapToTimerRef.current = setTimeout(() => {
        isAutoScrolling.current = false;
        updateNavBar(container.scrollTop, getThreshold()); // 确保状态同步
        snapToTimerRef.current = null;
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
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);

      if (scrollDelta > 0) {
        isScrolling = true;
        lastScrollTop = currentScrollTop;
      }

      if (snapRafIdRef.current) cancelAnimationFrame(snapRafIdRef.current);

      snapRafIdRef.current = requestAnimationFrame(() => {
        checkSnap();
      });

      if (snapScrollEndTimerRef.current) clearTimeout(snapScrollEndTimerRef.current);

      snapScrollEndTimerRef.current = setTimeout(() => {
        isScrolling = false;
        checkSnap();
      }, 30);
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
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    const handleResize = () => {
      // 窗口大小改变时重新计算并更新
      updateNavBar(container.scrollTop, getThreshold());
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      
      // 清理所有定时器和 RAF（使用 ref 确保访问最新值）
      if (snapScrollEndTimerRef.current) {
        clearTimeout(snapScrollEndTimerRef.current);
        snapScrollEndTimerRef.current = null;
      }
      if (snapRafIdRef.current) {
        cancelAnimationFrame(snapRafIdRef.current);
        snapRafIdRef.current = null;
      }
      if (snapToTimerRef.current) {
        clearTimeout(snapToTimerRef.current);
        snapToTimerRef.current = null;
      }
      
      // 清理其他 ref 中的定时器
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
    };
  }, []);

  // 计算乌鸦位置：根据脚部位置动态调整 top 值
  useEffect(() => {
    const calculateCrowPosition = () => {
      if (!crowContainerRef.current || typeof window === 'undefined') return;

      // 获取容器的实际渲染高度
      const containerHeight = crowContainerRef.current.offsetHeight;
      if (containerHeight === 0) return; // 如果还没有渲染，等待下次

      // 计算脚部在容器中的像素位置
      const footPositionInContainer = containerHeight * CROW_FOOT_POSITION_RATIO;

      // 目标：让脚部站在 TARGET_FOOT_VH 的位置
      // 所以容器的 top 应该是：目标位置 - 脚部在容器中的位置
      const targetFootPosition = (window.innerHeight * TARGET_FOOT_VH) / 100;
      const calculatedTop = targetFootPosition - footPositionInContainer;

      // 转换为 vh 单位（更稳定）
      const topInVh = (calculatedTop / window.innerHeight) * 100;
      setCrowTop(`${topInVh}vh`);
    };

    // 初始计算
    calculateCrowPosition();

    // 监听窗口大小变化
    window.addEventListener('resize', calculateCrowPosition);

    // 使用 ResizeObserver 监听容器大小变化（更准确）
    const resizeObserver = new ResizeObserver(() => {
      calculateCrowPosition();
    });

    if (crowContainerRef.current) {
      resizeObserver.observe(crowContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', calculateCrowPosition);
      resizeObserver.disconnect();
    };
  }, []);

  // 乌鸦渐显效果：延迟显示
  useEffect(() => {
    const timer = setTimeout(() => {
      setCrowVisible(true);
    }, 800); // 延迟 800ms 后开始渐显

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // 首屏标语：每 5s 随机换一条
  useEffect(() => {
    const pickNext = () => {
      const next = HERO_SLOGANS[Math.floor(Math.random() * HERO_SLOGANS.length)];
      setSloganText(next);
      setTypedSlogan('');
    };
    pickNext();
    sloganSwitchRef.current = setInterval(pickNext, 7000);
    return () => {
      if (sloganSwitchRef.current) clearInterval(sloganSwitchRef.current);
    };
  }, []);

  // 打字机效果：按字逐字显示当前标语
  useEffect(() => {
    if (!sloganText) return;
    const CHAR_DELAY = 80;
    typewriterRef.current = setInterval(() => {
      setTypedSlogan((prev) => {
        if (prev.length >= sloganText.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          return prev;
        }
        return sloganText.slice(0, prev.length + 1);
      });
    }, CHAR_DELAY);
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [sloganText]);

  // 计算鱼缸区域边界（用于限制鱼的活动范围）
  useEffect(() => {
    const updateFishBounds = () => {
      if (!box2Ref.current) return;
      const rect = box2Ref.current.getBoundingClientRect();
      setFishBounds({
        left: rect.left,
        top: rect.top + fishTopPadding,
        width: rect.width,
        height: Math.max(0, rect.height - fishTopPadding),
      });
    };

    updateFishBounds();
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', updateFishBounds, { passive: true });
    window.addEventListener('resize', updateFishBounds);
    return () => {
      container?.removeEventListener('scroll', updateFishBounds);
      window.removeEventListener('resize', updateFishBounds);
    };
  }, [fishTopPadding]);

  // 获取用户的鱼配置（等待用户登录状态确认后再加载，类似植物系统）
  useEffect(() => {
    // 等待认证状态加载完成
    if (authLoading) return;
    
    const loadFishConfig = async () => {
      try {
        const data = await apiGetJson<{ success: boolean; config: FishConfig }>(
          '/api/fish/config' // 允许未登录用户访问
        );
        
        if (data.success && data.config) {
          setFishConfig(data.config);
        } else {
          // 如果API返回失败，使用默认配置
          setFishConfig(DEFAULT_FISH_CONFIG);
        }
      } catch (error: unknown) {
        // 忽略取消错误
        if (error instanceof Error && error.name === 'AbortError') return;
        
        console.error('加载鱼配置失败:', error);
        setFishConfig(DEFAULT_FISH_CONFIG);
      }
    };

    loadFishConfig();
  }, [authLoading]); // 等待认证状态加载完成

  // 获取渐变背景 CSS
  const getSkyGradient = () => {
    return convertGradient(currentFishbowlTheme.skyGradient);
  };

  const waterGradient = currentFishbowlTheme.waterGradient;
  const isTailwindWater = isTailwindGradient(waterGradient);

  // 固定基线位置在 box2 顶部（使用世界坐标）
  useEffect(() => {
    const canvas = baselineCanvasRef.current;
    const container = scrollContainerRef.current;
    const box2 = box2Ref.current;
    if (!canvas || !container || !box2) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const width = container.clientWidth;

      // ⭐ 世界坐标：计算 box2 相对于滚动容器的位置
      let y = 0;
      let el: HTMLElement | null = box2;
      while (el && el !== container) {
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement;
      }

      // 画布高度跟随 box2 底部，避免根系超出 part2
      const box2Height = box2.offsetHeight;
      const height = Math.ceil(y + box2Height);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

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
      } catch (error: unknown) {
        // 忽略取消错误
        if (error instanceof Error && error.name === 'AbortError') return;
        
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
      // 停止动画循环
      if (growthAnimationRef.current) {
        cancelAnimationFrame(growthAnimationRef.current);
        growthAnimationRef.current = null;
      }
      
      // 清理所有离屏 canvas（释放内存）
      baselinePlantsDataRef.current.forEach((plant) => {
        if (plant.canvas) {
          // 清空 canvas 内容
          const ctx = plant.ctx;
          if (ctx) {
            ctx.clearRect(0, 0, plant.canvas.width, plant.canvas.height);
          }
        }
      });
      
      // 清空植物数据数组
      baselinePlantsDataRef.current = [];
      
      // 重置初始化标志（允许重新初始化）
      hasInitializedPlantsRef.current = false;
    };
  }, [baselineY, canvasHeight, loadedPlants, spawnPlant, updatePlantGrowth]);

  // 注入乌鸦响应式样式
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = 'crow-responsive-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes slideIn {
        from {
          transform: translateX(100vw) translateY(-50%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      .crow-entrance-animation {
        animation: slideIn 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      }
      .crow-container {
        width: 90vw; /* 手机上默认 90vw */
      }
      @media (min-width: 768px) {
        .crow-container {
          width: 40vw; /* 平板上缩小到 40vw */
        }
      }
      @media (min-width: 1200px) {
        .crow-container {
          width: 40vw; /* 电脑上缩小到 40vw */
        }
      }
      @media (min-width: 1400px) {
        .crow-container {
          width: 30vw; /* 大屏幕上进一步缩小到 30vw */
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
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
              height: `${canvasHeight}px`, // 使用实际高度（到 box2 底部）
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
            // height 由 JavaScript 代码控制（到 box2 底部），不在这里设置
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
            // height 由 JavaScript 代码控制（到 box2 底部），不在这里设置
            pointerEvents: 'none',
            zIndex: 3, // 在基线之上
          }}
        />

        {/* 第一部分 - 首屏 */}
        <div
          className="flex flex-col items-center"
          style={{
            height: '80vh',
            background: 'transparent',
            paddingTop: '15vh', // 往上移动
            justifyContent: 'flex-start',
          }}
        >
          <div className="text-center text-black px-8" style={{ position: 'relative', zIndex: 5 }}>
            <h1 
              className="mb-6" 
              style={{ 
                fontSize: '5rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: '1.1',
                textShadow: '0 4px 8px rgba(0,0,0,0.2)', 
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Fishbowl
            </h1>
            <p 
              className="text-xl mb-8 max-w-2xl mx-auto min-h-[3rem] flex items-center justify-center" 
              style={{ 
                fontSize: '1.25rem',
                fontWeight: 500,
                letterSpacing: '0.01em',
                lineHeight: '1.6',
                textShadow: '0 2px 4px rgba(0,0,0,0.15)', 
                color: '#333333',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              {typedSlogan}
              <span className="animate-pulse" style={{ marginLeft: '2px' }}>|</span>
            </p>
            <Button
              type="default"
              size="large"
              icon={<ChevronDown size={18} />}
              className="animate-bounce hero-cta-btn"
              style={{
                height: '50px',
                fontSize: '18px',
                borderRadius: '25px',
                padding: '0 32px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'black',
                zIndex: 100,
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
          {/* Crow 组件 - 覆盖在画布上，根据脚部位置动态定位，根据屏幕宽度等比例缩放 */}
          <div
            ref={crowContainerRef}
            role="button"
            tabIndex={0}
            title="跟我聊天？"
            className={`crow-container cursor-pointer ${crowVisible ? 'crow-entrance-animation' : ''}`}
            style={{
              position: 'absolute',
              top: `calc(${crowTop} - 80vh)`,
              left: '70%',
              zIndex: 99,
              pointerEvents: 'auto',
              opacity: crowVisible ? undefined : 0,
              // 入场时由 .crow-entrance-animation 的 slideIn 控制位移与透明度
              // SVG viewBox 是 1300x1400，宽高比 = 1400/1300 ≈ 1.077
              // 宽度通过 CSS 类控制（响应式）
            }}
            onDoubleClick={handleCrowDoubleTap}
            onTouchEnd={handleCrowTouchEnd}
          >
            <Crow className="w-full h-full" />
          </div>

          {/* 45px导航栏区域 */}
          <div
            className="sticky-nav-bar"
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
              overflow: 'visible',
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
            className={isTailwindWater ? waterGradient : ''}
            style={{
              flex: 1,
              width: '100%',
              background: isTailwindWater ? undefined : waterGradient,
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'visible',
              paddingTop: '40px', // 给波浪留空间
              minHeight: 'calc(100vh - 45px - 7vh)', // 至少填满屏幕减去导航栏和透明区域
              height: 'calc(100vh - 45px - 7vh)', // 固定高度，确保渐变覆盖到底部
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

            {/* 鱼缸区域 - 作为水体背景层，不影响渐变 */}
            {/* 等待鱼配置加载完成后再挂载（类似植物系统） */}
            {fishConfig && (
              <div
                style={{
                  position: 'absolute',
                  top: fishTopPadding,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                <Goldfish config={fishConfig} bounds={fishBounds || undefined} />
              </div>
            )}

            {/* 内容区 */}
            <div className="text-center text-white" style={{ padding: '0 24px 40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', position: 'relative', zIndex: 5, minHeight: '100%' }}>
              <div style={{ textAlign: 'center', marginTop: '400px', paddingBottom: '20px' }}>
                <Button
                  type="default"
                  size="large"
                  className="glass-cta-btn"
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
