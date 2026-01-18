'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePageShell } from '../contexts/PageShellContext';
import { useHeader } from '../contexts/HeaderContext';
import { useAppTheme } from '../contexts/AppThemeContext';
import GardenCanvas from '../components/garden/GardenCanvas';
import GardenSidebar from '../components/garden/GardenSidebar';
import { GardenDrawerButton } from '../components/garden/GardenDrawerButton';
import BaselinePlantViewer from '../components/garden/BaselinePlantViewer';
import { PlantSettings, PlantType, GardenCanvasRef, PlantRenderData } from '../types/garden';
import { PRESET_VINE, getPlantPreset } from '../config/plantPresets';
import { convertGradient } from '../utils/colorConverter';
import { FishConfig } from '../components/fish/Sidebar';

const MAX_LOADED_PLANTS = 10; // 避免一次性加载过多离屏 canvas 占满内存

export default function FishbowlPage() {
  const { setConfig } = usePageShell();
  const { setLeftContent } = useHeader();
  const { currentFishbowlTheme } = useAppTheme();
  const [settings, setSettings] = useState<PlantSettings>(PRESET_VINE);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [baselinePlants, setBaselinePlants] = useState<PlantRenderData[]>([]);
  const [baselineY, setBaselineY] = useState<number>(600); // 默认基线位置
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [containerOffsetTop, setContainerOffsetTop] = useState<number>(0);

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
      const box1Top = box1Element.getBoundingClientRect().top;
      const box2Top = box2Element.getBoundingClientRect().top;
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
        const response = await fetch('/api/garden/config?page_id=fishbowl');
        
        // 检查响应状态
        if (!response.ok) {
          console.warn(`加载配置失败: HTTP ${response.status} ${response.statusText}`);
          // 使用默认基线位置（已在 useEffect 中设置）
          return;
        }

        const data = await response.json();

        if (data.success && data.config) {
          // Set baseline
          const FIXED_HEIGHT = 1000;
          const baselineY = FIXED_HEIGHT * data.config.baseline_y_ratio;
          canvasRef.current.setBaselineY(baselineY);
          canvasRef.current.setBaselineColor(data.config.baseline_color);

          // Load plants
          if (data.plants && data.plants.length > 0) {
            const plantsToLoad = data.plants.slice(0, MAX_LOADED_PLANTS);
            plantsToLoad.forEach((plantData: any) => {
              const x = containerWidth * plantData.position_x_ratio;
              const y = baselineY + plantData.position_y_offset;
              canvasRef.current?.spawn(x, y, plantData.dna, true);
            });
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
  }, [containerWidth]);

  // 页面加载时确保从顶部开始
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 简单地确保页面从顶部开始，但不阻止后续滚动
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  // Event handlers
  const handleClear = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.clearAllPlants();
    setClearTrigger(prev => prev + 1);
    setToastMessage('已清空所有植物');
  }, []);

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
          page_id: 'fishbowl',
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

  // Header left content for sidebar toggle
  useEffect(() => {
    setLeftContent(
      <GardenDrawerButton
        expanded={sidebarExpanded}
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
      />
    );

    return () => {
      setLeftContent(null);
    };
  }, [setLeftContent, sidebarExpanded]);

  // Container dimensions tracking - 让画布从 box1 顶部开始覆盖到 box2 底部
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && canvasRef.current) {
        const width = window.innerWidth;
        const box1ToBox2Offset = getBox1ToBox2Offset();
        const pageHeight = getPageHeight();
        const height = pageHeight + box1ToBox2Offset;
        setContainerWidth(width);
        setContainerHeight(height);
        setContainerOffsetTop(box1ToBox2Offset);
        // 更新GardenCanvas的尺寸
        canvasRef.current.updateDimensions(width, height);
        // 重新设置基线位置为box1底部/box2顶部
        canvasRef.current.setBaselineY(box1ToBox2Offset);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
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
          height: containerHeight || '100vh',
          pointerEvents: 'none', // 让画布本身不拦截事件
          zIndex: 10, // 在内容之上但在交互之下
          background: 'transparent',
        }}
      >
        <GardenCanvas
          ref={canvasRef}
          settings={settings}
          clearTrigger={clearTrigger}
          onSettingsCopied={(newSettings) => {
            setSettings(newSettings);
            setToastMessage('植物设置已复制');
          }}
          viewMode="interactive"
        />
      </div>

      {/* Sidebar */}
      <GardenSidebar
        settings={settings}
        updateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        applyPreset={(type) => setSettings(getPlantPreset(type))}
        onClear={handleClear}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expanded={sidebarExpanded}
      />

      {/* Toast Message */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 1000,
            fontSize: '14px',
          }}
        >
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
