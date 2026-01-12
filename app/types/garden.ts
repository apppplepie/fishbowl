// ============================================================================
// 基础类型定义
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export enum PlantType {
  VINE = 'VINE',
  PALM = 'PALM',
  GEOMETRIC = 'GEOMETRIC',
  UMBRELLA = 'UMBRELLA',
  BERRY = 'BERRY',
  CLUSTER = 'CLUSTER'
}

// ============================================================================
// 植物配置和DNA
// ============================================================================

export interface PlantSettings {
  type: PlantType; // Type of generator
  
  // Stem
  stemColorStart: string;
  stemColorEnd: string;
  baseWidth: number;
  growthSpeed: number;
  maxLife: number;
  curlFactor: number; // How much noise affects direction
  straightness: number; // 0-1: Percentage of life spent growing straight up
  
  // Leaves
  leafColorStart: string;
  leafColorEnd: string;
  leafFrequency: number; // Chance per frame to spawn a leaf
  leafSize: number;

  // Flowers
  flowerColorStart: string;
  flowerColorEnd: string;
  flowerProbability: number; // Chance to spawn flower on death
  flowerSize: number;
  petalCount: number;
}

// ============================================================================
// 植物实例类型（统一 BaselinePlant 定义）
// ============================================================================

/**
 * 基线植物实例
 * 统一了 app/page.tsx、GardenCanvas.tsx、BaselinePlantViewer.tsx 中的定义
 */
export interface BaselinePlant {
  id: string;
  originX: number;        // 原始生成位置（用于生长逻辑）
  currentX: number;       // 当前显示位置（可拖拽）
  y: number;              // Y坐标（通常是基线位置）
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  settings: PlantSettings; // 植物DNA
  height?: number;        // 当前高度（用于生长动画，可选）
}

/**
 * 植物序列化数据（用于保存/加载）
 */
export interface PlantRenderData {
  position_x_ratio: number;   // 相对容器宽度的X位置比例
  position_y_offset: number;  // 相对基线的Y偏移量
  dna: PlantSettings;          // 植物DNA
}

// ============================================================================
// 植物生长器（引擎内部使用）
// ============================================================================

export interface Grower {
  id: string;
  x: number;
  y: number;
  angle: number; // in radians
  life: number;
  maxLife: number;
  width: number;
  speed: number;
  color: string; // Current cached color to avoid recalculating every frame if not needed, or just unused
  settings: PlantSettings;
  noiseOffset: number;
  generation: number; // 0 for main stem, 1 for branch
  ctx: CanvasRenderingContext2D; // Direct reference to the context to draw on
  hasAttemptedFlower?: boolean;
}

// ============================================================================
// Canvas 相关类型
// ============================================================================

/**
 * 拖拽状态
 */
export interface DragState {
  plantId: string;
  startX: number;
  plantStartX: number;
}

/**
 * 触摸状态（用于双击和手势检测）
 */
export interface TouchState {
  x: number;
  y: number;
  time: number;
}

/**
 * 植物历史记录（用于右键复制）
 */
export interface PlantHistoryItem {
  x: number;
  y: number;
  settings: PlantSettings;
  timestamp: number;
}

// ============================================================================
// 组件 Props 和 Ref 接口
// ============================================================================

/**
 * GardenCanvas 对外暴露的接口
 */
export interface GardenCanvasRef {
  spawn: (x: number, y: number, settings?: PlantSettings, isOnBaseline?: boolean) => void;
  undo: () => void;
  setBaselineY: (y: number) => void;
  setBaselineColor: (color: string) => void;
  getBaselineY: () => number;
  getBaselineColor: () => string;
  getAllBaselinePlants: () => PlantRenderData[];
  clearAllPlants: () => void;
  loadPlants: (plantsData: PlantRenderData[]) => void;
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 颜色 RGB 值
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

