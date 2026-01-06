'use client';

import { useState, useEffect, useRef } from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';
import Header from '../components/Header';
import PageLayout from '../components/PageLayout';
import GardenCanvas from '../components/garden/GardenCanvas';
import GardenSidebar from '../components/garden/GardenSidebar';
import { GardenDrawerButton } from '../components/garden/GardenDrawerButton';
import { PlantSettings, PlantType, GardenCanvasRef } from '../types/garden';

// Vine: More harmonious natural greens
const PRESET_VINE: PlantSettings = {
    type: PlantType.VINE,
    stemColorStart: '#a3e635', // Lime 400
    stemColorEnd: '#15803d',   // Green 700
    baseWidth: 6,
    growthSpeed: 3,
    maxLife: 280,
    curlFactor: 0.08,
    straightness: 0.4, 
    
    leafColorStart: '#d9f99d', // Lime 200
    leafColorEnd: '#166534',   // Green 800
    leafFrequency: 0.1,
    leafSize: 12,
  
    flowerColorStart: '#fca5a5', 
    flowerColorEnd: '#c4b5fd',   
    flowerProbability: 0.7,
    flowerSize: 20,
    petalCount: 7,
  };
  

// Palm: Big leaves, Thick stem, Earthy Greens
const PRESET_PALM: PlantSettings = {
  type: PlantType.PALM,
  stemColorStart: '#78716c', // Stone grey/brown
  stemColorEnd: '#65a30d',   // Olive
  baseWidth: 10,
  growthSpeed: 2.5,
  maxLife: 350,
  curlFactor: 0.05,
  straightness: 0.7, 
  
  leafColorStart: '#d9f99d', // Light moss
  leafColorEnd: '#14532d',   // Dark green
  leafFrequency: 0.05, // Rarer
  leafSize: 35, // Huge

  flowerColorStart: '#fdba74', // Orange
  flowerColorEnd: '#fcd34d',   // Yellow
  flowerProbability: 0.4,
  flowerSize: 25,
  petalCount: 5,
};

// Geometric: Sharp, Linear, Cool Blues/Greys
const PRESET_GEOMETRIC: PlantSettings = {
  type: PlantType.GEOMETRIC,
  stemColorStart: '#475569', // Slate
  stemColorEnd: '#94a3b8',   // Light slate
  baseWidth: 4,
  growthSpeed: 4,
  maxLife: 300,
  curlFactor: 0, // Unused in geometric
  straightness: 0.9, 
  
  leafColorStart: '#e2e8f0', 
  leafColorEnd: '#64748b',   
  leafFrequency: 0.15,
  leafSize: 10,

  flowerColorStart: '#e0f2fe', 
  flowerColorEnd: '#0ea5e9',   
  flowerProbability: 0.6,
  flowerSize: 15,
  petalCount: 9,
};

// Umbrella: Tall, Solitary, Huge top leaf/bloom
const PRESET_UMBRELLA: PlantSettings = {
  type: PlantType.UMBRELLA,
  stemColorStart: '#064e3b', // Dark Emerald
  stemColorEnd: '#34d399',   // Light Green
  baseWidth: 8,
  growthSpeed: 3,
  maxLife: 400,
  curlFactor: 0.03, // Very straight
  straightness: 0.8, 
  
  leafColorStart: '#047857', 
  leafColorEnd: '#6ee7b7',   
  leafFrequency: 0.01, // Very Rare side leaves
  leafSize: 45, // Massive

  flowerColorStart: '#fef3c7', // Cream
  flowerColorEnd: '#fffbeb',   // White
  flowerProbability: 0.9, // Almost always blooms at top
  flowerSize: 40,
  petalCount: 1, // Special rendering for 1 petal (spathe)
};

// Berry: Twiggy, Woody, Red Fruits
const PRESET_BERRY: PlantSettings = {
  type: PlantType.BERRY,
  stemColorStart: '#422006', // Dark wood
  stemColorEnd: '#a8a29e',   // Grey wood
  baseWidth: 3,
  growthSpeed: 3.5,
  maxLife: 250,
  curlFactor: 0.15, // Erratic
  straightness: 0.3, 
  
  leafColorStart: '#3f6212', // Olive
  leafColorEnd: '#166534',   // Green
  leafFrequency: 0.05, // Sparse leaves
  leafSize: 8, // Small

  flowerColorStart: '#dc2626', // Red
  flowerColorEnd: '#f97316',   // Orange
  flowerProbability: 0.8,
  flowerSize: 12,
  petalCount: 5, // Used as berry count
};

// Cluster: Bushy, Cool Tones, Blue Flower Clusters
const PRESET_CLUSTER: PlantSettings = {
  type: PlantType.CLUSTER,
  stemColorStart: '#334155', // Slate 700
  stemColorEnd: '#94a3b8',   // Slate 400
  baseWidth: 5,
  growthSpeed: 3,
  maxLife: 260,
  curlFactor: 0.1, // Wavy
  straightness: 0.5, 
  
  leafColorStart: '#0f766e', // Teal 700
  leafColorEnd: '#5eead4',   // Teal 300
  leafFrequency: 0.08, 
  leafSize: 10,

  flowerColorStart: '#93c5fd', // Blue 300
  flowerColorEnd: '#1e3a8a',   // Blue 900
  flowerProbability: 0.85,
  flowerSize: 24, // Size of the whole cluster
  petalCount: 12, // Number of florets in cluster
};

export default function GardenPage() {
  const { isMobile } = useResponsive();
  const [settings, setSettings] = useState<PlantSettings>(PRESET_VINE);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importString, setImportString] = useState('');
  
  const canvasRef = useRef<GardenCanvasRef>(null);
  const bottleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (toastMessage) {
          const timer = setTimeout(() => setToastMessage(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toastMessage]);

  // Update canvas with bottle bounds on mount/resize
  useEffect(() => {
      const updateBounds = () => {
          if (bottleRef.current && canvasRef.current) {
              const rect = bottleRef.current.getBoundingClientRect();
              canvasRef.current.updateBottleRect(rect);
          }
      };
      
      // 延迟一次初始测量，避免在 layout 尚未稳定时读取到 0
      requestAnimationFrame(updateBounds);

      window.addEventListener('resize', updateBounds);
      // Also update on scroll since position relative to viewport might change if we use fixed positions,
      // but here bottle flows with document, so rect relative to viewport changes on scroll.
      // However, GardenCanvas uses getBoundingClientRect() inside spawn logic too?
      // Actually GardenCanvas.tsx only uses updateBottleRect to store the rect for drag constraints.
      // Drag constraints need to be fresh if we scroll.
      window.addEventListener('scroll', updateBounds);
      
      return () => {
          window.removeEventListener('resize', updateBounds);
          window.removeEventListener('scroll', updateBounds);
      };
  }, []);

  const updateSettings = (newSettings: Partial<PlantSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const applyPreset = (type: PlantType) => {
      switch (type) {
          case PlantType.PALM:
              setSettings(PRESET_PALM);
              break;
          case PlantType.GEOMETRIC:
              setSettings(PRESET_GEOMETRIC);
              break;
          case PlantType.UMBRELLA:
              setSettings(PRESET_UMBRELLA);
              break;
          case PlantType.BERRY:
              setSettings(PRESET_BERRY);
              break;
          case PlantType.CLUSTER:
              setSettings(PRESET_CLUSTER);
              break;
          case PlantType.VINE:
          default:
              setSettings(PRESET_VINE);
              break;
      }
  };

  const handleClear = () => {
    // Only clears "Outside" layer
    setClearTrigger((prev) => prev + 1);
  };

  const handleUndo = () => {
      if (canvasRef.current) {
          canvasRef.current.undo();
          setToastMessage("Retracted last bottle plant.");
      }
  };

  const handleSettingsCopied = (copiedSettings: PlantSettings) => {
      try {
          const id = btoa(JSON.stringify(copiedSettings));
          navigator.clipboard.writeText(id);
          setToastMessage("Seed DNA copied to clipboard!");
      } catch (e) {
          console.error("Failed to serialize settings", e);
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
        setToastMessage("Seed DNA planted!");
  
        // Trigger spawn at bottle bottom
        if (bottleRef.current && canvasRef.current) {
          // bottle rect (viewport coords)
          const bottleRect = bottleRef.current.getBoundingClientRect();

          // 找到最近的祖先容器，该容器包含画布（GardenCanvas 的 canvases）
          // 从 bottle 向上查找第一个包含 <canvas> 的祖先（更稳）
          let containerEl: HTMLElement | null = bottleRef.current;
          while (containerEl && !containerEl.querySelector('canvas')) {
            containerEl = containerEl.parentElement;
          }
          // 如果没找到包含 canvas 的祖先，退回到 document.body
          const containerRect = containerEl ? containerEl.getBoundingClientRect() : document.body.getBoundingClientRect();

          // 计算 container-relative CSS px 坐标（这就是 GardenCanvas 使用的坐标系）
          const x = (bottleRect.left - containerRect.left) + bottleRect.width / 2;
          const y = (bottleRect.top - containerRect.top) + bottleRect.height - 10;

          // Spawn INSIDE bottle using container-relative coords
          console.log('IMPORT_SPAWN', { bottleRect: bottleRef.current?.getBoundingClientRect(), containerRect, x, y });
          canvasRef.current.spawn(x, y, parsed, true);

          setImportString(''); // Clear input on success
        }
      }
    } catch (e) {
      // invalid format
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
          <div style={{ flex: 1, position: 'relative', minHeight: '140vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            />

            {/* UI Overlay: Title */}
            <div className="absolute top-8 w-full text-center pointer-events-none z-30">
              <h1 className="text-3xl md:text-5xl font-serif text-slate-800 tracking-tight drop-shadow-sm opacity-90">
                The Sketch Garden
              </h1>
              <p className="text-slate-500 mt-2 font-medium text-sm">
                Paste DNA below to grow inside the bottle. Double-click to plant.
              </p>
            </div>

            {/* Spacer to push bottle down */}
            <div style={{ flex: 1, minHeight: '30vh' }}></div>

            {/* Glass Bottle Visual - Moved down significantly via flex spacer above */}
            <div 
              ref={bottleRef}
              className="relative z-20 w-80 h-[280px] border-x-2 border-b-2 border-slate-300/60 bg-white/10 backdrop-blur-[2px] rounded-none shadow-xl pointer-events-none mb-4"
            >
              {/* Rim */}
              <div className="absolute top-0 w-full h-1 bg-slate-300/40"></div>
              {/* Glass Reflections */}
              <div className="absolute top-4 right-8 w-px h-32 bg-white/30 blur-[1px]"></div>
              <div className="absolute top-8 right-6 w-2 h-16 bg-white/10 rounded-full blur-sm"></div>
            </div>

            {/* DNA Input Area & Undo Button */}
            <div className="relative z-30 w-80 flex gap-2 mb-20">
              <input 
                type="text"
                value={importString}
                onChange={(e) => {
                  setImportString(e.target.value);
                  handleImport(e.target.value);
                }}
                placeholder="Paste DNA..."
                className="flex-1 px-4 py-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg shadow-sm text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder:text-slate-400"
              />
              <button
                onClick={handleUndo}
                className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg px-3 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                title="Undo last bottle plant"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
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
