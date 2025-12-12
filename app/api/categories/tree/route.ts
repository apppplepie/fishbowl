import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  depth: number;
  path: string;
  children?: Category[];
}

/**
 * 将扁平的分类列表转换为树形结构
 * @param categories 分类列表
 * @param rootId 可选的根节点ID，如果提供，则以该节点为根构建树
 */
function buildCategoryTree(categories: Category[], rootId?: string): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  // 第一遍：创建 map 并初始化 children
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // 第二遍：建立父子关系
  categories.forEach(cat => {
    const node = map.get(cat.id)!;
    
    // 如果指定了rootId，则以该节点为根；否则以parent_id为null的节点为根
    if (rootId) {
      if (cat.id === rootId) {
        roots.push(node);
      } else {
        const parent = map.get(cat.parent_id!);
        if (parent) {
          parent.children!.push(node);
        }
      }
    } else {
      if (cat.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(cat.parent_id);
        if (parent) {
          parent.children!.push(node);
        }
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
 * GET /api/categories/tree
 * 获取分类树结构（不包含文章）
 * 支持查询参数：
 * - rootId: 指定根分类ID，只返回该分类及其子分类
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rootId = searchParams.get('rootId');

    let categories: Category[];

    if (rootId) {
      // 获取指定根分类及其所有子孙分类
      // 方法：直接用parent_id递归查询（更可靠）
      // 先获取根节点
      const rootCategory = await query<Category[]>(
        'SELECT id, name, parent_id, order_index, depth, path FROM categories WHERE id = ?',
        [rootId]
      );
      
      // 获取所有子孙节点（parent_id = rootId 或者 parent_id 是 rootId 的后代）
      const allCategories = await query<Category[]>(
        'SELECT id, name, parent_id, order_index, depth, path FROM categories ORDER BY path ASC'
      );
      
      // 使用递归筛选出rootId的所有后代
      const filterDescendants = (parentId: string, allCats: Category[]): Category[] => {
        const result: Category[] = [];
        const children = allCats.filter(cat => cat.parent_id === parentId);
        
        for (const child of children) {
          result.push(child);
          result.push(...filterDescendants(child.id, allCats));
        }
        
        return result;
      };
      
      const descendants = filterDescendants(rootId, allCategories);
      
      categories = [...rootCategory, ...descendants];
      console.log(`[API] rootId=${rootId}, 查到 ${categories.length} 个节点`);
    } else {
      // 获取所有分类
      categories = await query<Category[]>(
        'SELECT id, name, parent_id, order_index, depth, path FROM categories ORDER BY path ASC'
      );
    }

    // 构建树：如果有rootId，传入rootId作为根节点
    const tree = buildCategoryTree(categories, rootId || undefined);

    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error('获取分类树失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类树失败' },
      { status: 500 }
    );
  }
}
