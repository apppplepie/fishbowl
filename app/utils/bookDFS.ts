/**
 * 书籍文章 DFS（深度优先搜索）排序工具
 * 用于按照分类树结构对文章进行深度优先排序
 */

/**
 * 分类节点接口
 */
export interface CategoryNode {
  id: string;
  children?: CategoryNode[];
  order_index?: number;
}

/**
 * 文章节点接口
 */
export interface ArticleNode {
  id: string | number;
  category_id?: string;
  orderInCategory?: number;
  [key: string]: any; // 允许其他属性
}

/**
 * 使用深度优先搜索对文章进行排序
 * 
 * 排序规则：
 * 1. 在同一层级，按照 order_index（分类）和 orderInCategory（文章）混合排序
 * 2. 先处理分类（递归展开），再处理文章
 * 3. 按照排序值（sortValue）升序排列
 * 
 * @param categoryId 起始分类ID
 * @param categoryMap 分类映射表（categoryId -> CategoryNode）
 * @param articlesMap 文章映射表（categoryId -> ArticleNode[]）
 * @returns 排序后的文章列表
 */
export function sortArticlesDFS(
  categoryId: string,
  categoryMap: Map<string, CategoryNode>,
  articlesMap: Map<string, ArticleNode[]>
): ArticleNode[] {
  const result: ArticleNode[] = [];
  const category = categoryMap.get(categoryId);

  if (!category) {
    return result;
  }

  // 获取当前分类的直接文章
  const directArticles = articlesMap.get(categoryId) || [];

  // 按 orderInCategory 排序直接文章
  const sortedDirectArticles = directArticles.sort((a, b) =>
    (a.orderInCategory || 0) - (b.orderInCategory || 0)
  );

  // 按 order_index 排序子分类
  const sortedChildren = (category.children || []).sort((a, b) =>
    (a.order_index || 0) - (b.order_index || 0)
  );

  // 合并章节和文章，按排序值混合排序
  const mixed: Array<{ type: 'category' | 'article'; data: CategoryNode | ArticleNode; sortValue: number }> = [
    ...sortedChildren.map((cat) => ({
      type: 'category' as const,
      data: cat,
      sortValue: cat.order_index || 0,
    })),
    ...sortedDirectArticles.map((article) => ({
      type: 'article' as const,
      data: article,
      sortValue: article.orderInCategory || 0,
    })),
  ];

  // 按排序值升序排列
  mixed.sort((a, b) => a.sortValue - b.sortValue);

  // 深度优先遍历
  for (const item of mixed) {
    if (item.type === 'category') {
      // 递归展开子分类
      const subArticles = sortArticlesDFS(
        (item.data as CategoryNode).id,
        categoryMap,
        articlesMap
      );
      result.push(...subArticles);
    } else {
      // 直接添加文章
      result.push(item.data as ArticleNode);
    }
  }

  return result;
}
