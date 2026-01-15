'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useLayoutEffect } from 'react';
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
  const [activeFishbowlThemeId, setActiveFishbowlThemeId] = useState<string>('coral');
  const [skyHue, setSkyHue] = useState(20);
  const [waterHue, setWaterHue] = useState(190);
  const [mounted, setMounted] = useState(false);

  // 立即设置 mounted 为 true（客户端），然后恢复主题状态
  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      console.log('[AppThemeProvider] 设置 mounted = true');
    }
  }, []);

  // 在客户端挂载后从 localStorage 恢复主题状态
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[AppThemeProvider] 开始恢复主题状态...');

      const savedThemeId = localStorage.getItem('fishbowl_theme_id');
      const savedSkyHue = localStorage.getItem('fishbowl_sky_hue');
      const savedWaterHue = localStorage.getItem('fishbowl_water_hue');

      console.log('[AppThemeProvider] LocalStorage 数据:', {
        savedThemeId,
        savedSkyHue,
        savedWaterHue
      });

      if (savedThemeId) {
        setActiveFishbowlThemeId(savedThemeId);
        console.log('[AppThemeProvider] 恢复主题ID:', savedThemeId);
      }

      if (savedSkyHue) {
        setSkyHue(parseInt(savedSkyHue, 10));
        console.log('[AppThemeProvider] 恢复天空色相:', savedSkyHue);
      }

      if (savedWaterHue) {
        setWaterHue(parseInt(savedWaterHue, 10));
        console.log('[AppThemeProvider] 恢复水色相:', savedWaterHue);
      }
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
    console.log('[AppThemeProvider] 计算 currentFishbowlTheme:', {
      activeFishbowlThemeId,
      skyHue,
      waterHue,
      mounted,
      availableThemes: themes.map(t => t.id)
    });

    let theme: Theme;
    if (activeFishbowlThemeId !== 'custom') {
      theme = themes.find(t => t.id === activeFishbowlThemeId) || themes[0];
      console.log('[AppThemeProvider] 使用预设主题:', {
        found: !!themes.find(t => t.id === activeFishbowlThemeId),
        themeId: theme.id,
        themeName: theme.name
      });
    } else {
      theme = {
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
      console.log('[AppThemeProvider] 生成自定义主题:', {
        skyHue,
        waterHue,
        skyGradient: theme.skyGradient,
        waterGradient: theme.waterGradient
      });
    }

    console.log('[AppThemeProvider] currentFishbowlTheme 最终值:', {
      id: theme.id,
      name: theme.name,
      hasSkyGradient: !!theme.skyGradient,
      hasWaterGradient: !!theme.waterGradient
    });

    return theme;
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
