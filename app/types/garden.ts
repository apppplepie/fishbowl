export enum PlantType {
  VINE = 'VINE',
  PALM = 'PALM',
  GEOMETRIC = 'GEOMETRIC',
  UMBRELLA = 'UMBRELLA',
  BERRY = 'BERRY'
}

export interface PlantSettings {
  type: PlantType;
  // Stem properties
  stemColorStart: string;
  stemColorEnd: string;
  straightness: number;
  curlFactor: number;
  maxLife: number;
  baseWidth: number;
  growthSpeed: number;
  // Leaf properties
  leafColorStart: string;
  leafColorEnd: string;
  leafFrequency: number;
  leafSize: number;
  // Flower properties
  flowerColorStart: string;
  flowerColorEnd: string;
  flowerProbability: number;
  flowerSize: number;
  petalCount: number;
}

export interface Grower {
  id: string;
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
  width: number;
  speed: number;
  color: string;
  settings: PlantSettings;
  noiseOffset: number;
  generation: number;
}

export interface GardenCanvasRef {
  spawn: (x: number, y: number, overrideSettings?: PlantSettings) => void;
}

