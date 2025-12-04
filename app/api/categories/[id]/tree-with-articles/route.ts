/**
 * 获取特定分类的子分类树和文章数据
 * GET /api/categories/:id/tree-with-articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
  articles?: Article[];
}

interface Article {
  id: string;
  title: string;
  type: string;
  publish_date: string;
}

/**
 * 递归构建分类树
 */
async function buildCategoryTree(parentId: string, includeArticles: boolean = true): Promise<Category[]> {
  // 获取直接子分类
  const children = await query<Category[]>(
    'SELECT id, name, parent_id, order_index FROM categories WHERE parent_id = ? ORDER BY order_index ASC, name ASC',
    [parentId]
  );

  // 为每个子分类递归获取子项
  for (const child of children) {
    child.children = await buildCategoryTree(child.id, includeArticles);

    // 获取该分类下的文章
    if (includeArticles) {
      const articles = await query<Article[]>(
        `SELECT id, title, type, publish_date
         FROM articles
         WHERE category_id = ? AND status = 'published'
         ORDER BY last_modified DESC, publish_date DESC`,
        [child.id]
      );
      child.articles = articles;
    }
  }

  return children;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证分类是否存在
    const category = await query(
      'SELECT id, name FROM categories WHERE id = ?',
      [id]
    );

    if (!category || (category as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 获取分类信息
    const categoryInfo = (category as any[])[0];

    // 构建以该分类为根的子分类树
    const categoryTree = await buildCategoryTree(id);

    // 将分类本身作为根节点返回，包含其子分类
    const rootCategory: Category = {
      id: categoryInfo.id,
      name: categoryInfo.name,
      parent_id: categoryInfo.parent_id,
      order_index: categoryInfo.order_index,
      children: categoryTree,
    };

    // 同时获取该分类下的直接文章（如果有的话）
    if (true) { // 总是包含文章
      const articles = await query<Article[]>(
        `SELECT id, title, type, publish_date
         FROM articles
         WHERE category_id = ? AND status = 'published'
         ORDER BY last_modified DESC, publish_date DESC`,
        [id]
      );
      rootCategory.articles = articles;
    }

    console.log('API返回数据:', [rootCategory]);

    return NextResponse.json({
      success: true,
      data: [rootCategory], // 返回包含根分类的数组
    });

  } catch (error: any) {
    console.error('获取分类树失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类树失败: ' + error.message },
      { status: 500 }
    );
  }
}
