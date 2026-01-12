import { useRef, useCallback } from 'react';
import { BaselinePlant, DragState, TouchState, PlantHistoryItem, PlantSettings } from '../types/garden';

// ============================================================================
// 花园交互逻辑 Hook
// 从 GardenCanvas.tsx 提取，处理所有用户交互
// ============================================================================

export interface UseGardenInteractionConfig {
  baselineY: number;                          // 基线Y坐标
  baselineTolerance: number;                  // 基线容差（像素）
  baselinePlants: BaselinePlant[];            // 基线植物数组
  plantHistory: PlantHistoryItem[];           // 植物历史记录
  dimensions: { width: number; height: number }; // 画布尺寸
  onSpawn: (x: number, y: number, isOnBaseline: boolean) => void; // 生成植物回调
  onCopySettings: (settings: PlantSettings) => void; // 复制设置回调
  onDragUpdate?: () => void;                  // 拖拽更新回调（用于重绘）
}

export interface GardenInteractionHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * 花园交互 Hook
 * 处理所有交互逻辑：拖拽、双击、触摸、右键复制等
 */
export function useGardenInteraction(
  config: UseGardenInteractionConfig
): {
  handlers: GardenInteractionHandlers;
  dragState: DragState | null;
} {
  const {
    baselineY,
    baselineTolerance,
    baselinePlants,
    plantHistory,
    dimensions,
    onSpawn,
    onCopySettings,
    onDragUpdate,
  } = config;

  const dragStateRef = useRef<DragState | null>(null);
  const lastTapRef = useRef<TouchState | null>(null);
  const touchStartRef = useRef<TouchState | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);

  const SPAWN_COOLDOWN = 500; // 生成冷却时间（毫秒）
  const DOUBLE_TAP_THRESHOLD = 300; // 双击时间阈值（毫秒）
  const DOUBLE_TAP_DISTANCE = 50; // 双击距离阈值（像素）

  /**
   * 检查点击是否在基线植物上
   */
  const findClickedPlant = useCallback(
    (x: number, y: number): BaselinePlant | null => {
      return (
        baselinePlants.find((p) => {
          const distX = Math.abs(x - p.currentX);
          const distY = Math.abs(y - baselineY);
          // 检查是否在植物的X位置附近，并且在基线上方400px内
          return distX < 40 && distY < 400 && y < baselineY;
        }) || null
      );
    },
    [baselinePlants, baselineY]
  );

  /**
   * 复制最近的植物设置
   */
  const copyNearestPlant = useCallback(
    (x: number, y: number) => {
      let closest: PlantHistoryItem | null = null;
      let minDist = 100;

      for (const item of plantHistory) {
        const dx = item.x - x;
        const dy = item.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closest = item;
        }
      }

      if (closest) {
        onCopySettings(closest.settings);
      }
    },
    [plantHistory, onCopySettings]
  );

  /**
   * 检查是否应该生成植物（冷却检查）
   */
  const shouldSpawnPlant = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastSpawnTimeRef.current < SPAWN_COOLDOWN) {
      return false;
    }
    lastSpawnTimeRef.current = now;
    return true;
  }, []);

  /**
   * 处理指针按下（鼠标/触摸）
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;

      const { clientX, clientY } = e;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // 存储触摸起始位置
      if (e.pointerType === 'touch') {
        touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
      }

      // 检查是否点击在基线植物上（开始拖拽）
      const clickedPlant = findClickedPlant(x, y);
      if (clickedPlant) {
        dragStateRef.current = {
          plantId: clickedPlant.id,
          startX: x,
          plantStartX: clickedPlant.currentX,
        };
        return;
      }

      // 双击检测（仅触摸设备）
      if (e.pointerType === 'touch') {
        const now = Date.now();
        const lastTap = lastTapRef.current;

        if (lastTap && now - lastTap.time < DOUBLE_TAP_THRESHOLD) {
          // 检查两次点击是否足够近
          const dx = x - lastTap.x;
          const dy = y - lastTap.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < DOUBLE_TAP_DISTANCE) {
            // 双击检测成功 - 生成植物
            if (shouldSpawnPlant()) {
              const isOnBaseline = Math.abs(y - baselineY) < baselineTolerance;
              onSpawn(x, y, isOnBaseline);
            }
            lastTapRef.current = null; // 重置
            return;
          }
        }

        // 存储这次点击
        lastTapRef.current = { time: now, x, y };

        // 清除过期的点击记录
        setTimeout(() => {
          if (lastTapRef.current && Date.now() - lastTapRef.current.time > DOUBLE_TAP_THRESHOLD) {
            lastTapRef.current = null;
          }
        }, DOUBLE_TAP_THRESHOLD);
      }
    },
    [
      findClickedPlant,
      shouldSpawnPlant,
      onSpawn,
      baselineY,
      baselineTolerance,
    ]
  );

  /**
   * 处理指针移动（拖拽）
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { clientX } = e;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = clientX - rect.left;

      if (dragStateRef.current) {
        const { plantId, startX, plantStartX } = dragStateRef.current;
        const plant = baselinePlants.find((p) => p.id === plantId);
        if (plant) {
          let newX = plantStartX + (x - startX);

          // 限制在画布范围内
          const padding = 20;
          newX = Math.max(padding, Math.min(dimensions.width - padding, newX));

          plant.currentX = newX;

          // 触发重绘回调
          if (onDragUpdate) {
            onDragUpdate();
          }
        }
      }
    },
    [baselinePlants, dimensions.width, onDragUpdate]
  );

  /**
   * 处理指针抬起（结束拖拽）
   */
  const handlePointerUp = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  /**
   * 处理右键菜单（复制设置）
   */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      copyNearestPlant(x, y);
    },
    [copyNearestPlant]
  );

  /**
   * 处理双击（桌面端生成植物）
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const { clientX, clientY } = e;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (shouldSpawnPlant()) {
        const isOnBaseline = Math.abs(y - baselineY) < baselineTolerance;
        onSpawn(x, y, isOnBaseline);
      }
    },
    [shouldSpawnPlant, onSpawn, baselineY, baselineTolerance]
  );

  /**
   * 处理触摸移动（手势检测）
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // 手势检测：判断是滚动还是拖拽
      if (!touchStartRef.current || !dragStateRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // 如果垂直移动大于水平移动，允许滚动
      if (deltaY > deltaX && deltaY > 10) {
        return;
      }

      // 如果水平移动大于垂直移动，阻止滚动（正在拖拽）
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    },
    []
  );

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
      onContextMenu: handleContextMenu,
      onDoubleClick: handleDoubleClick,
      onTouchMove: handleTouchMove,
    },
    dragState: dragStateRef.current,
  };
}

