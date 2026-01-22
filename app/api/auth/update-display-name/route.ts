import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * POST /api/auth/update-display-name - 更新当前用户的显示名
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 获取当前用户
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录或token已过期' },
        { status: 401 }
      );
    }

    // 2. 获取请求体
    const body = await req.json();
    const { displayName } = body;

    // 3. 验证显示名
    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { success: false, error: '请输入有效的显示名' },
        { status: 400 }
      );
    }

    const trimmedDisplayName = displayName.trim();

    if (trimmedDisplayName.length === 0) {
      return NextResponse.json(
        { success: false, error: '显示名不能为空' },
        { status: 400 }
      );
    }

    if (trimmedDisplayName.length > 50) {
      return NextResponse.json(
        { success: false, error: '显示名长度不能超过50个字符' },
        { status: 400 }
      );
    }

    // 4. 更新显示名
    await query(
      'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [trimmedDisplayName, currentUser.id]
    );

    // 5. 获取更新后的用户信息
    const users = await query(
      `SELECT id, username, email, display_name, avatar_base64, bio, role, status,
              email_verified, last_login_at, created_at, updated_at, max_access_level
       FROM users
       WHERE id = ?`,
      [currentUser.id]
    ) as any[];

    // 6. 返回更新结果
    return NextResponse.json({
      success: true,
      user: users[0],
      message: '显示名更新成功',
    });

  } catch (error: any) {
    console.error('更新显示名失败:', error);
    return NextResponse.json(
      { success: false, error: '更新显示名失败: ' + error.message },
      { status: 500 }
    );
  }
}

