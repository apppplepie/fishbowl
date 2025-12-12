/**
 * 文章导航Hook
 * 用于实现文章的上一页/下一页切换功能
 */

import { getCachedArticleList } from '@/app/bookcase/page';

export interface ArticleNavigationResult {
  prevArticleId: string | null;
  nextArticleId: string | null;
  currentIndex: number;
  totalCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
}

/**
 * 获取文章导航信息
 * @param bookId 书籍ID
 * @param currentArticleId 当前文章ID
 * @returns 导航信息
 */
export function useArticleNavigation(bookId: string, currentArticleId: string): ArticleNavigationResult {
  const articleIds = getCachedArticleList(bookId);

  if (!articleIds || articleIds.length === 0) {
    return {
      prevArticleId: null,
      nextArticleId: null,
      currentIndex: -1,
      totalCount: 0,
      canGoPrev: false,
      canGoNext: false,
    };
  }

  const currentIndex = articleIds.indexOf(currentArticleId);
  const totalCount = articleIds.length;

  if (currentIndex === -1) {
    // 当前文章不在缓存列表中
    return {
      prevArticleId: null,
      nextArticleId: null,
      currentIndex: -1,
      totalCount,
      canGoPrev: false,
      canGoNext: false,
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
  };
}
