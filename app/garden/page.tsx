'use client';

import { useState } from 'react';
import GardenCanvas from '../components/garden/GardenCanvas';
import Controls from '../components/garden/Controls';
import { PlantSettings, PlantType } from '../types/garden';

// Default presets for each plant type
const getPreset = (type: PlantType): PlantSettings => {
  const base: PlantSettings = {
    type,
    stemColorStart: '#2d5016',
    stemColorEnd: '#5a8a2e',
    straightness: 0.3,
    curlFactor: 0.05,
    maxLife: 200,
    baseWidth: 5,
    growthSpeed: 2,
    leafColorStart: '#4a7c59',
    leafColorEnd: '#6b9f7a',
    leafFrequency: 0.1,
    leafSize: 15,
    flowerColorStart: '#ff6b9d',
    flowerColorEnd: '#ffa8c5',
    flowerProbability: 0.3,
    flowerSize: 15,
    petalCount: 5,
  };

  switch (type) {
    case PlantType.VINE:
      return {
        ...base,
        stemColorStart: '#2d5016',
        stemColorEnd: '#5a8a2e',
        curlFactor: 0.08,
        straightness: 0.2,
      };
    case PlantType.PALM:
      return {
        ...base,
        stemColorStart: '#3d6b2a',
        stemColorEnd: '#6b9f4a',
        straightness: 0.8,
        curlFactor: 0.02,
        leafSize: 25,
        leafFrequency: 0.15,
      };
    case PlantType.GEOMETRIC:
      return {
        ...base,
        stemColorStart: '#4a5568',
        stemColorEnd: '#718096',
        straightness: 0.9,
        curlFactor: 0.01,
        leafSize: 20,
        flowerSize: 20,
      };
    case PlantType.UMBRELLA:
      return {
        ...base,
        stemColorStart: '#744210',
        stemColorEnd: '#a67c52',
        straightness: 0.95,
        curlFactor: 0.03,
        leafSize: 30,
        flowerSize: 25,
      };
    case PlantType.BERRY:
      return {
        ...base,
        stemColorStart: '#4a2c1a',
        stemColorEnd: '#7a5a3a',
        curlFactor: 0.1,
        straightness: 0.4,
        flowerColorStart: '#ff4757',
        flowerColorEnd: '#ff6b81',
        flowerSize: 12,
      };
    default:
      return base;
  }
};

export default function GardenPage() {
  const [settings, setSettings] = useState<PlantSettings>(getPreset(PlantType.VINE));
  const [clearTrigger, setClearTrigger] = useState(0);

  const updateSettings = (newSettings: Partial<PlantSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const applyPreset = (type: PlantType) => {
    setSettings(getPreset(type));
  };

  const handleClear = () => {
    setClearTrigger((prev) => prev + 1);
  };

  const handleSettingsCopied = (copiedSettings: PlantSettings) => {
    setSettings(copiedSettings);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-white to-green-50">
      <Controls
        settings={settings}
        updateSettings={updateSettings}
        applyPreset={applyPreset}
        onClear={handleClear}
      />
      <GardenCanvas
        settings={settings}
        clearTrigger={clearTrigger}
        onSettingsCopied={handleSettingsCopied}
      />
    </div>
  );
}

