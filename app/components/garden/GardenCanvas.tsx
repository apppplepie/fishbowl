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
}

const GardenCanvas = forwardRef<GardenCanvasRef, GardenCanvasProps>(
  ({ settings, clearTrigger, onSettingsCopied }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Canvas 层引用
    const canvasOutsideRef = useRef<HTMLCanvasElement>(null);
    const canvasBaselineRef = useRef<HTMLCanvasElement>(null);

    // 状态管理
    const [dimensions, setDimensions] = useState({ width: 0, height: 1000 }); // 固定高度 1000px

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
      baselinePlantsRef.current = [];
      engineRef.current.clearAll();

      // 清空画布
      if (layerManagerRef.current) {
        layerManagerRef.current.clearOutsideLayer('#fdfbf7');
        layerManagerRef.current.clearBaselineLayer();
      }
    }, []);

    /**
     * 加载植物数据
     */
    const loadPlants = useCallback(
      (plantsData: PlantRenderData[]) => {
        clearAllPlants();

        if (!hasInitRef.current || !dimensions.width) {
          pendingSpawnsRef.current = plantsData.map((plantData) => {
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

        plantsData.forEach((plantData) => {
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
    }));

    /**
     * 主更新循环
     */
    const update = useCallback(() => {
      // 更新生长引擎
      engineRef.current.update();

      // 合成基线植物（传递基线位置用于对齐）
      if (layerManagerRef.current) {
        layerManagerRef.current.compositeBaselinePlants(baselinePlantsRef.current, baselineYRef.current);
      }

      requestRef.current = requestAnimationFrame(update);
    }, []);

    /**
     * 初始化和 Resize 处理
     */
    useEffect(() => {
      const handleResize = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.offsetWidth,
            height: FIXED_HEIGHT,
          });
        }
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }, []);

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
          backgroundColor: '#fdfbf7',
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
        layerManagerRef.current.clearOutsideLayer('#fdfbf7');
      }

      // 移除外部层的生长器
      const outCtx = canvasOutsideRef.current?.getContext('2d');
      if (outCtx) {
        engineRef.current.removeByContext(outCtx);
      }
    }, [clearTrigger]);

    /**
     * 交互处理 Hook
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

    return (
      <div
        ref={containerRef}
        className="absolute top-0 left-0 right-0 w-full"
        style={{ height: `${FIXED_HEIGHT}px` }}
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
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ zIndex: 20, touchAction: 'pan-y' }}
          {...handlers}
        />
      </div>
    );
  }
);

GardenCanvas.displayName = 'GardenCanvas';

export default GardenCanvas;
