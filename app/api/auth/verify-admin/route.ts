import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/auth/verify-admin - 验证管理员权限
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
      `SELECT id, role, status
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

    // 4. 检查管理员权限
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: '无管理员权限' },
        { status: 403 }
      );
    }

    // 5. 返回验证结果
    return NextResponse.json({
      success: true,
      isAdmin: true,
      user: {
        id: user.id,
        role: user.role,
      },
    });

  } catch (error: any) {
    console.error('验证管理员权限失败:', error);
    return NextResponse.json(
      { success: false, error: '验证管理员权限失败: ' + error.message },
      { status: 500 }
    );
  }
}
