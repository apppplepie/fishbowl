/**
 * 获取特定分类的子分类树和文章数据
 * GET /api/categories/:id/tree-with-articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface TreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  depth: number;
  order_index: number;
  node_type: 'category' | 'article';
  type?: string; // article type
  publish_date?: string; // for articles
  children?: TreeNode[];
}

/**
 * 获取指定分类的完整子树（包含分类和文章的混合节点）
 */
async function getTreeNodes(parentId: string): Promise<TreeNode[]> {
  console.log('getTreeNodes called for parentId:', parentId);

  const allNodes: TreeNode[] = [];

  // 获取直接子分类
  const childCategories = await query<any[]>(
    `SELECT id, name, parent_id, path, depth, order_index
     FROM categories
     WHERE parent_id = ?
     ORDER BY order_index ASC`,
    [parentId]
  );

  console.log('Found child categories:', childCategories.length);

  // 添加子分类节点
  for (const category of childCategories) {
    const categoryNode: TreeNode = {
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      path: category.path,
      depth: category.depth,
      order_index: category.order_index,
      node_type: 'category',
    };

    allNodes.push(categoryNode);
  }

  // 获取直接文章
  const articles = await query<any[]>(
    `SELECT id, title, type, publish_date, order_in_category
     FROM articles
     WHERE category_id = ? AND status = 'published'
     ORDER BY order_in_category ASC`,
    [parentId]
  );

  console.log('Found articles:', articles.length);

  // 添加文章节点
  for (const article of articles) {
    // 获取父分类的path
    const parentCategory = await query<any[]>(
      'SELECT path, depth FROM categories WHERE id = ?',
      [parentId]
    );

    const parentPath = parentCategory.length > 0 ? parentCategory[0].path : '000001';
    const parentDepth = parentCategory.length > 0 ? parentCategory[0].depth : 1;

    const articleNode: TreeNode = {
      id: article.id,
      name: article.title,
      parent_id: parentId,
      path: `${parentPath}-${article.order_in_category.toString().padStart(6, '0')}`,
      depth: parentDepth + 1,
      order_index: article.order_in_category,
      node_type: 'article',
      type: article.type,
      publish_date: article.publish_date,
    };

    allNodes.push(articleNode);
  }

  // 按path排序
  return allNodes.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
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

    console.log('TreeWithArticles API called for category:', id);

    // 验证分类是否存在
    const categoryCheck = await query(
      'SELECT id, name, path, depth FROM categories WHERE id = ?',
      [id]
    );

    console.log('Category check result:', categoryCheck);

    if (!categoryCheck || (categoryCheck as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 获取该分类下的直接子项（分类和文章的混合列表）
    const nodes = await getTreeNodes(id);

    console.log('API返回节点数量:', nodes.length);
    console.log('API返回前3个节点:', nodes.slice(0, 3));

    return NextResponse.json({
      success: true,
      data: nodes,
    });

  } catch (error: any) {
    console.error('获取分类树失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类树失败: ' + error.message },
      { status: 500 }
    );
  }
}
