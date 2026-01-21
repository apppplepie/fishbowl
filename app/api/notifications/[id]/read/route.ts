import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * PATCH /api/notifications/[id]/read - 标记通知为已读
 */
export async function PATCH(
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

    // 2. 验证通知是否存在且属于当前用户
    const comments = await query(
      'SELECT id FROM comments WHERE id = ? AND notify_user_id = ? AND notification_read = 0',
      [commentId, currentUser.id]
    ) as any[];

    if (comments.length === 0) {
      return NextResponse.json(
        { success: false, error: '通知不存在或已读' },
        { status: 404 }
      );
    }

    // 3. 标记为已读
    await query(
      'UPDATE comments SET notification_read = 1 WHERE id = ?',
      [commentId]
    );

    return NextResponse.json({
      success: true,
      message: '通知已标记为已读',
    });

  } catch (error: any) {
    console.error('标记通知为已读失败:', error);
    return NextResponse.json(
      { success: false, error: '标记通知为已读失败: ' + error.message },
      { status: 500 }
    );
  }
}

