'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// 权限过滤器设置存储键
const USER_ACCESS_FILTER_KEY = 'user_access_filter_mode';

// 三种过滤模式
export type FilterMode = 'study' | 'strict' | 'loose';
export const DEFAULT_FILTER_MODE: FilterMode = 'loose'; // 默认宽松模式

interface AccessFilterContextType {
  filterMode: FilterMode;
  updateFilterMode: (mode: FilterMode) => void;
}

const AccessFilterContext = createContext<AccessFilterContextType | undefined>(undefined);

interface AccessFilterProviderProps {
  children: ReactNode;
}

const getInitialFilterMode = (): FilterMode => {
  if (typeof window === 'undefined') {
    return DEFAULT_FILTER_MODE;
  }

  const saved = localStorage.getItem(USER_ACCESS_FILTER_KEY);
  if (saved === 'study' || saved === 'strict' || saved === 'loose') {
    return saved;
  }

  if (saved) {
    // 向后兼容：如果存储的是数字，转换为模式
    // 数字 1 → 学习模式，其他 → 宽松模式
    const oldLevel = Number.parseInt(saved, 10);
    const migratedMode: FilterMode = oldLevel === 1 ? 'study' : 'loose';
    localStorage.setItem(USER_ACCESS_FILTER_KEY, migratedMode);
    return migratedMode;
  }

  return DEFAULT_FILTER_MODE;
};

export const AccessFilterProvider: React.FC<AccessFilterProviderProps> = ({ children }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>(() => getInitialFilterMode());

  // 设置过滤模式
  const updateFilterMode = (mode: FilterMode) => {
    setFilterMode(mode);
    localStorage.setItem(USER_ACCESS_FILTER_KEY, mode);
  };

  const value = {
    filterMode,
    updateFilterMode,
  };

  return (
    <AccessFilterContext.Provider value={value}>
      {children}
    </AccessFilterContext.Provider>
  );
};

export const useAccessFilter = () => {
  const context = useContext(AccessFilterContext);
  if (context === undefined) {
    throw new Error('useAccessFilter must be used within an AccessFilterProvider');
  }
  return context;
};

// 导出常量供其他地方使用
export const ACCESS_FILTER_STORAGE_KEY = USER_ACCESS_FILTER_KEY;
export const DEFAULT_FILTER_MODE_VALUE = DEFAULT_FILTER_MODE;