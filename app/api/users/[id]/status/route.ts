import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * PATCH /api/users/[id]/status - 更新用户状态（管理员权限）
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 获取当前用户并验证管理员权限
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录或token已过期' },
        { status: 401 }
      );
    }

    // 2. 验证管理员权限
    const adminCheck = await query(
      'SELECT role FROM users WHERE id = ?',
      [currentUser.id]
    ) as any[];

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '无管理员权限' },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { status } = body;

    // 3. 验证状态参数
    const validStatuses = ['active', 'suspended', 'deleted'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的用户状态' },
        { status: 400 }
      );
    }

    // 4. 防止管理员禁用自己
    if (id === currentUser.id && status !== 'active') {
      return NextResponse.json(
        { success: false, error: '不能修改自己的状态' },
        { status: 400 }
      );
    }

    // 5. 验证用户存在
    const existingUser = await query(
      'SELECT id, username, status FROM users WHERE id = ?',
      [id]
    ) as any[];

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const oldStatus = existingUser[0].status;

    // 6. 如果状态没有变化，返回成功
    if (oldStatus === status) {
      return NextResponse.json({
        success: true,
        message: '用户状态未发生变化',
        user: { id, status },
      });
    }

    // 7. 更新用户状态
    await query(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // 8. 返回更新结果
    const statusMessages = {
      active: '已激活',
      suspended: '已暂停',
      deleted: '已删除',
    };

    return NextResponse.json({
      success: true,
      message: `用户 ${existingUser[0].username} ${statusMessages[status as keyof typeof statusMessages]}`,
      user: {
        id,
        username: existingUser[0].username,
        oldStatus,
        newStatus: status,
      },
    });

  } catch (error: any) {
    console.error('更新用户状态失败:', error);
    return NextResponse.json(
      { success: false, error: '更新用户状态失败: ' + error.message },
      { status: 500 }
    );
  }
}
