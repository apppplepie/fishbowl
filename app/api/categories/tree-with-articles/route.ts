import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * 获取分类树及其下的文章
 */
interface CategoryWithArticles {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  depth: number;
  path: string;
  children?: CategoryWithArticles[];
  articles?: Array<{
    id: string;
    title: string;
    type: string;
    publish_date: string;
  }>;
}

/**
 * 构建树结构
 */
function buildTree(flatData: any[]): CategoryWithArticles[] {
  const map = new Map<string, CategoryWithArticles>();
  const roots: CategoryWithArticles[] = [];

  // 创建所有节点
  flatData.forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, {
        id: item.id,
        name: item.name,
        parent_id: item.parent_id,
        order_index: item.order_index,
        depth: item.depth || 1,
        path: item.path || '',
        children: [],
        articles: [],
      });
    }
  });

  // 构建树结构
  map.forEach(node => {
    if (node.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    }
  });

  // 按 path 排序（深度优先）
  const sortByPath = (nodes: CategoryWithArticles[]) => {
    nodes.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortByPath(node.children);
      }
      if (node.articles && node.articles.length > 0) {
        node.articles.sort((a, b) =>
          new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()
        );
      }
    });
  };

  sortByPath(roots);
  return roots;
}

/**
 * 添加文章到分类树
 */
function attachArticlesToTree(tree: CategoryWithArticles[], articles: any[]) {
  const categoryMap = new Map<string, CategoryWithArticles>();

  // 递归收集所有分类节点
  const collectCategories = (nodes: CategoryWithArticles[]) => {
    nodes.forEach(node => {
      categoryMap.set(node.id, node);
      if (node.children) {
        collectCategories(node.children);
      }
    });
  };

  collectCategories(tree);

  // 将文章添加到对应分类
  articles.forEach(article => {
    if (article.category_id) {
      const category = categoryMap.get(article.category_id);
      if (category) {
        if (!category.articles) category.articles = [];
        category.articles.push({
          id: article.id,
          title: article.title,
          type: article.type || 'text',
          publish_date: article.publish_date,
        });
      }
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    // 获取所有分类
    const categories = await query(
      `SELECT id, name, parent_id, order_index 
       FROM categories 
       ORDER BY order_index ASC`
    ) as any[];

    // 获取所有已发布的文章
    const articles = await query(
      `SELECT id, title, type, category_id, publish_date
       FROM articles 
       WHERE status = 'published' 
       AND category_id IS NOT NULL
       ORDER BY publish_date DESC`
    ) as any[];

    // 构建树结构
    const tree = buildTree(categories);

    // 添加文章到树
    attachArticlesToTree(tree, articles);

    return NextResponse.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error('获取分类树失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类树失败' },
      { status: 500 }
    );
  }
}

