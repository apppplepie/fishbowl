/**
 * 计算分类下的下一个 order_index
 * 同时考虑子分类和文章的最大 order 值，返回最大值 + 1
 * 
 * @param categoryId - 分类ID
 * @returns 下一个可用的 order_index
 */
import { apiGetJson } from '@/lib/apiClient';

export async function getNextOrderIndex(categoryId: string): Promise<number> {
  try {
    let maxOrder = 0;

    // 1. 获取该分类下的所有子分类
    const categoriesResult = await apiGetJson<{
      success: boolean;
      categories?: Array<{ order_index?: number }>;
    }>(`/api/categories?type=children&parentId=${categoryId}`);

    // 获取子分类的最大order_index
    if (categoriesResult.success && categoriesResult.categories) {
      const categoryOrders = categoriesResult.categories.map((cat: any) => cat.order_index || 0);
      if (categoryOrders.length > 0) {
        maxOrder = Math.max(maxOrder, ...categoryOrders);
      }
    }

    // 2. 获取该分类下的所有文章
    const articlesResult = await apiGetJson<{
      success: boolean;
      articles?: Array<{ orderInCategory?: number; order_index?: number }>;
    }>(`/api/articles/list?categoryId=${categoryId}&limit=1000`);

    // 获取子文章的最大order_index
    // 注意：/api/articles/list 返回的字段名是 orderInCategory，而不是 order_index
    if (articlesResult.success && articlesResult.articles) {
      const articleOrders = articlesResult.articles.map((article: any) => 
        article.orderInCategory || article.order_index || 0
      );
      if (articleOrders.length > 0) {
        maxOrder = Math.max(maxOrder, ...articleOrders);
      }
    }

    // 3. 返回最大值 + 1
    return maxOrder + 1;
  } catch (error) {
    console.warn('获取排序信息失败，使用默认排序:', error);
    // 如果获取失败，返回 0（后端可能会自动处理）
    return 0;
  }
}

