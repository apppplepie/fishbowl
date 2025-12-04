/**
 * 分类管理 API
 * GET /api/categories - 获取所有分类（树形结构）
 * POST /api/categories - 创建新分类
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

/**
 * 将扁平的分类列表转换为树形结构
 */
function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  // 第一遍：创建 map 并初始化 children
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // 第二遍：建立父子关系
  categories.forEach(cat => {
    const node = map.get(cat.id)!;
    if (cat.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children!.push(node);
      }
    }
  });

  // 按 order_index 排序
  const sortByOrder = (items: Category[]) => {
    items.sort((a, b) => a.order_index - b.order_index);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortByOrder(item.children);
      }
    });
  };
  sortByOrder(roots);

  return roots;
}

/**
 * GET /api/categories
 * 获取所有分类（可选树形结构）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format'); // 'tree' 或 'flat'
    const type = searchParams.get('type'); // 'children'
    const parentId = searchParams.get('parentId');

    let categories: Category[];

    if (type === 'children' && parentId) {
      // 查询指定父分类的子分类
      categories = await query<Category[]>(
        'SELECT * FROM categories WHERE parent_id = ? ORDER BY order_index ASC',
        [parentId]
      );
    } else {
      // 查询所有分类
      categories = await query<Category[]>(
        'SELECT * FROM categories ORDER BY order_index ASC'
      );
    }

    if (format === 'tree') {
      const tree = buildCategoryTree(categories);
      return NextResponse.json({ success: true, categories: tree });
    }

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * 创建新分类
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, parent_id, order_index } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: '缺少必要字段' },
        { status: 400 }
      );
    }

    await query(
      'INSERT INTO categories (id, name, parent_id, order_index) VALUES (?, ?, ?, ?)',
      [id, name, parent_id || null, order_index || 0]
    );

    return NextResponse.json({
      success: true,
      message: '分类创建成功',
      category: { id, name, parent_id, order_index }
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    return NextResponse.json(
      { success: false, error: '创建分类失败' },
      { status: 500 }
    );
  }
}

