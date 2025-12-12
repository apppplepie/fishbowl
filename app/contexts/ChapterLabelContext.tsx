'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getChapterLabel } from '@/app/utils/chapterNumbering';

/**
 * 章节标签缓存
 * 用于在 sidebar 和面包屑之间共享章节号计算结果
 */

interface ChapterLabelCache {
  [categoryId: string]: string; // categoryId -> "第X卷" / "第X章" / "第X节"
}

interface ChapterLabelContextType {
  /**
   * 获取分类的章节标签
   * @param categoryId 分类ID
   * @returns 章节标签，如 "第1卷"、"第2章"，如果没有则返回空字符串
   */
  getLabel: (categoryId: string) => string;
  
  /**
   * 设置单个分类的章节标签
   */
  setLabel: (categoryId: string, label: string) => void;
  
  /**
   * 批量设置章节标签（用于 sidebar 计算完后一次性更新）
   */
  setLabels: (labels: ChapterLabelCache) => void;
  
  /**
   * 清除所有缓存
   */
  clearCache: () => void;
  
  /**
   * 根据 depth 和 chapter_index 生成标签并缓存
   */
  setLabelFromDepth: (categoryId: string, depth: number, chapterIndex: number) => void;
}

const ChapterLabelContext = createContext<ChapterLabelContextType | null>(null);

export function ChapterLabelProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<ChapterLabelCache>({});

  const getLabel = useCallback((categoryId: string): string => {
    return cache[categoryId] || '';
  }, [cache]);

  const setLabel = useCallback((categoryId: string, label: string) => {
    setCache(prev => ({
      ...prev,
      [categoryId]: label,
    }));
  }, []);

  const setLabels = useCallback((labels: ChapterLabelCache) => {
    setCache(prev => ({
      ...prev,
      ...labels,
    }));
  }, []);

  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  const setLabelFromDepth = useCallback((categoryId: string, depth: number, chapterIndex: number) => {
    const label = getChapterLabel(depth, chapterIndex);
    if (label) {
      setCache(prev => ({
        ...prev,
        [categoryId]: label,
      }));
    }
  }, []);

  return (
    <ChapterLabelContext.Provider
      value={{
        getLabel,
        setLabel,
        setLabels,
        clearCache,
        setLabelFromDepth,
      }}
    >
      {children}
    </ChapterLabelContext.Provider>
  );
}

/**
 * 使用章节标签缓存的 Hook
 */
export function useChapterLabelCache() {
  const context = useContext(ChapterLabelContext);
  if (!context) {
    throw new Error('useChapterLabelCache must be used within a ChapterLabelProvider');
  }
  return context;
}

/**
 * 可选的 Hook，不强制要求在 Provider 内使用
 * 如果不在 Provider 内，返回空实现
 */
export function useChapterLabelCacheOptional(): ChapterLabelContextType {
  const context = useContext(ChapterLabelContext);
  if (!context) {
    // 返回空实现，不抛错
    return {
      getLabel: () => '',
      setLabel: () => {},
      setLabels: () => {},
      clearCache: () => {},
      setLabelFromDepth: () => {},
    };
  }
  return context;
}

