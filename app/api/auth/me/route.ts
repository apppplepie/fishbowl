import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/auth/me - 获取当前登录用户信息
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 获取当前用户
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录或token已过期' },
        { status: 401 }
      );
    }

    // 2. 从数据库获取最新用户信息
    const users = await query(
      `SELECT id, username, email, display_name, avatar_base64, bio, role, status,
              email_verified, last_login_at, created_at, max_access_level
       FROM users
       WHERE id = ?`,
      [currentUser.id]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = users[0];

    // 3. 检查用户状态
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账号状态异常' },
        { status: 403 }
      );
    }

    // 4. 返回用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_base64: user.avatar_base64,
        bio: user.bio,
        role: user.role,
        email_verified: user.email_verified,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        max_access_level: user.max_access_level || 3, // 默认用户权限
      },
    });

  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败: ' + error.message },
      { status: 500 }
    );
  }
}

