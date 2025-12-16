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
            // 更新分类的 order_index
            await connection.execute(
              'UPDATE categories SET order_index = ? WHERE id = ? AND parent_id = ?',
              [child.order_index, child.id, parent_id]
            );
          } else if (child.type === 'article') {
            // 更新文章的 order_index
            await connection.execute(
              'UPDATE articles SET order_index = ? WHERE id = ? AND category_id = ?',
              [child.order_index, child.id, parent_id]
            );
          }
        }
      }

      // 4.2 处理 moved（更新 parent_id）
      if (moved) {
        await connection.execute(
          'UPDATE articles SET category_id = ? WHERE id = ?',
          [moved.new_parent_id, moved.id]
        );
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
