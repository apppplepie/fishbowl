/**
 * 分类移动 API
 * POST /api/categories/:id/move - 移动分类到新的父节点
 * 
 * 会自动：
 * 1. 更新 parent_id 和 order_index
 * 2. 重新计算 depth 和 path
 * 3. 递归更新所有子节点的 depth 和 path
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  depth: number;
  path: string;
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
 * 调整同级所有节点的顺序（包括分类和文章）
 * 在同一个父节点下，分类和文章是混排的，共享同一个顺序空间
 */
async function adjustSiblingsOrder(
  parentId: string | null,
  oldPosition: number,
  newPosition: number,
  movedItemIsCategory: boolean,
  movedItemId: string
): Promise<void> {
  if (oldPosition < newPosition) {
    // 向后移动：将 (oldPosition, newPosition] 区间的所有节点 -1
    // 更新分类
    await query(
      `UPDATE categories 
       SET order_index = order_index - 1 
       WHERE ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
       AND order_index > ? AND order_index <= ?
       ${movedItemIsCategory ? 'AND id != ?' : ''}`,
      parentId 
        ? (movedItemIsCategory ? [parentId, oldPosition, newPosition, movedItemId] : [parentId, oldPosition, newPosition])
        : (movedItemIsCategory ? [oldPosition, newPosition, movedItemId] : [oldPosition, newPosition])
    );

    // 更新文章
    await query(
      `UPDATE articles 
       SET order_index = order_index - 1 
       WHERE ${parentId ? 'category_id = ?' : 'category_id IS NULL'}
       AND order_index > ? AND order_index <= ?
       ${!movedItemIsCategory ? 'AND id != ?' : ''}`,
      parentId 
        ? (!movedItemIsCategory ? [parentId, oldPosition, newPosition, movedItemId] : [parentId, oldPosition, newPosition])
        : (!movedItemIsCategory ? [oldPosition, newPosition, movedItemId] : [oldPosition, newPosition])
    );
  } else if (oldPosition > newPosition) {
    // 向前移动：将 [newPosition, oldPosition) 区间的所有节点 +1
    // 更新分类
    await query(
      `UPDATE categories 
       SET order_index = order_index + 1 
       WHERE ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
       AND order_index >= ? AND order_index < ?
       ${movedItemIsCategory ? 'AND id != ?' : ''}`,
      parentId 
        ? (movedItemIsCategory ? [parentId, newPosition, oldPosition, movedItemId] : [parentId, newPosition, oldPosition])
        : (movedItemIsCategory ? [newPosition, oldPosition, movedItemId] : [newPosition, oldPosition])
    );

    // 更新文章
    await query(
      `UPDATE articles 
       SET order_index = order_index + 1 
       WHERE ${parentId ? 'category_id = ?' : 'category_id IS NULL'}
       AND order_index >= ? AND order_index < ?
       ${!movedItemIsCategory ? 'AND id != ?' : ''}`,
      parentId 
        ? (!movedItemIsCategory ? [parentId, newPosition, oldPosition, movedItemId] : [parentId, newPosition, oldPosition])
        : (!movedItemIsCategory ? [newPosition, oldPosition, movedItemId] : [newPosition, oldPosition])
    );
  }
}

/**
 * 为插入新节点腾出空间（不同级移动时使用）
 */
async function makeSpaceForInsertion(
  parentId: string | null,
  insertPosition: number
): Promise<void> {
  // 将指定位置及之后的所有节点（分类和文章）都 +1
  await query(
    `UPDATE categories 
     SET order_index = order_index + 1 
     WHERE ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
     AND order_index >= ?`,
    parentId ? [parentId, insertPosition] : [insertPosition]
  );

  await query(
    `UPDATE articles 
     SET order_index = order_index + 1 
     WHERE ${parentId ? 'category_id = ?' : 'category_id IS NULL'}
     AND order_index >= ?`,
    parentId ? [parentId, insertPosition] : [insertPosition]
  );
}

/**
 * POST /api/categories/:id/move
 * 请求体：
 * {
 *   "new_parent_id": "目标父节点ID（可选，null表示移到根节点）",
 *   "new_order_index": "新的顺序索引（可选，默认为0）"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;
    const body = await request.json();
    const { new_parent_id, new_order_index = 0 } = body;

    // 1. 验证：不能移动到自己下面
    if (categoryId === new_parent_id) {
      return NextResponse.json(
        { success: false, error: '不能将分类移动到自己下面' },
        { status: 400 }
      );
    }

    // 2. 验证：不能移动到自己的子孙节点下面（会造成循环）
    if (new_parent_id) {
      const targetParent = await query<Category[]>(
        'SELECT path FROM categories WHERE id = ?',
        [new_parent_id]
      );

      if (targetParent.length === 0) {
        return NextResponse.json(
          { success: false, error: '目标父分类不存在' },
          { status: 404 }
        );
      }

      const currentNode = await query<Category[]>(
        'SELECT path FROM categories WHERE id = ?',
        [categoryId]
      );

      if (currentNode.length === 0) {
        return NextResponse.json(
          { success: false, error: '当前分类不存在' },
          { status: 404 }
        );
      }

      // 检查目标父节点的 path 是否以当前节点的 path 开头
      if (targetParent[0].path.startsWith(currentNode[0].path)) {
        return NextResponse.json(
          { success: false, error: '不能将分类移动到自己的子孙节点下面' },
          { status: 400 }
        );
      }
    }

    // 3. 获取当前节点信息（用于判断是否同级移动）
    const currentNode = await query<Category[]>(
      'SELECT parent_id, order_index FROM categories WHERE id = ?',
      [categoryId]
    );

    if (currentNode.length === 0) {
      return NextResponse.json(
        { success: false, error: '当前分类不存在' },
        { status: 404 }
      );
    }

    const oldParentId = currentNode[0].parent_id;
    const oldOrderIndex = currentNode[0].order_index;
    const isSameLevel = oldParentId === (new_parent_id || null);

    // 4. 如果是同级移动且指定了顺序，需要调整所有同级节点（包括分类和文章）
    if (isSameLevel && new_order_index !== undefined && new_order_index !== oldOrderIndex) {
      // 先将当前节点的 order_index 设为一个临时值（避免冲突）
      await query(
        'UPDATE categories SET order_index = -1 WHERE id = ?',
        [categoryId]
      );

      // 调整所有同级的分类和文章
      await adjustSiblingsOrder(
        oldParentId,
        oldOrderIndex,
        new_order_index,
        true, // 移动的是分类
        categoryId
      );
    } else if (!isSameLevel && new_order_index !== undefined) {
      // 不同级移动：需要在目标位置为所有节点（分类和文章）腾出空间
      await makeSpaceForInsertion(new_parent_id || null, new_order_index);
    }

    // 5. 执行移动操作（会递归更新所有子节点）
    await updateNodeAndChildren(
      categoryId,
      new_parent_id || null,
      new_order_index
    );

    return NextResponse.json({
      success: true,
      message: '分类移动成功'
    });

  } catch (error: any) {
    console.error('移动分类失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '移动分类失败' },
      { status: 500 }
    );
  }
}

