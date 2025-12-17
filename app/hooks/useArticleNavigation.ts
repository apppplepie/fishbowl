/**
 * 文章导航Hook
 * 用于实现文章的上一页/下一页切换功能
 * 利用bookcase预缓存的DFS顺序文章列表
 */

import { useState, useEffect } from 'react';

// 缓存相关常量
const ARTICLE_LIST_CACHE_PREFIX = 'book-articles-cache-';
const CACHE_EXPIRY_HOURS = 1; // 改为1小时过期，更及时更新

/**
 * 清除指定书籍的缓存
 */
export function clearBookCache(bookId: string) {
  // 检查是否在客户端环境
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const cacheKey = `${ARTICLE_LIST_CACHE_PREFIX}${bookId}`;
  localStorage.removeItem(cacheKey);
  console.log(`已清除书籍 ${bookId} 的缓存`);
}

export interface ArticleNavigationResult {
  prevArticleId: string | null;
  nextArticleId: string | null;
  currentIndex: number;
  totalCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  loading: boolean;
}

/**
 * 获取缓存的文章列表（复用bookcase的缓存逻辑）
 */
function getCachedArticleList(bookId: string): string[] | null {
  // 检查是否在客户端环境
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const cacheKey = `${ARTICLE_LIST_CACHE_PREFIX}${bookId}`;
  const cached = localStorage.getItem(cacheKey);

  if (!cached) return null;

  try {
    const cacheData = JSON.parse(cached);
    if (Date.now() > cacheData.expiry) {
      // 缓存过期，删除
      localStorage.removeItem(cacheKey);
      return null;
    }
    return cacheData.articleIds;
  } catch (error) {
    console.error('解析缓存失败:', error);
    localStorage.removeItem(cacheKey);
    return null;
  }
}


/**
 * 获取文章对应的分类ID（复用bookcase的缓存逻辑）
 */
export function getArticleCategory(articleId: string): string | null {
  // 检查是否在客户端环境
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  // 遍历所有缓存，找到包含该文章的分类
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith(ARTICLE_LIST_CACHE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;

        const cacheData = JSON.parse(cached);
        if (Date.now() > cacheData.expiry) {
          // 缓存过期，删除
          localStorage.removeItem(key);
          continue;
        }

        // 检查文章是否在这个书籍的缓存中
        if (cacheData.articleIds && cacheData.articleIds.includes(articleId)) {
          // 检查文章分类映射
          if (cacheData.articleCategoryMap && cacheData.articleCategoryMap[articleId]) {
            return cacheData.articleCategoryMap[articleId];
          }
          // 如果没有映射，返回书籍ID作为默认分类
          return key.replace(ARTICLE_LIST_CACHE_PREFIX, '');
        }
      } catch (error) {
        console.error('解析缓存失败:', error);
        localStorage.removeItem(key);
      }
    }
  }

  return null;
}

/**
 * 获取文章导航信息
 * @param bookId 书籍ID
 * @param currentArticleId 当前文章ID
 * @returns 导航信息
 */
export function useArticleNavigation(bookId: string, currentArticleId: string): ArticleNavigationResult {
  const [articleIds, setArticleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      return;
    }

    // 直接从缓存读取书籍的文章列表
    const cachedArticleIds = getCachedArticleList(bookId);
    if (cachedArticleIds) {
      console.log('使用书籍缓存数据:', bookId, cachedArticleIds.length, '篇文章');
      setArticleIds(cachedArticleIds);
    } else {
      console.log('书籍缓存未命中:', bookId);
      setArticleIds([]);
    }
    setLoading(false);
  }, [bookId]);

  if (loading) {
    return {
      prevArticleId: null,
      nextArticleId: null,
      currentIndex: -1,
      totalCount: 0,
      canGoPrev: false,
      canGoNext: false,
      loading: true,
    };
  }

  if (articleIds.length === 0) {
    console.log('文章列表为空:', bookId, currentArticleId);
    return {
      prevArticleId: null,
      nextArticleId: null,
      currentIndex: -1,
      totalCount: 0,
      canGoPrev: false,
      canGoNext: false,
      loading: false,
    };
  }

  const currentIndex = articleIds.indexOf(currentArticleId);
  const totalCount = articleIds.length;

  console.log('导航计算:', {
    bookId,
    currentArticleId,
    totalCount,
    currentIndex,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < totalCount - 1
  });

  if (currentIndex === -1) {
    // 当前文章不在列表中
    console.log('当前文章不在列表中:', currentArticleId, '不在', articleIds);
    return {
      prevArticleId: null,
      nextArticleId: null,
      currentIndex: -1,
      totalCount,
      canGoPrev: false,
      canGoNext: false,
      loading: false,
    };
  }

  const prevIndex = currentIndex > 0 ? currentIndex - 1 : -1;
  const nextIndex = currentIndex < totalCount - 1 ? currentIndex + 1 : -1;

  return {
    prevArticleId: prevIndex >= 0 ? articleIds[prevIndex] : null,
    nextArticleId: nextIndex >= 0 ? articleIds[nextIndex] : null,
    currentIndex,
    totalCount,
    canGoPrev: prevIndex >= 0,
    canGoNext: nextIndex >= 0,
    loading: false,
  };
}
