/**
 * 书籍状态管理 Store (Zustand)
 * 统一管理书籍相关的状态和逻辑，包括：
 * - 书籍ID（bookCategoryId）的初始化和管理
 * - 文章列表缓存的管理
 * - 导航信息的计算
 * - 文章ID类型的统一处理
 */

import { create } from 'zustand';
import { apiGet } from '@/lib/apiClient';
import { 
  getCachedArticleList, 
  getArticleCategoryFromCache,
  clearBookCache,
  cacheArticleList,
} from '@/app/utils/bookCache';

/**
 * 统一文章ID类型为 string
 */
function normalizeArticleId(id: string | number): string {
  return String(id);
}


/**
 * 获取分类的根分类ID（通过分类路径API）
 */
async function getRootCategoryId(categoryId: string): Promise<string | null> {
  try {
    const response = await apiGet(`/api/categories/${categoryId}/path`, { requiresAuth: false });
    const result = await response.json();

    if (result.success && result.path && result.path.length > 0) {
      // 路径数组的第一个元素就是根分类
      return result.path[0].id;
    }
    return null;
  } catch (error) {
    console.error('获取分类路径失败:', error);
    return null;
  }
}

/**
 * 导航信息接口
 */
export interface NavigationInfo {
  prevArticleId: string | null;
  nextArticleId: string | null;
  currentIndex: number;
  totalCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
}

/**
 * BookStore 状态接口
 */
interface BookState {
  // 状态
  bookCategoryId: string | null;
  currentArticleId: string | null;
  articleIds: string[];
  articleCategoryMap: Record<string, string>;
  loading: boolean;
  navigation: NavigationInfo;

  // 方法：初始化书籍ID（方案1：优先级顺序）
  initializeBookCategoryId: (
    articleId: string | number,
    urlCategory?: string | null
  ) => Promise<string | null>;

  // 方法：从文章数据中设置书籍ID
  setBookIdFromArticle: (articleData: { category_id?: string }) => Promise<void>;

  // 方法：设置书籍ID
  setBookId: (bookId: string | null) => Promise<void>;

  // 方法：设置当前文章
  setCurrentArticle: (articleId: string | number) => void;

  // 方法：加载文章列表缓存（缓存不存在时从 API 获取）
  loadArticleListCache: (bookId: string) => Promise<void>;

  // 方法：计算导航信息
  calculateNavigation: () => void;

  // 方法：翻到上一页
  goToPrev: () => string | null;

  // 方法：翻到下一页
  goToNext: () => string | null;

  // 方法：获取文章所属分类
  getArticleCategory: (articleId: string | number) => string | null;

  // 方法：清除缓存
  clearCache: (bookId: string) => void;
}

/**
 * 创建 BookStore
 */
export const useBookStore = create<BookState>((set, get) => ({
  // 初始状态
  bookCategoryId: null,
  currentArticleId: null,
  articleIds: [],
  articleCategoryMap: {},
  loading: false,
  navigation: {
    prevArticleId: null,
    nextArticleId: null,
    currentIndex: -1,
    totalCount: 0,
    canGoPrev: false,
    canGoNext: false,
  },

  /**
   * 初始化书籍ID（方案1：优先级顺序）
   * 优先级：
   * 1. URL 参数 category
   * 2. 从缓存中查找（通过 getArticleCategoryFromCache）
   * 3. 返回 null，等待文章加载后再设置
   */
  initializeBookCategoryId: async (articleId, urlCategory) => {
    const normalizedId = normalizeArticleId(articleId);

    // 优先级1：URL 参数 category
    if (urlCategory) {
      console.log('[BookStore] 使用URL参数中的分类ID:', urlCategory);
      set({ bookCategoryId: urlCategory });
      await get().loadArticleListCache(urlCategory);
      return urlCategory;
    }

    // 优先级2：从缓存中查找
    const cachedCategory = getArticleCategoryFromCache(normalizedId);
    if (cachedCategory) {
      console.log('[BookStore] 从缓存中找到分类ID:', cachedCategory);
      set({ bookCategoryId: cachedCategory });
      await get().loadArticleListCache(cachedCategory);
      return cachedCategory;
    }

    // 优先级3：返回 null，等待文章加载后再设置
    console.log('[BookStore] 无法确定分类ID，等待文章加载');
    return null;
  },

  /**
   * 从文章数据中设置书籍ID
   * 如果文章的 category_id 是子分类，需要向上查找根分类
   */
  setBookIdFromArticle: async (articleData) => {
    const { bookCategoryId } = get();
    
    // 如果已经设置了，不需要重新设置
    if (bookCategoryId) {
      return;
    }

    const articleCategoryId = articleData.category_id;
    if (!articleCategoryId) {
      console.log('[BookStore] 文章没有 category_id');
      return;
    }

    // 获取根分类ID
    const rootCategoryId = await getRootCategoryId(articleCategoryId);
    if (rootCategoryId) {
      console.log('[BookStore] 从文章数据中获取根分类ID:', rootCategoryId);
      set({ bookCategoryId: rootCategoryId });
      await get().loadArticleListCache(rootCategoryId);
    } else {
      console.log('[BookStore] 无法获取根分类，使用文章分类ID:', articleCategoryId);
      set({ bookCategoryId: articleCategoryId });
      await get().loadArticleListCache(articleCategoryId);
    }
  },

  /**
   * 设置书籍ID
   */
  setBookId: async (bookId) => {
    const normalizedId = bookId ? normalizeArticleId(bookId) : null;
    set({ bookCategoryId: normalizedId });
    if (normalizedId) {
      await get().loadArticleListCache(normalizedId);
    }
  },

  /**
   * 设置当前文章（方案3：统一类型为 string）
   */
  setCurrentArticle: (articleId) => {
    const normalizedId = normalizeArticleId(articleId);
    set({ currentArticleId: normalizedId });
    get().calculateNavigation();
  },

  /**
   * 加载文章列表缓存（缓存不存在时从 API 获取）
   */
  loadArticleListCache: async (bookId) => {
    const normalizedBookId = normalizeArticleId(bookId);
    const cached = getCachedArticleList(normalizedBookId);

    if (cached) {
      console.log('[BookStore] 加载缓存，文章数量:', cached.articleIds.length);
      set({
        articleIds: cached.articleIds,
        articleCategoryMap: cached.articleCategoryMap || {},
      });
      const { currentArticleId } = get();
      if (currentArticleId) get().calculateNavigation();
      return;
    }

    // 缓存不存在，从 API 获取（后端已排序）
    console.log('[BookStore] 缓存未命中，从 API 获取:', normalizedBookId);
    set({ loading: true });

    try {
      const params = new URLSearchParams({
        status: 'published',
        limit: '1000',
        offset: '0',
        categoryId: normalizedBookId,
        orderByPath: 'true', // 后端会做 DFS 排序
      });

      const response = await apiGet(`/api/articles/list?${params.toString()}`, { requiresAuth: false });
      const result = await response.json();

      if (response.ok && result.success && result.articles) {
        // 后端已排序，直接使用
        const articleIds = result.articles.map((a: any) => a.id.toString());
        const articleCategoryMap: Record<string, string> = {};
        result.articles.forEach((a: any) => {
          articleCategoryMap[a.id.toString()] = a.categoryId || normalizedBookId;
        });

        // 缓存
        cacheArticleList(normalizedBookId, articleIds, articleCategoryMap);
        console.log('[BookStore] 已从 API 获取并缓存，文章数量:', articleIds.length);

        set({
          articleIds,
          articleCategoryMap,
          loading: false,
        });

        const { currentArticleId } = get();
        if (currentArticleId) get().calculateNavigation();
      } else {
        set({ articleIds: [], articleCategoryMap: {}, loading: false });
        const { currentArticleId } = get();
        if (currentArticleId) get().calculateNavigation();
      }
    } catch (error) {
      console.error('[BookStore] 获取文章列表失败:', error);
      set({ articleIds: [], articleCategoryMap: {}, loading: false });
      const { currentArticleId } = get();
      if (currentArticleId) get().calculateNavigation();
    }
  },

  /**
   * 计算导航信息（方案3：统一类型比较）
   */
  calculateNavigation: () => {
    const { articleIds, currentArticleId } = get();

    if (!currentArticleId || articleIds.length === 0) {
      set({
        navigation: {
          prevArticleId: null,
          nextArticleId: null,
          currentIndex: -1,
          totalCount: articleIds.length,
          canGoPrev: false,
          canGoNext: false,
        },
      });
      return;
    }

    const normalizedCurrentId = normalizeArticleId(currentArticleId);
    // 确保 articleIds 中的元素都是 string 类型
    const normalizedArticleIds = articleIds.map(id => normalizeArticleId(id));
    const currentIndex = normalizedArticleIds.indexOf(normalizedCurrentId);

    if (currentIndex === -1) {
      console.log('[BookStore] 当前文章不在列表中:', normalizedCurrentId);
      set({
        navigation: {
          prevArticleId: null,
          nextArticleId: null,
          currentIndex: -1,
          totalCount: normalizedArticleIds.length,
          canGoPrev: false,
          canGoNext: false,
        },
      });
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : -1;
    const nextIndex = currentIndex < normalizedArticleIds.length - 1 ? currentIndex + 1 : -1;

    set({
      navigation: {
        prevArticleId: prevIndex >= 0 ? normalizedArticleIds[prevIndex] : null,
        nextArticleId: nextIndex >= 0 ? normalizedArticleIds[nextIndex] : null,
        currentIndex,
        totalCount: normalizedArticleIds.length,
        canGoPrev: prevIndex >= 0,
        canGoNext: nextIndex >= 0,
      },
    });
  },

  /**
   * 翻到上一页
   */
  goToPrev: () => {
    const { navigation } = get();
    return navigation.prevArticleId;
  },

  /**
   * 翻到下一页
   */
  goToNext: () => {
    const { navigation } = get();
    return navigation.nextArticleId;
  },

  /**
   * 获取文章所属分类
   */
  getArticleCategory: (articleId) => {
    const normalizedId = normalizeArticleId(articleId);
    const { articleCategoryMap, bookCategoryId } = get();

    // 先从 store 的映射中查找
    if (articleCategoryMap[normalizedId]) {
      return articleCategoryMap[normalizedId];
    }

    // 如果 store 中没有，从缓存中查找
    const cachedCategory = getArticleCategoryFromCache(normalizedId);
    if (cachedCategory) {
      return cachedCategory;
    }

    // 如果都找不到，返回书籍ID作为默认
    return bookCategoryId;
  },

  /**
   * 清除缓存
   */
  clearCache: (bookId) => {
    const normalizedBookId = normalizeArticleId(bookId);
    clearBookCache(normalizedBookId);
  },
}));
