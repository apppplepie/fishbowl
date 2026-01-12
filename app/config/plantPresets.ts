import { PlantSettings, PlantType } from '../types/garden';

// ============================================================================
// 植物预设配置
// 从 app/garden/page.tsx 提取并统一管理
// ============================================================================

/**
 * 藤蔓：和谐的自然绿色
 */
export const PRESET_VINE: PlantSettings = {
  type: PlantType.VINE,
  stemColorStart: '#a3e635', // Lime 400
  stemColorEnd: '#15803d',   // Green 700
  baseWidth: 6,
  growthSpeed: 3,
  maxLife: 140,
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

/**
 * 棕榈：大叶片，粗茎，土色调绿色
 */
export const PRESET_PALM: PlantSettings = {
  type: PlantType.PALM,
  stemColorStart: '#78716c', // Stone grey/brown
  stemColorEnd: '#65a30d',   // Olive
  baseWidth: 10,
  growthSpeed: 2.5,
  maxLife: 175,
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

/**
 * 几何：尖锐、线性、冷色调蓝灰
 */
export const PRESET_GEOMETRIC: PlantSettings = {
  type: PlantType.GEOMETRIC,
  stemColorStart: '#475569', // Slate
  stemColorEnd: '#94a3b8',   // Light slate
  baseWidth: 4,
  growthSpeed: 4,
  maxLife: 150,
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

/**
 * 伞形：高大、独立、巨大顶部叶片/花朵
 */
export const PRESET_UMBRELLA: PlantSettings = {
  type: PlantType.UMBRELLA,
  stemColorStart: '#064e3b', // Dark Emerald
  stemColorEnd: '#34d399',   // Light Green
  baseWidth: 8,
  growthSpeed: 3,
  maxLife: 200,
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

/**
 * 浆果：细枝、木质、红色果实
 */
export const PRESET_BERRY: PlantSettings = {
  type: PlantType.BERRY,
  stemColorStart: '#422006', // Dark wood
  stemColorEnd: '#a8a29e',   // Grey wood
  baseWidth: 3,
  growthSpeed: 3.5,
  maxLife: 125,
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

/**
 * 簇生：灌木状、冷色调、蓝色花簇
 */
export const PRESET_CLUSTER: PlantSettings = {
  type: PlantType.CLUSTER,
  stemColorStart: '#334155', // Slate 700
  stemColorEnd: '#94a3b8',   // Slate 400
  baseWidth: 5,
  growthSpeed: 3,
  maxLife: 130,
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

// ============================================================================
// 预设映射表
// ============================================================================

/**
 * 所有预设的映射表，便于按类型查找
 */
export const PLANT_PRESETS: Record<PlantType, PlantSettings> = {
  [PlantType.VINE]: PRESET_VINE,
  [PlantType.PALM]: PRESET_PALM,
  [PlantType.GEOMETRIC]: PRESET_GEOMETRIC,
  [PlantType.UMBRELLA]: PRESET_UMBRELLA,
  [PlantType.BERRY]: PRESET_BERRY,
  [PlantType.CLUSTER]: PRESET_CLUSTER,
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取指定类型的预设
 * @param type 植物类型
 * @returns 植物预设配置
 */
export function getPlantPreset(type: PlantType): PlantSettings {
  return PLANT_PRESETS[type];
}

/**
 * 获取所有植物类型列表
 */
export function getAllPlantTypes(): PlantType[] {
  return Object.values(PlantType);
}

/**
 * 翻译植物类型为中文
 * @param type 植物类型
 * @returns 中文名称
 */
export function translatePlantType(type: PlantType): string {
  const translations: Record<PlantType, string> = {
    [PlantType.VINE]: '藤蔓',
    [PlantType.PALM]: '棕榈',
    [PlantType.GEOMETRIC]: '几何',
    [PlantType.UMBRELLA]: '伞形',
    [PlantType.BERRY]: '浆果',
    [PlantType.CLUSTER]: '簇生',
  };
  return translations[type] || type;
}

