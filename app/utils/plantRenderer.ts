import { PlantType, PlantSettings } from '../types/garden';
import { lerpColor } from './colorConverter';

// ============================================================================
// 植物绘制工具
// 从 GardenCanvas.tsx 提取，使用策略模式优化
// ============================================================================

/**
 * 绘制叶子
 * @param ctx Canvas 上下文
 * @param x X 坐标
 * @param y Y 坐标
 * @param angle 角度（弧度）
 * @param baseSize 基础大小
 * @param color 颜色
 * @param type 植物类型
 */
export function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  baseSize: number,
  color: string,
  type: PlantType
): void {
  // 添加大小抖动
  const size = baseSize * (0.8 + Math.random() * 0.4);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.shadowBlur = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.05)';
  ctx.shadowOffsetY = 2;

  ctx.beginPath();

  // 根据植物类型绘制不同形状的叶子
  switch (type) {
    case PlantType.PALM:
      drawPalmLeaf(ctx, size);
      break;
    case PlantType.GEOMETRIC:
      drawGeometricLeaf(ctx, size);
      break;
    case PlantType.UMBRELLA:
      drawUmbrellaLeaf(ctx, size);
      break;
    case PlantType.BERRY:
      drawBerryLeaf(ctx, size);
      break;
    default:
      drawDefaultLeaf(ctx, size);
      break;
  }

  ctx.restore();
}

/**
 * 绘制花朵
 * @param ctx Canvas 上下文
 * @param x X 坐标
 * @param y Y 坐标
 * @param baseSize 基础大小
 * @param startColor 起始颜色
 * @param endColor 结束颜色
 * @param petals 花瓣数量
 * @param type 植物类型
 */
export function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseSize: number,
  startColor: string,
  endColor: string,
  petals: number,
  type: PlantType
): void {
  // 大小抖动
  const size = baseSize * (0.85 + Math.random() * 0.3);

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowOffsetY = 2;

  // 根据植物类型绘制不同形状的花朵
  switch (type) {
    case PlantType.GEOMETRIC:
      drawGeometricFlower(ctx, size, startColor, endColor, petals);
      break;
    case PlantType.BERRY:
      drawBerryFlower(ctx, size, startColor, endColor, petals);
      break;
    case PlantType.UMBRELLA:
      drawUmbrellaFlower(ctx, size, startColor, endColor);
      break;
    case PlantType.CLUSTER:
      drawClusterFlower(ctx, size, startColor, endColor, petals);
      break;
    default:
      drawDefaultFlower(ctx, size, startColor, endColor, petals);
      break;
  }

  ctx.restore();
}

// ============================================================================
// 叶子绘制策略
// ============================================================================

/**
 * 棕榈叶（扇形，带筋脉）
 */
function drawPalmLeaf(ctx: CanvasRenderingContext2D, size: number): void {
  const spread = Math.PI / 1.5;
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, size, -spread / 2, spread / 2);
  ctx.lineTo(0, 0);
  ctx.fill();

  // 绘制筋脉
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a = (i * spread) / 6;
    ctx.lineTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
    ctx.stroke();
  }
}

/**
 * 几何叶（菱形）
 */
function drawGeometricLeaf(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.moveTo(0, 0);
  ctx.lineTo(size, -size / 3);
  ctx.lineTo(size * 1.5, 0);
  ctx.lineTo(size, size / 3);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 1.5, 0);
  ctx.stroke();
}

/**
 * 伞形叶（心形）
 */
function drawUmbrellaLeaf(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.rotate(-Math.PI / 2);
  const w = size;
  const h = size * 1.2;
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-w / 2, -h / 4, -w, h / 2, 0, h);
  ctx.bezierCurveTo(w, h / 2, w / 2, -h / 4, 0, 0);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, h * 0.9);
  ctx.stroke();
}

/**
 * 浆果叶（椭圆形）
 */
function drawBerryLeaf(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.ellipse(size / 2, 0, size / 2, size / 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 默认叶子（贝塞尔曲线）
 */
function drawDefaultLeaf(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size / 2, -size / 2, size, -size / 4, size, 0);
  ctx.bezierCurveTo(size, size / 4, size / 2, size / 2, 0, 0);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 0.8, 0);
  ctx.stroke();
}

// ============================================================================
// 花朵绘制策略
// ============================================================================

/**
 * 几何花（星形）
 */
function drawGeometricFlower(
  ctx: CanvasRenderingContext2D,
  size: number,
  startColor: string,
  endColor: string,
  petals: number
): void {
  ctx.fillStyle = lerpColor(startColor, endColor, 0.5);
  ctx.beginPath();
  for (let i = 0; i < petals * 2; i++) {
    const r = i % 2 === 0 ? size : size / 3;
    const a = (i * Math.PI) / petals;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * 浆果花（多个小浆果）
 */
function drawBerryFlower(
  ctx: CanvasRenderingContext2D,
  size: number,
  startColor: string,
  endColor: string,
  petals: number
): void {
  const berryCount = Math.floor(petals) || 3;
  for (let i = 0; i < berryCount; i++) {
    const bx = (Math.random() - 0.5) * size;
    const by = (Math.random() - 0.5) * size;
    const berrySize = size / 3.5;

    // 绘制浆果
    ctx.beginPath();
    ctx.fillStyle = lerpColor(startColor, endColor, Math.random());
    ctx.arc(bx, by, berrySize, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(bx - berrySize / 3, by - berrySize / 3, berrySize / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 伞形花（佛焰苞）
 */
function drawUmbrellaFlower(
  ctx: CanvasRenderingContext2D,
  size: number,
  startColor: string,
  endColor: string
): void {
  ctx.rotate(Math.random() - 0.5);
  ctx.fillStyle = lerpColor(startColor, endColor, 0.2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size / 2, -size, -size * 1.5, -size, 0, -size * 2);
  ctx.bezierCurveTo(size * 1.5, -size, size / 2, -size, 0, 0);
  ctx.fill();

  // 茎
  ctx.strokeStyle = lerpColor(startColor, endColor, 0.9);
  ctx.lineWidth = size / 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size * 1.5);
  ctx.stroke();
}

/**
 * 簇生花（多个小花组成的花簇）
 */
function drawClusterFlower(
  ctx: CanvasRenderingContext2D,
  size: number,
  startColor: string,
  endColor: string,
  petals: number
): void {
  const floretCount = Math.max(8, petals * 2);
  for (let i = 0; i < floretCount; i++) {
    // 随机分布在圆形区域内
    const r = size * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const fx = r * Math.cos(theta);
    const fy = r * Math.sin(theta);

    const floretSize = (size / 5) * (0.8 + Math.random() * 0.4);

    ctx.beginPath();
    ctx.fillStyle = lerpColor(startColor, endColor, Math.random());
    ctx.arc(fx, fy, floretSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 默认花（放射状花瓣）
 */
function drawDefaultFlower(
  ctx: CanvasRenderingContext2D,
  size: number,
  startColor: string,
  endColor: string,
  petals: number
): void {
  const angleStep = (Math.PI * 2) / petals;
  for (let i = 0; i < petals; i++) {
    const petalColor = lerpColor(startColor, endColor, i / petals);
    ctx.fillStyle = petalColor;
    ctx.save();
    ctx.rotate(i * angleStep);
    ctx.beginPath();
    ctx.ellipse(size / 1.5, 0, size / 1.5, size / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 花心
  ctx.fillStyle = '#f59e0b'; // Amber
  ctx.beginPath();
  ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
  ctx.fill();
}

