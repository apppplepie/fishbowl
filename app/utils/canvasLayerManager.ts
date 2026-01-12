import { BaselinePlant } from '../types/garden';

// ============================================================================
// Canvas 层管理工具
// 负责多层 Canvas 的初始化、缩放和合成
// ============================================================================

export interface CanvasLayers {
  outside: HTMLCanvasElement | null;    // 外部世界层（背景）
  baseline: HTMLCanvasElement | null;   // 基线植物层（前景）
}

export interface CanvasLayerManagerConfig {
  width: number;
  height: number;
  backgroundColor?: string;
}

/**
 * Canvas 层管理器类
 */
export class CanvasLayerManager {
  private layers: CanvasLayers;
  private dpr: number;
  private config: CanvasLayerManagerConfig;

  constructor(layers: CanvasLayers, config: CanvasLayerManagerConfig) {
    this.layers = layers;
    this.config = config;
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * 初始化所有画布层
   */
  initializeLayers(): void {
    const { width, height, backgroundColor = '#fdfbf7' } = this.config;

    [this.layers.outside, this.layers.baseline].forEach((canvas) => {
      if (!canvas) return;

      // 设置物理像素大小（考虑 DPR）
      canvas.width = Math.round(width * this.dpr);
      canvas.height = Math.round(height * this.dpr);

      // 设置 CSS 显示大小
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 缩放上下文以适配 DPR（只缩放一次）
        if (!(canvas as any).__scaled) {
          ctx.scale(this.dpr, this.dpr);
          (canvas as any).__scaled = true;
        }
      }
    });

    // 清空并填充背景
    this.clearOutsideLayer(backgroundColor);
    this.clearBaselineLayer();
  }

  /**
   * 清空外部层并填充背景色
   */
  clearOutsideLayer(backgroundColor: string = '#fdfbf7'): void {
    const canvas = this.layers.outside;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.config.width, this.config.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, this.config.width, this.config.height);
  }

  /**
   * 清空基线层（透明）
   */
  clearBaselineLayer(): void {
    const canvas = this.layers.baseline;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.config.width, this.config.height);
  }

  /**
   * 合成基线植物到基线层
   * @param plants 基线植物数组
   */
  compositeBaselinePlants(plants: BaselinePlant[]): void {
    const canvas = this.layers.baseline;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, this.config.width, this.config.height);

    // 绘制每个植物
    plants.forEach((plant) => {
      // 计算拖拽偏移
      const dx = plant.currentX - plant.originX;
      ctx.drawImage(plant.canvas, dx, 0);
    });
  }

  /**
   * 更新配置（用于 resize）
   */
  updateConfig(config: Partial<CanvasLayerManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * 获取当前配置
   */
  getConfig(): CanvasLayerManagerConfig {
    return { ...this.config };
  }

  /**
   * 获取 DPR
   */
  getDPR(): number {
    return this.dpr;
  }

  /**
   * 重置所有层的缩放标记（用于强制重新缩放）
   */
  resetScaleFlags(): void {
    [this.layers.outside, this.layers.baseline].forEach((canvas) => {
      if (canvas) {
        (canvas as any).__scaled = false;
      }
    });
  }
}

/**
 * 创建离屏 Canvas
 * @param width 宽度
 * @param height 高度
 * @returns 离屏 Canvas 及其上下文
 */
export function createOffscreenCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  return { canvas, ctx };
}

