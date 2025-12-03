import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
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
 * GET /api/categories/tree
 * 获取分类树结构（不包含文章）
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await query<Category[]>(
      'SELECT id, name, parent_id, order_index FROM categories ORDER BY order_index ASC'
    );

    const tree = buildCategoryTree(categories);

    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error('获取分类树失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类树失败' },
      { status: 500 }
    );
  }
}
