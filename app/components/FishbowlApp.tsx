'use client';

import React from 'react';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from './PageLayout';
import SkySection from './background/SkySection';
import WaterSection from './background/WaterSection';
import WaveSeparator from './background/WaveSeparator';

const FishbowlApp: React.FC = () => {
  const {
    activeFishbowlThemeId,
    setActiveFishbowlThemeId,
    skyHue,
    setSkyHue,
    waterHue,
    setWaterHue,
    currentFishbowlTheme,
    fishbowlThemes,
    mounted
  } = useAppTheme();

  // 在 hydration 完成前使用默认主题避免不匹配
  const themeToUse = mounted ? currentFishbowlTheme : fishbowlThemes.find(t => t.id === 'morning') || fishbowlThemes[0];

  return (
    <PageLayout theme={themeToUse}>
      {/* Control Dock */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-6 py-4 flex flex-col items-center gap-4 z-50 transition-all duration-300">

        {/* Theme Presets */}
        <div className="flex gap-3 overflow-x-auto max-w-[80vw] p-2 no-scrollbar">
          {fishbowlThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveFishbowlThemeId(theme.id)}
              className={`w-8 h-8 flex-shrink-0 rounded-full transition-all duration-300 ring-2 ring-offset-2 ring-offset-transparent ${
                activeFishbowlThemeId === theme.id
                  ? 'scale-125 ring-white/80 shadow-md'
                  : 'scale-100 hover:scale-110 ring-transparent opacity-70 hover:opacity-100'
              }`}
              style={{
                background: `linear-gradient(135deg, ${theme.orbColors.sun}, ${theme.orbColors.waterDeep})`
              }}
              title={theme.name}
            />
          ))}

          {/* Custom Mode Button */}
          <button
            onClick={() => setActiveFishbowlThemeId('custom')}
            className={`w-8 h-8 flex-shrink-0 rounded-full transition-all duration-300 ring-2 ring-offset-2 ring-offset-transparent flex items-center justify-center text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-300 ${
              activeFishbowlThemeId === 'custom'
              ? 'scale-125 ring-white/80 shadow-md bg-white'
              : 'scale-100 hover:scale-110 opacity-70 hover:opacity-100'
            }`}
          >
            <span>adj</span>
          </button>
        </div>

        {/* Sliders (Only visible in Custom Mode) */}
        {activeFishbowlThemeId === 'custom' && (
          <div className="w-full flex flex-col gap-2 pt-2 border-t border-white/30 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-700 w-8">Sky</span>
              <input
                type="range"
                min="0"
                max="360"
                value={skyHue}
                onChange={(e) => setSkyHue(Number(e.target.value))}
                className="w-48 h-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-700 w-8">Water</span>
              <input
                type="range"
                min="0"
                max="360"
                value={waterHue}
                onChange={(e) => setWaterHue(Number(e.target.value))}
                className="w-48 h-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Overlay */}
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Welcome to Fishbowl
          </h1>
          <p className="text-white/80 text-lg drop-shadow">
            Choose a theme and watch the magic happen!
          </p>
        </div>
      </div>
    </PageLayout>
  );
};

export default FishbowlApp;
