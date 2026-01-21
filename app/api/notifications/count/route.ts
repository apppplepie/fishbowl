import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/notifications/count - 只获取未读通知数量（轻量级）
 * 用于 Header 轮询，性能优化版本
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 验证用户登录
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录', count: 0 },
        { status: 401 }
      );
    }

    // 2. 只查询数量，不返回完整数据（性能优化）
    const result = await query(
      `SELECT COUNT(*) as count
       FROM comments c
       WHERE c.notify_user_id = ? 
         AND c.notification_read = 0
         AND c.status = 'visible'`,
      [currentUser.id]
    ) as any[];

    const count = result[0]?.count || 0;

    return NextResponse.json({
      success: true,
      count: Number(count),
    });

  } catch (error: any) {
    console.error('获取通知数量失败:', error);
    return NextResponse.json(
      { success: false, error: '获取通知数量失败: ' + error.message, count: 0 },
      { status: 500 }
    );
  }
}

