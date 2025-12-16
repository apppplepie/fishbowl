/**
 * 树形结构拖拽排序 API
 * POST /api/tree/reorder - 处理文章和分类的拖拽排序
 *
 * 请求体格式：
 * {
 *   "moves": [
 *     {
 *       "parent_id": "parent_id_1",
 *       "children": [
 *         { "id": "item_1", "type": "category|article", "order_index": 1 },
 *         { "id": "item_2", "type": "category|article", "order_index": 2 }
 *       ]
 *     },
 *     {
 *       "parent_id": "parent_id_2",
 *       "children": [...]
 *     }
 *   ],
 *   "moved": {
 *     "id": "moved_item_id",
 *     "new_parent_id": "new_parent_id"
 *   } | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * 递归更新节点及其所有子节点的 depth 和 path
 */
async function updateNodeAndChildren(
  connection: any,
  nodeId: string,
  newParentId: string | null,
  newOrderIndex: number
): Promise<void> {
  // 1. 获取新父节点的信息（如果有父节点）
  let parentDepth = 0;
  let parentPath = '';

  if (newParentId) {
    const [parentResult] = await connection.execute(
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
  await connection.execute(
    `UPDATE categories
     SET parent_id = ?, order_index = ?, depth = ?, path = ?
     WHERE id = ?`,
    [newParentId, newOrderIndex, newDepth, newPath, nodeId]
  );

  // 4. 递归更新所有子节点
  const [children] = await connection.execute(
    'SELECT id, order_index FROM categories WHERE parent_id = ? ORDER BY order_index',
    [nodeId]
  );

  for (const child of children) {
    await updateNodeAndChildren(connection, child.id, nodeId, child.order_index);
  }
}

interface ReorderRequest {
  moves: Array<{
    parent_id: string;
    children: Array<{
      id: string;
      type: 'category' | 'article';
      order_index: number;
    }>;
  }>;
  moved: {
    id: string;
    new_parent_id: string;
  } | null;
}

/**
 * POST /api/tree/reorder
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const body: ReorderRequest = await request.json();
    const { moves, moved } = body;

    console.log('树形结构拖拽排序请求:', { moves, moved, currentUser: currentUser.username });

    // 2. 验证请求数据
    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少 moves 参数' },
        { status: 400 }
      );
    }

    // 3. 权限验证：检查用户是否有权操作涉及的所有文章
    if (moved) {
      // 检查被移动的文章
      const movedArticle = await query<any[]>(
        'SELECT author_id FROM articles WHERE id = ?',
        [moved.id]
      );

      if (movedArticle.length > 0) {
        const isAuthor = movedArticle[0].author_id === currentUser.id;
        if (!isAuthor) {
          return NextResponse.json(
            { success: false, error: '无权操作此文章' },
            { status: 403 }
          );
        }
      }
    }

    // 检查所有涉及的文章权限
    for (const move of moves) {
      for (const child of move.children) {
        if (child.type === 'article') {
          const article = await query<any[]>(
            'SELECT author_id FROM articles WHERE id = ?',
            [child.id]
          );

          if (article.length > 0) {
            const isAuthor = article[0].author_id === currentUser.id;
            if (!isAuthor) {
              return NextResponse.json(
                { success: false, error: '无权操作某些文章' },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // 4. 在事务中执行所有更新操作
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 4.1 处理所有 moves（更新 order_index）
      for (const move of moves) {
        const { parent_id, children } = move;

        for (const child of children) {
          if (child.type === 'category') {
            // 更新分类的 order_index 和 path
            await updateNodeAndChildren(connection, child.id, parent_id, child.order_index);
          } else if (child.type === 'article') {
            // 更新文章的 order_index
            await connection.execute(
              'UPDATE articles SET order_index = ? WHERE id = ? AND category_id = ?',
              [child.order_index, child.id, parent_id]
            );
          }
        }
      }

      // 4.2 处理 moved（更新 parent_id 或 path）
      if (moved) {
        // 检查是否是 category 移动（通过查询 categories 表）
        const [movedResult] = await connection.execute(
          'SELECT id FROM categories WHERE id = ?',
          [moved.id]
        );

        if (movedResult && Array.isArray(movedResult) && movedResult.length > 0) {
          // 是 category，需要更新整个子树
          // 找到这个 category 在新 parent 中的 order_index
          const targetMove = moves.find(m => m.parent_id === moved.new_parent_id);
          const categoryOrderIndex = targetMove?.children.find(c => c.id === moved.id)?.order_index || 0;
          await updateNodeAndChildren(connection, moved.id, moved.new_parent_id, categoryOrderIndex);
        } else {
          // 是 article，只需要更新 category_id
          await connection.execute(
            'UPDATE articles SET category_id = ? WHERE id = ?',
            [moved.new_parent_id, moved.id]
          );
        }
      }

      // 提交事务
      await connection.commit();

      console.log('树形结构拖拽排序成功:', {
        movesCount: moves.length,
        moved: moved ? moved.id : null,
        user: currentUser.username
      });

      return NextResponse.json({
        success: true,
        message: '排序更新成功'
      });

    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }

  } catch (error: any) {
    console.error('树形结构拖拽排序失败:', error);
    return NextResponse.json(
      { success: false, error: '排序更新失败: ' + error.message },
      { status: 500 }
    );
  }
}
