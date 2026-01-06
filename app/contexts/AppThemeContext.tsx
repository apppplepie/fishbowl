'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { theme as uiTheme } from '@/app/config/theme'; // 通用UI主题
import { Theme } from '@/app/types/background'; // 鱼缸主题类型
import { themes } from '@/app/data/themes'; // 鱼缸主题数据

interface AppThemeContextType {
  // 通用UI主题
  uiTheme: typeof uiTheme;

  // 鱼缸主题状态
  activeFishbowlThemeId: string;
  setActiveFishbowlThemeId: (id: string) => void;
  skyHue: number;
  setSkyHue: (hue: number) => void;
  waterHue: number;
  setWaterHue: (hue: number) => void;
  currentFishbowlTheme: Theme;
  fishbowlThemes: Theme[];

  // Hydration 状态
  mounted: boolean;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
};

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  // 修复 hydration mismatch：始终使用默认值初始化，在客户端加载后恢复
  const [activeFishbowlThemeId, setActiveFishbowlThemeId] = useState<string>('morning');
  const [skyHue, setSkyHue] = useState(20);
  const [waterHue, setWaterHue] = useState(190);
  const [mounted, setMounted] = useState(false);

  // 在客户端挂载后从 localStorage 恢复主题状态
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedThemeId = localStorage.getItem('fishbowl_theme_id');
      if (savedThemeId) {
        setActiveFishbowlThemeId(savedThemeId);
      }

      const savedSkyHue = localStorage.getItem('fishbowl_sky_hue');
      if (savedSkyHue) {
        setSkyHue(parseInt(savedSkyHue, 10));
      }

      const savedWaterHue = localStorage.getItem('fishbowl_water_hue');
      if (savedWaterHue) {
        setWaterHue(parseInt(savedWaterHue, 10));
      }

      setMounted(true);
    }
  }, []);

  // 保存主题状态到 localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem('fishbowl_theme_id', activeFishbowlThemeId);
    }
  }, [activeFishbowlThemeId, mounted]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem('fishbowl_sky_hue', skyHue.toString());
    }
  }, [skyHue, mounted]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem('fishbowl_water_hue', waterHue.toString());
    }
  }, [waterHue, mounted]);

  // 计算当前鱼缸主题
  const currentFishbowlTheme: Theme = useMemo(() => {
    if (activeFishbowlThemeId !== 'custom') {
      return themes.find(t => t.id === activeFishbowlThemeId) || themes[0];
    }

    return {
      id: 'custom',
      name: 'Custom Mode',
      pageBg: 'bg-gray-100',
      skyGradient: `linear-gradient(to bottom, hsl(${skyHue}, 70%, 95%), hsl(${skyHue}, 60%, 90%), hsl(${skyHue + 20}, 50%, 85%))`,
      waterGradient: `linear-gradient(to bottom, hsl(${waterHue}, 60%, 85%), hsl(${waterHue}, 50%, 40%), hsl(${waterHue}, 70%, 15%))`,
      orbColors: {
        sun: `hsla(${skyHue + 30}, 80%, 70%, 0.6)`,
        atmosphere: `hsla(${skyHue}, 60%, 80%, 0.4)`,
        waterLight: `hsla(${waterHue}, 80%, 80%, 0.3)`,
        waterDeep: `hsla(${waterHue}, 80%, 30%, 0.4)`,
      },
      waveColors: [
        `hsla(${waterHue}, 70%, 90%, 0.7)`,
        `hsla(${waterHue - 10}, 60%, 85%, 0.5)`,
        `hsla(${waterHue}, 100%, 95%, 0.8)`,
        `hsla(${waterHue}, 60%, 30%, 0.3)`,
      ],
      pageLayout: {
        box1Bg: 'transparent',
        box2Bg: 'bg-gray-100',
        containerPaddingTop: '0px',
      }
    };
  }, [activeFishbowlThemeId, skyHue, waterHue]);

  const value = {
    uiTheme,
    activeFishbowlThemeId,
    setActiveFishbowlThemeId,
    skyHue,
    setSkyHue,
    waterHue,
    setWaterHue,
    currentFishbowlTheme,
    fishbowlThemes: themes,
    mounted,
  };

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
};
