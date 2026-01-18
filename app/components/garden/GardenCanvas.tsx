import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { 
  GardenCanvasRef, 
  PlantSettings, 
  BaselinePlant, 
  PlantHistoryItem,
  PlantRenderData 
} from '../../types/garden';
import { PlantGrowthEngine } from '../../engine/PlantGrowthEngine';
import { CanvasLayerManager, createOffscreenCanvas } from '../../utils/canvasLayerManager';
import { useGardenInteraction } from '../../hooks/useGardenInteraction';

// ============================================================================
// GardenCanvas - 重构版本
// 使用新的 Engine、Utils 和 Hooks，大幅简化代码
// ============================================================================

interface GardenCanvasProps {
  settings: PlantSettings;
  clearTrigger: number;
  onSettingsCopied: (settings: PlantSettings) => void;
  viewMode?: 'interactive' | 'view'; // 浏览模式：'interactive' 可交互，'view' 仅浏览
  disableAutoResize?: boolean; // 外部控制尺寸时禁用内部 resize 逻辑
}

const GardenCanvas = forwardRef<GardenCanvasRef, GardenCanvasProps>(
  ({ settings, clearTrigger, onSettingsCopied, viewMode = 'interactive', disableAutoResize = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Canvas 层引用
    const canvasOutsideRef = useRef<HTMLCanvasElement>(null);
    const canvasBaselineRef = useRef<HTMLCanvasElement>(null);

    // 状态管理 - 现在使用视窗高度而不是固定高度
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // 核心引擎和管理器
    const engineRef = useRef<PlantGrowthEngine>(new PlantGrowthEngine());
    const layerManagerRef = useRef<CanvasLayerManager | null>(null);

    // 数据引用
    const baselinePlantsRef = useRef<BaselinePlant[]>([]);
    const plantHistoryRef = useRef<PlantHistoryItem[]>([]);

    // 配置
    const baselineYRef = useRef<number>(600); // 默认基线位置
    const baselineColorRef = useRef<string>('rgba(0, 0, 0, 0.1)');
    const BASELINE_TOLERANCE = 20;
    const FIXED_HEIGHT = 1000;

    // 初始化标记
    const hasInitRef = useRef(false);
    const pendingSpawnsRef = useRef<Array<() => void>>([]);
    const requestRef = useRef<number | null>(null);
    const lastSpawnTimeRef = useRef<number>(0);
    const SPAWN_COOLDOWN = 500;
    const MAX_BASELINE_PLANTS = 10; // 防止加载过多离屏 canvas 占满内存

    /**
     * 生成植物
     */
    const spawnPlant = useCallback(
      (x: number, y: number, overrideSettings?: PlantSettings, isOnBaseline: boolean = false, skipCooldown: boolean = false) => {
        const s = overrideSettings || settings;

        // 冷却检查
        if (!skipCooldown) {
          const now = Date.now();
          if (now - lastSpawnTimeRef.current < SPAWN_COOLDOWN) {
            return;
          }
          lastSpawnTimeRef.current = now;
        }

        // 如果画布未初始化，延迟执行
        if (!hasInitRef.current) {
          pendingSpawnsRef.current.push(() => spawnPlant(x, y, overrideSettings, isOnBaseline, skipCooldown));
          return;
        }

        // 保存到历史
        plantHistoryRef.current.push({
          x,
          y,
          settings: { ...s },
          timestamp: Date.now(),
        });
        if (plantHistoryRef.current.length > 50) plantHistoryRef.current.shift();

        if (isOnBaseline) {
          // 避免过多离屏 canvas 导致内存爆炸
          if (baselinePlantsRef.current.length >= MAX_BASELINE_PLANTS) {
            console.warn(`Baseline plant limit (${MAX_BASELINE_PLANTS}) reached, skip spawn to protect memory.`);
            return;
          }

          // 创建离屏 canvas
          const result = createOffscreenCanvas(dimensions.width, dimensions.height);
          if (result) {
            const { canvas: offCanvas, ctx: offCtx } = result;
            const plantId = Math.random().toString(36).substr(2, 9);

            const newBaselinePlant: BaselinePlant = {
              id: plantId,
              originX: x,
              currentX: x,
              y: baselineYRef.current,
              canvas: offCanvas,
              ctx: offCtx,
              settings: s,
            };

            baselinePlantsRef.current.push(newBaselinePlant);
            engineRef.current.spawnGrower(x, baselineYRef.current, s, offCtx);
          }
        } else {
          // 在外部层生成
          const ctx = canvasOutsideRef.current?.getContext('2d');
          if (ctx) {
            engineRef.current.spawnGrower(x, y, s, ctx);
          }
        }
      },
      [settings, dimensions]
    );

    /**
     * 撤销最后一个基线植物
     */
    const undoLastBaselinePlant = useCallback(() => {
      const popped = baselinePlantsRef.current.pop();
      if (popped) {
        engineRef.current.removeByContext(popped.ctx);
        // 释放离屏 canvas 内存
        if (popped.canvas) {
          popped.canvas.width = 1;
          popped.canvas.height = 1;
        }
      }
    }, []);

    /**
     * 获取所有基线植物数据
     */
    const getAllBaselinePlants = useCallback((): PlantRenderData[] => {
      const containerWidth = dimensions.width || 1000;
      const baselineY = baselineYRef.current;

      return baselinePlantsRef.current.map((plant) => {
        const position_x_ratio = plant.currentX / containerWidth;
        const position_y_offset = baselineY - plant.y;

        return {
          position_x_ratio,
          position_y_offset,
          dna: plant.settings,
        };
      });
    }, [dimensions.width]);

    /**
     * 清除所有植物
     */
    const clearAllPlants = useCallback(() => {
      // 主动释放离屏 canvas 内存
      baselinePlantsRef.current.forEach((plant) => {
        if (plant.canvas) {
          plant.canvas.width = 1;
          plant.canvas.height = 1;
        }
        // 从引擎中移除
        if (plant.ctx) {
          engineRef.current.removeByContext(plant.ctx);
        }
      });

      baselinePlantsRef.current = [];
      engineRef.current.clearAll();

      // 清空画布
      if (layerManagerRef.current) {
        layerManagerRef.current.clearOutsideLayer();
        layerManagerRef.current.clearBaselineLayer();
      }
    }, []);

    /**
     * 加载植物数据
     */
    const loadPlants = useCallback(
      (plantsData: PlantRenderData[]) => {
        clearAllPlants();

        // 限制加载数量，避免一次性加载过多离屏 canvas
        const trimmedPlants = plantsData.slice(0, MAX_BASELINE_PLANTS);

        if (!hasInitRef.current || !dimensions.width) {
          pendingSpawnsRef.current = trimmedPlants.map((plantData) => {
            return () => {
              const containerWidth = dimensions.width || 1000;
              const baselineY = baselineYRef.current;
              const x = containerWidth * plantData.position_x_ratio;
              const y = baselineY + plantData.position_y_offset;
              spawnPlant(x, y, plantData.dna, true, true);
            };
          });
          return;
        }

        const containerWidth = dimensions.width;
        const baselineY = baselineYRef.current;

        trimmedPlants.forEach((plantData) => {
          const x = containerWidth * plantData.position_x_ratio;
          const y = baselineY + plantData.position_y_offset;
          spawnPlant(x, y, plantData.dna, true, true);
        });
      },
      [dimensions.width, clearAllPlants, spawnPlant]
    );

    /**
     * 暴露的接口
     */
    useImperativeHandle(ref, () => ({
      spawn: spawnPlant,
      undo: undoLastBaselinePlant,
      setBaselineY: (y: number) => {
        baselineYRef.current = y;
      },
      setBaselineColor: (color: string) => {
        baselineColorRef.current = color;
      },
      getBaselineY: () => baselineYRef.current,
      getBaselineColor: () => baselineColorRef.current,
      getAllBaselinePlants,
      clearAllPlants,
      loadPlants,
      updateDimensions: (width: number, height: number) => {
        setDimensions({ width, height });
      },
    }));

    /**
     * 主更新循环
     * 使用 ref 来避免闭包问题，确保总是使用最新的值
     */
    const update = useCallback(() => {
      // 更新生长引擎
      engineRef.current.update();

      // 合成基线植物（传递基线位置用于对齐）
      if (layerManagerRef.current) {
        layerManagerRef.current.compositeBaselinePlants(baselinePlantsRef.current, baselineYRef.current);
      }

      // 检查组件是否已卸载
      if (requestRef.current !== null) {
        requestRef.current = requestAnimationFrame(update);
      }
    }, []);

    /**
     * 初始化和 Resize 处理
     * 实现防抖、区分真实 resize 和地址栏变化、延迟处理
     */
    useEffect(() => {
      if (disableAutoResize) return;
      let resizeTimer: NodeJS.Timeout | null = null;
      let scrollEndTimer: NodeJS.Timeout | null = null;
      let lastWidth = 0;
      let lastHeight = 0;
      let isScrolling = false;

      // 记录初始尺寸
      if (containerRef.current) {
        lastWidth = containerRef.current.offsetWidth;
        lastHeight = window.innerHeight;
      }

      // 检测滚动结束
      const handleScroll = () => {
        isScrolling = true;
        if (scrollEndTimer) {
          clearTimeout(scrollEndTimer);
        }
        scrollEndTimer = setTimeout(() => {
          isScrolling = false;
          // 滚动结束后，检查是否需要更新尺寸
          if (containerRef.current) {
            const currentWidth = containerRef.current.offsetWidth;
            // 只有在宽度真正变化时才更新
            if (Math.abs(currentWidth - lastWidth) > 1) {
              setDimensions({
                width: currentWidth,
                height: FIXED_HEIGHT,
              });
              lastWidth = currentWidth;
            }
          }
        }, 150); // 滚动结束后 150ms 再处理
      };

      const handleResize = () => {
        if (!containerRef.current) return;

        const currentWidth = containerRef.current.offsetWidth;
        const currentHeight = window.innerHeight;
        const widthChanged = Math.abs(currentWidth - lastWidth) > 1;
        const heightChanged = Math.abs(currentHeight - lastHeight) > 1;

        // 如果只是高度变化（可能是地址栏显示/隐藏），且宽度没变，忽略
        if (heightChanged && !widthChanged) {
          lastHeight = currentHeight;
          return;
        }

        // 如果正在滚动，延迟处理
        if (isScrolling) {
          return;
        }

        // 防抖处理：清除之前的定时器
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }

        // 延迟执行 resize，避免频繁触发
        resizeTimer = setTimeout(() => {
          if (containerRef.current) {
            const finalWidth = containerRef.current.offsetWidth;
            // 再次检查宽度是否真的变化了（防止在延迟期间又变化）
            if (Math.abs(finalWidth - lastWidth) > 1) {
              setDimensions({
                width: finalWidth,
                height: FIXED_HEIGHT,
              });
              lastWidth = finalWidth;
              lastHeight = window.innerHeight;
            }
          }
        }, 200); // 200ms 防抖延迟
      };

      // 初始调用
      handleResize();

      // 监听事件
      window.addEventListener('resize', handleResize);
      // 同时监听 window 和 document 的滚动，确保捕获所有滚动事件
      window.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });
      // 也监听 touchmove 来检测触摸滚动
      window.addEventListener('touchmove', handleScroll, { passive: true });
      document.addEventListener('touchmove', handleScroll, { passive: true });

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('scroll', handleScroll);
        window.removeEventListener('touchmove', handleScroll);
        document.removeEventListener('touchmove', handleScroll);
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        if (scrollEndTimer) {
          clearTimeout(scrollEndTimer);
        }
      };
    }, [disableAutoResize]);

    /**
     * Canvas 初始化
     */
    useEffect(() => {
      if (!dimensions.width || !dimensions.height) {
        hasInitRef.current = false;
        return;
      }

      // 停止现有动画循环
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }

      // 初始化层管理器
      layerManagerRef.current = new CanvasLayerManager(
        {
          outside: canvasOutsideRef.current,
          baseline: canvasBaselineRef.current,
        },
        {
          width: dimensions.width,
          height: dimensions.height,
        }
      );

      layerManagerRef.current.initializeLayers();

      // 标记初始化完成
      hasInitRef.current = true;

      // 执行挂起的 spawn
      if (pendingSpawnsRef.current.length > 0) {
        pendingSpawnsRef.current.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            console.error('Failed to execute pending spawn:', e);
          }
        });
        pendingSpawnsRef.current = [];
      }

      // 启动动画循环
      requestRef.current = requestAnimationFrame(update);

      return () => {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
      };
    }, [dimensions, update]);

    /**
     * 清除触发器处理
     */
    useEffect(() => {
      if (layerManagerRef.current) {
        layerManagerRef.current.clearOutsideLayer();
      }

      // 移除外部层的生长器
      const outCtx = canvasOutsideRef.current?.getContext('2d');
      if (outCtx) {
        engineRef.current.removeByContext(outCtx);
      }
    }, [clearTrigger]);

    /**
     * 组件卸载时的资源清理
     * 确保所有资源在组件卸载时被正确释放，防止内存泄漏
     */
    useEffect(() => {
      return () => {
        // 1. 停止动画循环
        if (requestRef.current !== null) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }

        // 2. 清空挂起的生成函数
        pendingSpawnsRef.current = [];

        // 3. 释放所有离屏 Canvas 内存
        baselinePlantsRef.current.forEach((plant) => {
          if (plant.canvas) {
            plant.canvas.width = 1;
            plant.canvas.height = 1;
          }
          // 从引擎中移除
          if (plant.ctx) {
            engineRef.current.removeByContext(plant.ctx);
          }
        });
        baselinePlantsRef.current = [];

        // 4. 清理引擎
        engineRef.current.clearAll();

        // 5. 清理层管理器
        if (layerManagerRef.current) {
          layerManagerRef.current.clearOutsideLayer();
          layerManagerRef.current.clearBaselineLayer();
          layerManagerRef.current = null;
        }

        // 6. 清空历史记录
        plantHistoryRef.current = [];

        // 7. 重置初始化标记
        hasInitRef.current = false;
      };
    }, []);

    /**
     * 交互处理 Hook（仅在交互模式下启用）
     */
    const { handlers } = useGardenInteraction({
      baselineY: baselineYRef.current,
      baselineTolerance: BASELINE_TOLERANCE,
      baselinePlants: baselinePlantsRef.current,
      plantHistory: plantHistoryRef.current,
      dimensions,
      onSpawn: (x, y, isOnBaseline) => spawnPlant(x, y, undefined, isOnBaseline),
      onCopySettings: onSettingsCopied,
      onDragUpdate: () => {
        // 触发重绘
        if (layerManagerRef.current) {
          layerManagerRef.current.compositeBaselinePlants(baselinePlantsRef.current, baselineYRef.current);
        }
      },
    });

    // 浏览模式：禁用所有交互事件
    const emptyHandlers = {
      onPointerDown: () => {},
      onPointerMove: () => {},
      onPointerUp: () => {},
      onPointerLeave: () => {},
      onContextMenu: () => {},
      onDoubleClick: () => {},
      onTouchMove: () => {},
    };

    return (
      <div
        ref={containerRef}
        className="absolute top-0 left-0 right-0 w-full"
        style={{ height: `${dimensions.height || FIXED_HEIGHT}px` }}
      >
        {/* Layer 1: Outside World (Background) */}
        <canvas
          ref={canvasOutsideRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        />

        {/* Layer 2: Baseline Plants (Foreground, Transparent) */}
        <canvas
          ref={canvasBaselineRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        />

        {/* Baseline Visualization */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${baselineYRef.current}px`,
            height: '1px',
            backgroundColor: baselineColorRef.current,
            zIndex: 5,
          }}
        />

        {/* Layer 3: Interaction Layer (Transparent, Handles Events) */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            zIndex: 20,
            touchAction: viewMode === 'view' ? 'none' : 'pan-y',
            cursor: viewMode === 'view' ? 'default' : 'crosshair',
            pointerEvents: viewMode === 'view' ? 'none' : 'auto',
          }}
          {...(viewMode === 'view' ? emptyHandlers : handlers)}
        />
      </div>
    );
  }
);

GardenCanvas.displayName = 'GardenCanvas';

export default GardenCanvas;
