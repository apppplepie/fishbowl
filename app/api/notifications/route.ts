import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/notifications - 获取当前用户的未读通知列表（最多10条）
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 验证用户登录
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 获取未读通知列表（最多10条）
    const notifications = await query(
      `SELECT 
        c.id as comment_id,
        c.article_id,
        c.content as comment_content,
        c.parent_id,
        c.notification_read,
        c.created_at,
        a.title as article_title,
        u.username,
        u.display_name,
        u.avatar_base64
      FROM comments c
      JOIN articles a ON c.article_id = a.id
      JOIN users u ON c.user_id = u.id
      WHERE c.notify_user_id = ? 
        AND c.notification_read = 0
        AND c.status = 'visible'
      ORDER BY c.created_at DESC
      LIMIT 10`,
      [currentUser.id]
    ) as any[];

    // 3. 格式化返回数据
    const formattedNotifications = notifications.map(notif => ({
      id: notif.comment_id,
      comment_id: notif.comment_id,
      article_id: notif.article_id,
      article_title: notif.article_title,
      commenter: {
        username: notif.username,
        display_name: notif.display_name,
        avatar_base64: notif.avatar_base64,
      },
      comment_content: notif.comment_content,
      is_reply: notif.parent_id !== null,
      parent_comment_id: notif.parent_id,
      created_at: notif.created_at,
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      count: formattedNotifications.length,
    });

  } catch (error: any) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取通知列表失败: ' + error.message },
      { status: 500 }
    );
  }
}

