import { Grower, PlantSettings, PlantType } from '../types/garden';
import { noiseGenerator } from '../utils/noise';
import { lerpColor } from '../utils/colorConverter';
import { drawLeaf, drawFlower } from '../utils/plantRenderer';

// ============================================================================
// 植物生长引擎
// 从 GardenCanvas.tsx 提取，负责管理植物生长逻辑
// ============================================================================

/**
 * 植物生长引擎类
 * 负责：
 * - 创建生长器（Grower）
 * - 更新生长器状态
 * - 管理生长器生命周期
 * - 生成分支和花朵
 */
export class PlantGrowthEngine {
  private growers: Grower[] = [];

  /**
   * 创建一个新的生长器
   * @param x 起始X坐标
   * @param y 起始Y坐标
   * @param plantSettings 植物设置
   * @param ctx Canvas上下文
   * @param generation 代数（0为主茎，1为分支）
   * @param initialAngle 初始角度（可选）
   * @returns 新创建的生长器
   */
  createGrower(
    x: number,
    y: number,
    plantSettings: PlantSettings,
    ctx: CanvasRenderingContext2D,
    generation: number = 0,
    initialAngle?: number
  ): Grower {
    const baseAngle = -Math.PI / 2; // 默认向上
    const startAngle = initialAngle ?? (baseAngle + (Math.random() * 0.2 - 0.1));

    const grower: Grower = {
      id: this.generateId(),
      x,
      y,
      angle: startAngle,
      life: 0,
      maxLife: plantSettings.maxLife / (generation + 1),
      width: plantSettings.baseWidth / (generation + 1),
      speed: plantSettings.growthSpeed,
      color: plantSettings.stemColorStart,
      settings: plantSettings,
      noiseOffset: Math.random() * 1000,
      generation,
      ctx,
      hasAttemptedFlower: false,
    };

    return grower;
  }

  /**
   * 添加生长器到引擎
   * @param grower 生长器实例
   */
  addGrower(grower: Grower): void {
    this.growers.push(grower);
  }

  /**
   * 批量添加生长器
   * @param growers 生长器数组
   */
  addGrowers(growers: Grower[]): void {
    this.growers.push(...growers);
  }

  /**
   * 创建并添加生长器
   */
  spawnGrower(
    x: number,
    y: number,
    plantSettings: PlantSettings,
    ctx: CanvasRenderingContext2D,
    generation: number = 0,
    initialAngle?: number
  ): Grower {
    const grower = this.createGrower(x, y, plantSettings, ctx, generation, initialAngle);
    this.addGrower(grower);
    return grower;
  }

  /**
   * 更新所有生长器（主更新循环）
   */
  update(): void {
    const newGrowers: Grower[] = [];

    this.growers.forEach((grower) => {
      const { settings, life, maxLife, ctx } = grower;

      // 设置上下文
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';

      // 生长完成：尝试生成花朵
      if (life >= maxLife || grower.width < 0.1) {
        if (!grower.hasAttemptedFlower) {
          if (grower.generation < 2 && Math.random() < settings.flowerProbability) {
            drawFlower(
              ctx,
              grower.x,
              grower.y,
              settings.flowerSize,
              settings.flowerColorStart,
              settings.flowerColorEnd,
              settings.petalCount,
              settings.type
            );
          }
          grower.hasAttemptedFlower = true;
        }
        grower.life++;
        return;
      }

      const progress = life / maxLife;

      // 更新生长角度（根据植物类型）
      this.updateGrowthAngle(grower, progress);

      // 计算下一位置
      const nextX = grower.x + Math.cos(grower.angle) * grower.speed;
      const nextY = grower.y + Math.sin(grower.angle) * grower.speed;

      // 绘制茎段
      this.drawStem(grower, nextX, nextY, progress);

      // 生成叶子
      if (Math.random() < settings.leafFrequency) {
        this.generateLeaf(grower, progress);
      }

      // 生成分支
      const branchGrower = this.tryGenerateBranch(grower);
      if (branchGrower) {
        newGrowers.push(branchGrower);
      }

      // 更新位置
      grower.x = nextX;
      grower.y = nextY;
      grower.life++;
    });

    // 添加新生成的分支
    this.addGrowers(newGrowers);

    // 移除已死亡的生长器
    this.growers = this.growers.filter((g) => g.life < g.maxLife + 50);
  }

  /**
   * 更新生长角度（根据植物类型使用不同策略）
   */
  private updateGrowthAngle(grower: Grower, progress: number): void {
    const { settings, life } = grower;

    switch (settings.type) {
      case PlantType.GEOMETRIC:
        // 几何：随机直角转向
        if (Math.random() < 0.05) {
          grower.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 6);
        }
        const targetAngleGeometric = -Math.PI / 2;
        grower.angle += (targetAngleGeometric - grower.angle) * 0.02;
        break;

      case PlantType.BERRY:
      case PlantType.CLUSTER:
        // 浆果和簇生：使用噪声，保持向上趋势
        const n = noiseGenerator.noise(
          grower.x * 0.02,
          grower.y * 0.02,
          grower.noiseOffset + life * 0.05
        );
        const angleChange = n * (settings.curlFactor * 2);
        grower.angle += angleChange;

        // 修正向上
        const targetAngleUpward = -Math.PI / 2;
        const correctionStrength = settings.type === PlantType.CLUSTER ? 0.05 : 0.02;
        grower.angle += (targetAngleUpward - grower.angle) * correctionStrength;
        break;

      default:
        // 默认：早期笔直，后期使用噪声
        if (progress < settings.straightness) {
          const targetAngle = -Math.PI / 2;
          const correction = (targetAngle - grower.angle) * 0.1;
          const wobble = (Math.random() - 0.5) * 0.05;
          grower.angle += correction + wobble;
        } else {
          const nDefault = noiseGenerator.noise(
            grower.x * 0.01,
            grower.y * 0.01,
            grower.noiseOffset + life * 0.02
          );
          const angleChangeDefault = nDefault * settings.curlFactor;
          grower.angle += angleChangeDefault;
        }
        break;
    }
  }

  /**
   * 绘制茎段
   */
  private drawStem(grower: Grower, nextX: number, nextY: number, progress: number): void {
    const { ctx, settings } = grower;
    const stemColor = lerpColor(settings.stemColorStart, settings.stemColorEnd, progress);

    ctx.beginPath();
    ctx.moveTo(grower.x, grower.y);
    ctx.lineTo(nextX, nextY);

    const currentWidth = grower.width * (1 - progress);
    ctx.lineWidth = Math.max(0.5, currentWidth);
    ctx.strokeStyle = stemColor;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  /**
   * 生成叶子
   */
  private generateLeaf(grower: Grower, progress: number): void {
    const { settings, ctx } = grower;
    let leafAngle = grower.angle;

    // 根据植物类型调整叶子角度
    switch (settings.type) {
      case PlantType.PALM:
        leafAngle += Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3;
        break;
      case PlantType.GEOMETRIC:
        leafAngle += Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
        break;
      case PlantType.UMBRELLA:
        leafAngle += Math.random() - 0.5;
        break;
      default:
        leafAngle += (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() * 0.5 - 0.25);
        break;
    }

    const leafColor = lerpColor(settings.leafColorStart, settings.leafColorEnd, progress);
    drawLeaf(ctx, grower.x, grower.y, leafAngle, settings.leafSize, leafColor, settings.type);
  }

  /**
   * 尝试生成分支
   * @returns 新生成的分支生长器，如果没有生成则返回 null
   */
  private tryGenerateBranch(grower: Grower): Grower | null {
    const { settings, generation, ctx } = grower;

    if (generation >= 2) {
      return null; // 最多2代
    }

    // 根据植物类型确定分支概率
    let branchChance = 0.015;
    switch (settings.type) {
      case PlantType.PALM:
        branchChance = 0.005;
        break;
      case PlantType.GEOMETRIC:
        branchChance = 0.04;
        break;
      case PlantType.UMBRELLA:
        branchChance = 0.002;
        break;
      case PlantType.BERRY:
        branchChance = 0.04;
        break;
      case PlantType.CLUSTER:
        branchChance = 0.025;
        break;
    }

    if (Math.random() > branchChance) {
      return null;
    }

    // 确定分支角度
    let branchAngleOffset = 0.6;
    switch (settings.type) {
      case PlantType.GEOMETRIC:
        branchAngleOffset = 0.8;
        break;
      case PlantType.BERRY:
        branchAngleOffset = 0.9;
        break;
      case PlantType.CLUSTER:
        branchAngleOffset = 0.5;
        break;
    }

    const branchAngle = grower.angle + (Math.random() > 0.5 ? branchAngleOffset : -branchAngleOffset);
    return this.createGrower(grower.x, grower.y, settings, ctx, generation + 1, branchAngle);
  }

  /**
   * 获取所有活动的生长器
   */
  getActiveGrowers(): Grower[] {
    return this.growers;
  }

  /**
   * 获取生长器数量
   */
  getGrowerCount(): number {
    return this.growers.length;
  }

  /**
   * 清除所有生长器
   */
  clearAll(): void {
    this.growers = [];
  }

  /**
   * 移除指定上下文的生长器
   * @param ctx Canvas上下文
   */
  removeByContext(ctx: CanvasRenderingContext2D): void {
    this.growers = this.growers.filter((g) => g.ctx !== ctx);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

