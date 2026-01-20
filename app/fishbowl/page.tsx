'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';
import { usePageShell } from '../contexts/PageShellContext';
import { useHeader } from '../contexts/HeaderContext';
import { useAppTheme } from '../contexts/AppThemeContext';
import GardenCanvas from '../components/garden/GardenCanvas';
import GardenSidebar from '../components/garden/GardenSidebar';
import { GardenDrawerButton } from '../components/garden/GardenDrawerButton';
import RootSystem from '../components/garden/RootSystem';
import BaselinePlantViewer from '../components/garden/BaselinePlantViewer';
import { PlantSettings, PlantType, GardenCanvasRef, PlantRenderData } from '../types/garden';
import { PRESET_VINE, getPlantPreset } from '../config/plantPresets';
import { convertGradient } from '../utils/colorConverter';
import { FishConfig } from '../components/fish/Sidebar';

const MAX_LOADED_PLANTS = 10; // 避免一次性加载过多离屏 canvas 占满内存

export default function FishbowlPage() {
  const { isMobile } = useResponsive();
  const { setConfig } = usePageShell();
  const { setLeftContent } = useHeader();
  const { currentFishbowlTheme } = useAppTheme();
  const [settings, setSettings] = useState<PlantSettings>(PRESET_VINE);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importString, setImportString] = useState('');
  const [baselinePlants, setBaselinePlants] = useState<PlantRenderData[]>([]);
  const [baselineY, setBaselineY] = useState<number>(600); // 默认基线位置
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [containerOffsetTop, setContainerOffsetTop] = useState<number>(0);
  const [box2Height, setBox2Height] = useState<number>(0);

  // 防止baselinePlants数组无限增长
  const maxBaselinePlants = 20;

  const canvasRef = useRef<GardenCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算画布背景颜色（使用水体渐变的最深颜色）
  const canvasBackgroundColor = useMemo(() => {
    const waterCSS = convertGradient(currentFishbowlTheme.waterGradient);
    // 提取最后一个颜色（通常是最深的）
    const colorMatches = waterCSS.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-z]+/gi);
    return colorMatches ? colorMatches[colorMatches.length - 1] : '#fdfbf7';
  }, [currentFishbowlTheme]);

  useEffect(() => {
      if (toastMessage) {
          const timer = setTimeout(() => setToastMessage(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toastMessage]);

  // 设置PageShell的box1为80vh天空区域，并配置侧边栏
  useEffect(() => {
    setConfig({
      box1Style: {
        minHeight: '80vh',
        // 确保天空区域是透明的，让画布可见
        background: 'transparent',
      },
      sidebarWidth: 280,
      sidebarExpanded,
    });

    return () => {
      setConfig({ box1Style: undefined, sidebarWidth: 0, sidebarExpanded: false });
    };
  }, [setConfig, sidebarExpanded]);

  const getBox1ToBox2Offset = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    const box1Element = document.querySelector('.page-shell-box1') as HTMLElement | null;
    const box2Element = document.querySelector('.page-shell-box2') as HTMLElement | null;
    if (box1Element && box2Element) {
      const getOffsetTop = (el: HTMLElement) => {
        let offset = 0;
        let node: HTMLElement | null = el;
        while (node) {
          offset += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return offset;
      };

      const box1Top = getOffsetTop(box1Element);
      const box2Top = getOffsetTop(box2Element);
      const offset = box2Top - box1Top;
      return Math.max(0, offset);
    }
    return window.innerHeight * 0.8;
  }, []);

  const getPageHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight,
      window.innerHeight
    );
  }, []);

  // 将基线设置为box1底部/box2顶部
  // 注意：如果加载了保存的配置，loadSavedConfig会覆盖这个值
  useEffect(() => {
    if (!canvasRef.current) return;

    const baselineY = getBox1ToBox2Offset();
    canvasRef.current.setBaselineY(baselineY);
  }, [getBox1ToBox2Offset]);

  // 更新植物列表和基线位置（降低频率以减少内存压力）
  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const updatePlants = () => {
      // 检查组件是否已卸载
      if (!isMounted || !canvasRef.current) return;

      const plants = canvasRef.current.getAllBaselinePlants();
      const baseline = canvasRef.current.getBaselineY();

      // 限制baselinePlants数量，防止内存泄漏
      const limitedPlants = plants.slice(0, maxBaselinePlants);

      setBaselinePlants(limitedPlants);
      setBaselineY(baseline);
    };

    // 初始更新
    updatePlants();

    // 定期更新（降低频率）
    interval = setInterval(updatePlants, 2000);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []); // 空依赖数组，确保只创建一次interval

  // Load saved config on mount
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const loadSavedConfig = async () => {
      if (!isMounted || !canvasRef.current) return;

      try {
        const response = await fetch('/api/garden/config?page_id=');
        
        // 检查响应状态
        if (!response.ok) {
          console.warn(`加载配置失败: HTTP ${response.status} ${response.statusText}`);
          // 使用默认基线位置（已在 useEffect 中设置）
          return;
        }

        const data = await response.json();

        if (data.success && data.config) {
          // Set baseline based on layout (box1 -> box2 boundary)
          const baselineY = getBox1ToBox2Offset();
          canvasRef.current.setBaselineY(baselineY);
          canvasRef.current.setBaselineColor(data.config.baseline_color);

          // Load plants if any (limit to protect memory)
          if (data.plants && data.plants.length > 0) {
            const plantsToLoad = data.plants.slice(0, MAX_LOADED_PLANTS);
            canvasRef.current.loadPlants(plantsToLoad);
            if (data.plants.length > MAX_LOADED_PLANTS) {
              setToastMessage(`已加载前 ${MAX_LOADED_PLANTS} 株植物，其余未加载以避免占用过多内存`);
            }
          }
        } else if (data.success) {
          // 有响应但没有配置，使用默认值（已在 useEffect 中设置）
          console.log('没有保存的配置，使用默认值');
        }
      } catch (error: any) {
        // 网络错误或其他错误
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.warn('无法连接到服务器，使用默认配置');
        } else {
          console.error('加载fishbowl配置失败:', error);
        }
        // 使用默认基线位置（已在 useEffect 中设置）
      }
    };

    // Delay loading to ensure canvas is ready
    timer = setTimeout(loadSavedConfig, 500);

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [containerWidth, getBox1ToBox2Offset]);

  // 页面加载时确保从顶部开始
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 简单地确保页面从顶部开始，但不阻止后续滚动
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  // 打开抽屉函数 - 使用 useCallback 固定引用
  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  // 切换侧边栏函数 - 使用 useCallback 固定引用
  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => !prev);
  }, []);

  // Event handlers
  const handleClear = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.clearAllPlants();
    setClearTrigger(prev => prev + 1);
    setToastMessage('已清空所有植物');
  }, []);

  const handleUndo = () => {
      if (canvasRef.current) {
          canvasRef.current.undo();
          setToastMessage("拔掉了上一株植物...");
      }
  };

  const handleSettingsCopied = (copiedSettings: PlantSettings) => {
      try {
          const id = btoa(JSON.stringify(copiedSettings));
          navigator.clipboard.writeText(id);
          setToastMessage("获得了种子!");
      } catch (e) {
          console.error("失败了", e);
      }
  };

  const handleImport = (value: string) => {
    setImportString(value);
    if (!value) return;

    try {
      const decoded = atob(value);
      const parsed = JSON.parse(decoded) as PlantSettings;
      if (parsed.stemColorStart && parsed.type) {
        setSettings(parsed);
        setToastMessage("种下了植物!");

        // Trigger spawn at baseline center
        if (canvasRef.current) {
          // Spawn at center of baseline (use dynamic baseline position)
          const baselineY = getBox1ToBox2Offset();
          const x = window.innerWidth / 2; // Center horizontally

          canvasRef.current.spawn(x, baselineY, parsed, true); // true = on baseline
          setImportString(''); // Clear input on success
        }
      }
    } catch (e) {
      // invalid format
    }
  };

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const baselineY = canvasRef.current.getBaselineY();
      const baselineColor = canvasRef.current.getBaselineColor();
      const plants = canvasRef.current.getAllBaselinePlants();

      // Calculate ratios
      const FIXED_HEIGHT = 1000;
      const baseline_y_ratio = baselineY / FIXED_HEIGHT;

      // getAllBaselinePlants() 已经返回了序列化后的数据，直接使用
      const plantData = plants;

      const response = await fetch('/api/garden/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseline_y_ratio,
          baseline_color: baselineColor,
          plants: plantData,
          page_id: null, // 默认值，与首页/花园共享
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('fishbowl配置已保存');
      } else {
        setToastMessage(`保存失败: ${data.error}`);
      }
    } catch (error) {
      console.error('保存fishbowl配置失败:', error);
      setToastMessage('保存失败，请重试');
    }
  }, [containerWidth]);


  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const baselineY = canvasRef.current.getBaselineY();
      const baselineColor = canvasRef.current.getBaselineColor();
      const plants = canvasRef.current.getAllBaselinePlants();

      const FIXED_HEIGHT = 1000;
      const exportData = {
        baseline_y_ratio: baselineY / FIXED_HEIGHT,
        baseline_color: baselineColor,
        // getAllBaselinePlants() 已经返回了序列化后的数据，直接使用
        plants: plants,
      };

      const exportString = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(exportString);
      setToastMessage('配置已复制到剪贴板');
    } catch (error) {
      console.error('导出配置失败:', error);
      setToastMessage('导出失败');
    }
  }, [containerWidth]);

  const handleReset = async () => {
    if (!canvasRef.current) {
      setToastMessage("画布未初始化");
      return;
    }

    try {
      // 调用 API 加载配置
      const response = await fetch('/api/garden/config?page_id=');
      const data = await response.json();

      if (!data.success) {
        setToastMessage(`加载失败: ${data.error}`);
        return;
      }

      // 设置基准线
      const FIXED_HEIGHT = 1000;
      const baselineY = getBox1ToBox2Offset();
      canvasRef.current.setBaselineY(baselineY);
      canvasRef.current.setBaselineColor(data.config.baseline_color);

      // 加载植物
      if (data.plants && data.plants.length > 0) {
        const plantsToLoad = data.plants.slice(0, MAX_LOADED_PLANTS);
        canvasRef.current.loadPlants(plantsToLoad);

        if (data.plants.length > MAX_LOADED_PLANTS) {
          setToastMessage(`已加载前 ${MAX_LOADED_PLANTS} 株，其余未加载以避免内存占用`);
        } else {
          setToastMessage(`已加载 ${data.plants.length} 株植物`);
        }
      } else {
        canvasRef.current.clearAllPlants();
        setToastMessage("已重置（无保存的植物）");
      }
    } catch (error: any) {
      console.error('加载失败:', error);
      setToastMessage(`加载失败: ${error.message}`);
    }
  };

  // 使用 useMemo 缓存 leftContent，避免每次渲染都创建新元素
  const leftContentElement = useMemo(
    () => (
      <GardenDrawerButton
        onClick={openDrawer}
        expanded={sidebarExpanded}
        onToggle={toggleSidebar}
      />
    ),
    [openDrawer, sidebarExpanded, toggleSidebar]
  );

  // 设置 Header 的 leftContent
  useEffect(() => {
    setLeftContent(leftContentElement);

    return () => {
      setLeftContent(null);
    };
  }, [setLeftContent, leftContentElement]);

  // Container dimensions tracking - 让画布从 box1 顶部开始覆盖到 box2 底部
  useEffect(() => {
    let rafId: number | null = null;

    const updateDimensions = () => {
      if (containerRef.current && canvasRef.current) {
        const width = window.innerWidth;
        const box1ToBox2Offset = getBox1ToBox2Offset();
        const pageHeight = getPageHeight();
        const height = pageHeight + box1ToBox2Offset;

        // 计算 box2 的实际高度（从基线到页面底部）
        const box2Height = pageHeight - box1ToBox2Offset;

        setContainerWidth(width);
        setContainerHeight(height);
        setContainerOffsetTop(box1ToBox2Offset);

        // 保存 box2 高度用于根系渲染
        setBox2Height(box2Height);

        // 更新GardenCanvas的尺寸 - 只覆盖到box2底部，不超过页面高度
        const canvasHeight = Math.min(height, box1ToBox2Offset + box2Height);
        canvasRef.current.updateDimensions(width, canvasHeight);
        // 重新设置基线位置为box1底部/box2顶部
        canvasRef.current.setBaselineY(box1ToBox2Offset);
      }
    };

    const scheduleUpdate = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(updateDimensions);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(document.body);
    const box1Element = document.querySelector('.page-shell-box1') as HTMLElement | null;
    const box2Element = document.querySelector('.page-shell-box2') as HTMLElement | null;
    if (box1Element) resizeObserver.observe(box1Element);
    if (box2Element) resizeObserver.observe(box2Element);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [getBox1ToBox2Offset, getPageHeight]); // 依赖获取尺寸函数

  // 基本的鱼配置
  const [fishConfig] = useState<FishConfig>({
    colors: {
      body: '#991b1b',
      tail: '#991b1b',
      dorsal: '#991b1b',
      eye: '#ffffff',
    },
    behavior: {
      agility: 0.25, // 适中的敏捷度
      energy: 0.4,   // 适中的能量
      scale: 1,
    },
  });



  return (
    <>
      {/* Garden Canvas - 固定在整个页面上，跨越box1和box2 */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: -containerOffsetTop,
          left: 0,
          width: '100vw',
          height: Math.min(containerHeight, (box2Height || 600)) || '100vh',
          pointerEvents: 'none', // 让画布本身不拦截事件
          zIndex: 10, // 在内容之上但在交互之下
          background: 'transparent',
        }}
      >
        <GardenCanvas
          ref={canvasRef}
          settings={settings}
          clearTrigger={clearTrigger}
          onSettingsCopied={handleSettingsCopied}
          viewMode="interactive"
          disableAutoResize={true}
        />

        {/* 根系系统 - 为每个基线植物渲染根系 */}
        <div
          className="absolute top-0 left-0 right-0 w-full"
          style={{ height: `${containerOffsetTop + (box2Height || 600)}px`, zIndex: 2, pointerEvents: 'none' }}
        >
          {baselinePlants.map((plant, index) => {
            const plantX = containerWidth * plant.position_x_ratio;
            return (
              <RootSystem
                key={`root-${index}-${plant.position_x_ratio}`}
                x={plantX}
                baselineY={baselineY}
                dna={plant.dna}
                containerHeight={containerOffsetTop + (box2Height || 600)}
                animationProgress={1}
              />
            );
          })}
        </div>

        {/* UI Overlay: Title */}
        <div className="absolute top-8 w-full text-center pointer-events-none z-30">
          <h1 className="text-3xl md:text-5xl font-serif text-slate-800 tracking-tight drop-shadow-sm opacity-90">
            鱼缸
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            双击试试，左侧挑选植物
          </p>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            长按获得种子，在基准线上种植可拖动
          </p>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: '30vh' }}></div>
      </div>

      {/* 侧边栏 - 在导航下面，整个页面级别 */}
      <GardenSidebar
        settings={settings}
        updateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        applyPreset={(type) => setSettings(getPlantPreset(type))}
        onClear={handleClear}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expanded={sidebarExpanded}
      />

      {/* DNA Input Area & Control Buttons - 在 box2 中 */}
      <div className="relative z-30 w-80 space-y-2 mb-20 mx-auto">
        <div className="flex gap-2">
          {/* <input
            type="text"
            value={importString}
            onChange={(e) => {
              setImportString(e.target.value);
              handleImport(e.target.value);
            }}
            placeholder="复制种子..."
            className="flex-1 px-4 py-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg shadow-sm text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder:text-slate-400"
          /> */}
          <button
            onClick={handleUndo}
            className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg px-3 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
            title="撤销上一株植物"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            保存配置
          </button>
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg hover:bg-white transition-colors text-sm font-medium text-slate-700"
          >
            重置配置
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 基线植物查看器 - 显示动画植物 */}
      {/* 注意：BaselinePlantViewer 需要 BaselinePlant[]，但 getAllBaselinePlants() 返回 PlantRenderData[]
          如果需要显示动画植物，需要从 GardenCanvas 获取 BaselinePlant[] 数据 */}
      {/* 暂时移除，因为类型不匹配 */}
    </>
  );
}
