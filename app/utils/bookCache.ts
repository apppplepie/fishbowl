/**
 * 书籍文章列表缓存工具
 * 统一管理书籍文章的缓存逻辑，包括：
 * - 缓存常量定义
 * - 缓存读写函数
 * - 文章分类查找
 */

// 缓存相关常量
export const ARTICLE_LIST_CACHE_PREFIX = 'book-articles-cache-';
export const CACHE_EXPIRY_HOURS = 1; // 1小时过期

/**
 * 缓存数据结构
 */
export interface BookArticleCache {
  articleIds: string[];
  articleCategoryMap?: Record<string, string>;
  timestamp: number;
  expiry: number;
}

/**
 * 缓存文章列表和文章到分类的映射
 * @param bookId 书籍ID（分类ID）
 * @param articleIds 文章ID列表
 * @param articleCategoryMap 文章到分类的映射（可选，支持 Map 或 Record）
 */
export function cacheArticleList(
  bookId: string,
  articleIds: string[],
  articleCategoryMap?: Map<string, string> | Record<string, string>
): void {
  // 检查是否在客户端环境
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const cacheKey = `${ARTICLE_LIST_CACHE_PREFIX}${bookId}`;
  
  // 统一转换为 Record 格式
  let categoryMapRecord: Record<string, string> | undefined;
  if (articleCategoryMap) {
    if (articleCategoryMap instanceof Map) {
      categoryMapRecord = Object.fromEntries(articleCategoryMap);
    } else {
      categoryMapRecord = articleCategoryMap;
    }
  }

  const cacheData: BookArticleCache = {
    articleIds,
    articleCategoryMap: categoryMapRecord || undefined,
    timestamp: Date.now(),
    expiry: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000),
  };

  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  console.log(`已缓存书籍 ${bookId} 的文章列表，共 ${articleIds.length} 篇文章`);
}

/**
 * 获取缓存的文章列表
 * @param bookId 书籍ID（分类ID）
 * @returns 缓存数据，如果不存在或已过期则返回 null
 */
export function getCachedArticleList(bookId: string): BookArticleCache | null {
  // 检查是否在客户端环境
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const cacheKey = `${ARTICLE_LIST_CACHE_PREFIX}${bookId}`;
  const cached = localStorage.getItem(cacheKey);

  if (!cached) return null;

  try {
    const cacheData = JSON.parse(cached) as BookArticleCache;
    if (Date.now() > cacheData.expiry) {
      // 缓存过期，删除
      localStorage.removeItem(cacheKey);
      return null;
    }
    return cacheData;
  } catch (error) {
    console.error('解析缓存失败:', error);
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * 从缓存中查找文章所属的分类ID
 * @param articleId 文章ID
 * @returns 分类ID，如果找不到则返回 null
 */
export function getArticleCategoryFromCache(articleId: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const keys = Object.keys(localStorage);

  for (const key of keys) {
    if (key.startsWith(ARTICLE_LIST_CACHE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;

        const cacheData = JSON.parse(cached) as BookArticleCache;
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
 * 获取文章对应的分类ID（兼容旧接口）
 * @param articleId 文章ID
 * @returns 分类ID，如果找不到则返回 null
 */
export function getArticleCategory(articleId: string): string | null {
  return getArticleCategoryFromCache(articleId);
}

/**
 * 清除指定书籍的缓存
 * @param bookId 书籍ID（分类ID）
 */
export function clearBookCache(bookId: string): void {
  // 检查是否在客户端环境
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const cacheKey = `${ARTICLE_LIST_CACHE_PREFIX}${bookId}`;
  localStorage.removeItem(cacheKey);
  console.log(`已清除书籍 ${bookId} 的缓存`);
}
