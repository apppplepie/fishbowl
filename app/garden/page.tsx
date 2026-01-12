'use client';

import { useState, useEffect, useRef } from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';
import Header from '../components/Header';
import PageLayout from '../components/PageLayout';
import GardenCanvas from '../components/garden/GardenCanvas';
import GardenSidebar from '../components/garden/GardenSidebar';
import { GardenDrawerButton } from '../components/garden/GardenDrawerButton';
import RootSystem from '../components/garden/RootSystem';
import { PlantSettings, PlantType, GardenCanvasRef, PlantRenderData } from '../types/garden';
import { PRESET_VINE, getPlantPreset } from '../config/plantPresets';

const MAX_LOADED_PLANTS = 10; // 避免一次性加载过多离屏 canvas 占满内存

export default function GardenPage() {
  const { isMobile } = useResponsive();
  const [settings, setSettings] = useState<PlantSettings>(PRESET_VINE);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importString, setImportString] = useState('');
  const [baselinePlants, setBaselinePlants] = useState<PlantRenderData[]>([]);
  const [baselineY, setBaselineY] = useState<number>(600); // 默认基线位置
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  
  const canvasRef = useRef<GardenCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (toastMessage) {
          const timer = setTimeout(() => setToastMessage(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toastMessage]);

  // 更新植物列表和基线位置（降低频率以减少内存压力）
  useEffect(() => {
    const updatePlants = () => {
      if (!canvasRef.current) return;
      
      const plants = canvasRef.current.getAllBaselinePlants();
      const baseline = canvasRef.current.getBaselineY();
      setBaselinePlants(plants);
      setBaselineY(baseline);
      
      // 更新容器宽度
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // 初始更新
    const timer = setTimeout(updatePlants, 600);
    
    // 降低更新频率：从 500ms 改为 2000ms（2秒），减少内存压力
    const interval = setInterval(updatePlants, 2000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始调用
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load saved config on mount
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (!canvasRef.current) return;

      try {
        const response = await fetch('/api/garden/config?page_id=');
        const data = await response.json();

        if (data.success && data.config) {
          // Set baseline
          const FIXED_HEIGHT = 1000;
          const baselineY = FIXED_HEIGHT * data.config.baseline_y_ratio;
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
        }
      } catch (error) {
        console.error('加载保存的配置失败:', error);
        // Silently fail on load, user can manually reset
      }
    };

    // Wait a bit for canvas to initialize
    const timer = setTimeout(loadSavedConfig, 500);
    return () => clearTimeout(timer);
  }, []);

  const updateSettings = (newSettings: Partial<PlantSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const applyPreset = (type: PlantType) => {
      setSettings(getPlantPreset(type));
  };

  const handleClear = () => {
    // Only clears "Outside" layer
    setClearTrigger((prev) => prev + 1);
  };

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
          // Spawn at center of baseline (baseline Y is 600 by default, center X)
          const baselineY = 600; // Default baseline position
          const x = window.innerWidth / 2; // Center horizontally
          
          canvasRef.current.spawn(x, baselineY, parsed, true); // true = on baseline
          setImportString(''); // Clear input on success
        }
      }
    } catch (e) {
      // invalid format
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) {
      setToastMessage("画布未初始化");
      return;
    }

    try {
      // 获取当前基准线配置和所有植物
      const baselineY = canvasRef.current.getBaselineY();
      const baselineColor = canvasRef.current.getBaselineColor();
      const plants = canvasRef.current.getAllBaselinePlants();

      // 计算基准线相对高度
      const FIXED_HEIGHT = 1000;
      const baseline_y_ratio = baselineY / FIXED_HEIGHT;

      // 调用 API 保存
      const response = await fetch('/api/garden/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseline_y_ratio,
          baseline_color: baselineColor,
          plants,
          page_id: null, // 花园主页，可以为 null
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(`已保存 ${data.saved.plants_count} 株植物`);
      } else {
        setToastMessage(`保存失败: ${data.error}`);
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      setToastMessage(`保存失败: ${error.message}`);
    }
  };

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
      const baselineY = FIXED_HEIGHT * data.config.baseline_y_ratio;
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
  

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => !prev);
  };

  return (
    <>
      {/* 侧边栏 - 在导航下面，整个页面级别 */}
      <GardenSidebar
        settings={settings}
        updateSettings={updateSettings}
        applyPreset={applyPreset}
        onClear={handleClear}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expanded={sidebarExpanded}
      />

      {/* Header 独立在最顶部 */}
      <Header
        leftContent={
          <GardenDrawerButton 
            onClick={openDrawer} 
            expanded={sidebarExpanded}
            onToggle={toggleSidebar}
          />
        }
      />

      {/* 内容区域 - 根据侧边栏状态调整 margin */}
      <div style={{ marginLeft: isMobile ? 0 : (sidebarExpanded ? '320px' : '0'), transition: 'margin-left 0.3s ease' }}>
        <PageLayout
          box2BgColor="transparent"
          hideBox1={true}
          box2Style={{
            padding: 0,
            position: 'relative',
            display: 'flex',
            minHeight: 'calc(100vh - 45px - 6px)',
            overflow: 'auto',
            background: '#fdfbf7',
          }}
        >
          {/* 画布区域 */}
          <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: '140vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Paper Grain Texture (Subtle) */}
            <div 
              className="absolute inset-0 opacity-[0.4] pointer-events-none z-10 mix-blend-multiply" 
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
              }} 
            />

            <GardenCanvas
              ref={canvasRef}
              settings={settings}
              clearTrigger={clearTrigger}
              onSettingsCopied={handleSettingsCopied}
              viewMode="view"
            />

            {/* 根系系统 - 为每个基线植物渲染根系 */}
            <div 
              className="absolute top-0 left-0 right-0 w-full"
              style={{ height: '1000px', zIndex: 2, pointerEvents: 'none' }}
            >
              {baselinePlants.map((plant, index) => {
                const plantX = containerWidth * plant.position_x_ratio;
                return (
                  <RootSystem
                    key={`root-${index}-${plant.position_x_ratio}`}
                    x={plantX}
                    baselineY={baselineY}
                    dna={plant.dna}
                    containerHeight={1000}
                    animationProgress={1}
                  />
                );
              })}
            </div>

            {/* UI Overlay: Title */}
            <div className="absolute top-8 w-full text-center pointer-events-none z-30">
              <h1 className="text-3xl md:text-5xl font-serif text-slate-800 tracking-tight drop-shadow-sm opacity-90">
                花园
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

            {/* DNA Input Area & Control Buttons */}
            <div className="relative z-30 w-80 space-y-2 mb-20">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={importString}
                  onChange={(e) => {
                    setImportString(e.target.value);
                    handleImport(e.target.value);
                  }}
                  placeholder="复制种子..."
                  className="flex-1 px-4 py-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg shadow-sm text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder:text-slate-400"
                />
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
          </div>
        </PageLayout>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce">
          {toastMessage}
        </div>
      )}
    </>
  );
}
