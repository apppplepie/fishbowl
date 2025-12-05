/**
 * 获取特定分类的完整子树（包含分类和文章的混合节点）
 * GET /api/categories/:id/tree-with-articles
 * 高效实现：只两次查询（categories descendants + articles under those categories）
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
 * 把平铺节点数组构造成树（O(n)复杂度）
 */
function buildTree(nodes: TreeNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // 创建节点映射，确保每个节点都有children数组
  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] });
  }

  // 构建树结构
  for (const node of nodes) {
    const currentNode = map.get(node.id)!;
    if (!node.parent_id || node.parent_id === 'root') {
      roots.push(currentNode);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) {
        parent.children!.push(currentNode);
      } else {
        // 没有找到父节点时，也把它当根返回，避免丢数据
        roots.push(currentNode);
      }
    }
  }

  return roots;
}

/**
 * 获取指定分类的完整子树（包含分类和文章的混合节点）
 * - 高效：只两次查询（categories descendants + articles under those categories）
 * - 依赖：categories.path 已存在并以 LPAD(order_index,6,'0') 分段，能保证字典序排序实现混合排序
 */
async function getTreeNodes(parentId: string): Promise<TreeNode[]> {
  // 1) 读取 parent 的 path & depth（用于构建 LIKE 模式以及处理 parent 本身）
  const parentRows = await query<any[]>(
    'SELECT id, path, depth FROM categories WHERE id = ?',
    [parentId]
  );

  if (!parentRows || parentRows.length === 0) {
    // 父分类不存在，直接返回空数组（调用方会处理 404）
    return [];
  }

  const parentPath: string = parentRows[0].path ?? '';

  // 构造 LIKE 模式，包含自身及其后代
  const likePattern = `${parentPath}%`;

  // 2) 一次性查询所有后代 categories（包含自身）
  const categories = await query<any[]>(
    `SELECT id, name, parent_id, path, depth, order_index
     FROM categories
     WHERE path LIKE ?
     ORDER BY path ASC`,
    [likePattern]
  );

  // 3) 一次性查询所有属于这些 categories 的 articles（只有 published）
  //    这里通过 categories.path 做 JOIN，并在 SQL 中尽量少做字符串操作，方便索引使用
  //    我们仍然需要 article 的最终 path（category.path + '-' + LPAD(article.order_in_category,6,'0')）
  const articles = await query<any[]>(
    `SELECT a.id, a.title, a.type, a.publish_date, a.order_in_category, a.category_id,
            c.path AS category_path, c.depth AS category_depth, c.order_index AS category_order_index
     FROM articles a
     JOIN categories c ON a.category_id = c.id
     WHERE c.path LIKE ? AND a.status = 'published'
     ORDER BY c.path ASC, a.order_in_category ASC`,
    [likePattern]
  );

  // 4) map categories -> TreeNode
  const nodes: TreeNode[] = [];

  for (const category of categories) {
    nodes.push({
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      path: category.path,
      depth: category.depth,
      order_index: category.order_index,
      node_type: 'category',
      children: [],
    });
  }

  // 5) map articles -> TreeNode (生成 article.path = category.path + '-' + LPAD(order,6,'0'))
  for (const article of articles) {
    const catPath = article.category_path ?? parentPath; // 容错
    const artPath = `${catPath}-${String(article.order_in_category).padStart(6, '0')}`;

    nodes.push({
      id: article.id,
      name: article.title,
      parent_id: article.category_id,
      path: artPath,
      depth: (article.category_depth ?? 0) + 1,
      order_index: article.order_in_category,
      node_type: 'article',
      type: article.type,
      publish_date: article.publish_date,
      children: [],
    });
  }

  // 6) 全部按 path 排序（path 已由 categories 的 path 与 article 的 padded order 保证字典序正确）
  nodes.sort((x, y) => (x.path || '').localeCompare(y.path || ''));

  return nodes;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证分类是否存在（提前检查）
    const categoryCheck = await query<any[]>(
      'SELECT id, name, path, depth FROM categories WHERE id = ?',
      [id]
    );

    if (!categoryCheck || categoryCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 获取平铺的混合节点（已排序）
    const flatNodes = await getTreeNodes(id);

    // 构建树形结构
    const tree = buildTree(flatNodes);

    return NextResponse.json({
      success: true,
      data: {
        flat: flatNodes, // 按混合 path 排序的平铺列表
        tree,            // 构建好的树（children 嵌套）
      },
    });

  } catch (error: any) {
    console.error('获取分类树失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: `获取分类树失败: ${error.message}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
