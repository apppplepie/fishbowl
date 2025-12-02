import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, canModerate } from '@/lib/auth';

/**
 * DELETE /api/comments/[id] - 删除评论（需要权限）
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;

    // 1. 验证用户登录
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 获取评论信息
    const comments = await query(
      'SELECT id, user_id, article_id, content FROM comments WHERE id = ?',
      [commentId]
    ) as any[];

    if (comments.length === 0) {
      return NextResponse.json(
        { success: false, error: '评论不存在' },
        { status: 404 }
      );
    }

    const comment = comments[0];

    // 3. 权限检查：评论作者 OR 管理员 OR 版主
    const isCommentAuthor = comment.user_id === currentUser.id;
    const hasModeratePermission = canModerate(currentUser);

    if (!isCommentAuthor && !hasModeratePermission) {
      return NextResponse.json(
        { success: false, error: '无权删除此评论' },
        { status: 403 }
      );
    }

    // 4. 删除评论（软删除）
    await query(
      `UPDATE comments SET status = 'deleted' WHERE id = ?`,
      [commentId]
    );

    // 5. 更新文章评论数
    await query(
      'UPDATE articles SET comments = GREATEST(comments - 1, 0) WHERE id = ?',
      [comment.article_id]
    );

    console.log(`🗑️ 评论已删除: ${commentId} by ${currentUser.username}`);

    return NextResponse.json({
      success: true,
      message: '评论删除成功',
    });

  } catch (error: any) {
    console.error('删除评论失败:', error);
    return NextResponse.json(
      { success: false, error: '删除评论失败: ' + error.message },
      { status: 500 }
    );
  }
}

