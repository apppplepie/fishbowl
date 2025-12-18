/**
 * 分类管理 API
 * GET /api/categories - 获取所有分类（树形结构）
 * POST /api/categories - 创建新分类
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, canModerate } from '@/lib/auth';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  depth: number;
  path: string;
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

  // 按 path 排序（深度优先）
  const sortByPath = (items: Category[]) => {
    items.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortByPath(item.children);
      }
    });
  };
  sortByPath(roots);

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
    const path = searchParams.get('path'); // 新增：按path查询

    let categories: Category[];

    if (type === 'children' && parentId) {
      // 查询指定父分类的子分类，按path排序
      categories = await query<Category[]>(
        'SELECT * FROM categories WHERE parent_id = ? ORDER BY path ASC',
        [parentId]
      );
    } else {
      // 查询所有分类，按path排序
      categories = await query<Category[]>(
        'SELECT * FROM categories ORDER BY path ASC'
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
 * 递归更新节点及其所有子节点的 depth 和 path
 */
async function updateNodeAndChildren(
  nodeId: string,
  newParentId: string | null,
  newOrderIndex: number
): Promise<void> {
  // 1. 获取新父节点的信息（如果有父节点）
  let parentDepth = 0;
  let parentPath = '';

  if (newParentId) {
    const parentResult = await query<Category[]>(
      'SELECT depth, path FROM categories WHERE id = ?',
      [newParentId]
    );

    if (parentResult.length === 0) {
      throw new Error('父分类不存在');
    }

    parentDepth = parentResult[0].depth;
    parentPath = parentResult[0].path;
  }

  // 2. 计算当前节点的新 depth 和 path
  const newDepth = parentDepth + 1;
  const newPath = parentPath
    ? `${parentPath}-${String(newOrderIndex).padStart(6, '0')}`
    : String(newOrderIndex).padStart(6, '0');

  // 3. 更新当前节点
  await query(
    `UPDATE categories
     SET parent_id = ?, order_index = ?, depth = ?, path = ?
     WHERE id = ?`,
    [newParentId, newOrderIndex, newDepth, newPath, nodeId]
  );

  // 4. 递归更新所有子节点
  const children = await query<Category[]>(
    'SELECT id, order_index FROM categories WHERE parent_id = ? ORDER BY order_index',
    [nodeId]
  );

  for (const child of children) {
    await updateNodeAndChildren(child.id, nodeId, child.order_index);
  }
}

/**
 * POST /api/categories
 * 创建新分类
 */
export async function POST(request: NextRequest) {
  try {
    // 权限校验：仅管理员或版主可以创建分类
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    if (!canModerate(currentUser)) {
      return NextResponse.json(
        { success: false, error: '无权创建分类，仅管理员或版主可操作' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, parent_id, order_index } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 使用提供的 order_index，如果没有则默认为 0（稍后会被正确设置）
    const finalOrderIndex = order_index || 0;

    // 先创建分类（不设置 path 等字段）
    await query(
      'INSERT INTO categories (id, name, parent_id, order_index) VALUES (?, ?, ?, ?)',
      [id, name, parent_id || null, finalOrderIndex]
    );

    // 然后更新 path 和其他相关字段
    await updateNodeAndChildren(id, parent_id || null, finalOrderIndex);

    return NextResponse.json({
      success: true,
      message: '分类创建成功',
      category: { id, name, parent_id, order_index: finalOrderIndex }
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    return NextResponse.json(
      { success: false, error: '创建分类失败' },
      { status: 500 }
    );
  }
}

