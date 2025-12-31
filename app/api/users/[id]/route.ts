import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/users/[id] - 获取特定用户信息（管理员权限）
 */
export async function GET(
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

    // 3. 获取用户信息
    const users = await query(
      `SELECT id, username, email, display_name, avatar_url, bio, role, status,
              email_verified, last_login_at, created_at, updated_at, max_access_level
       FROM users
       WHERE id = ?`,
      [id]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 4. 返回用户信息
    return NextResponse.json({
      success: true,
      user: users[0],
    });

  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id] - 更新用户信息（管理员权限）
 */
export async function PUT(
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

    // 3. 验证用户存在
    const existingUser = await query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    ) as any[];

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 4. 构建更新字段
    const allowedFields = [
      'display_name', 'avatar_url', 'bio', 'role', 'status',
      'email_verified', 'max_access_level'
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // 特殊处理 role 字段，确保是有效的枚举值
        if (field === 'role' && !['admin', 'moderator', 'user'].includes(body[field])) {
          return NextResponse.json(
            { success: false, error: '无效的用户角色' },
            { status: 400 }
          );
        }

        // 特殊处理 status 字段，确保是有效的枚举值
        if (field === 'status' && !['active', 'suspended', 'deleted'].includes(body[field])) {
          return NextResponse.json(
            { success: false, error: '无效的用户状态' },
            { status: 400 }
          );
        }

        updateFields.push(`${field} = ?`);
        updateValues.push(body[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有提供要更新的字段' },
        { status: 400 }
      );
    }

    // 5. 执行更新
    await query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...updateValues, id]
    );

    // 6. 获取更新后的用户信息
    const updatedUsers = await query(
      `SELECT id, username, email, display_name, avatar_url, bio, role, status,
              email_verified, last_login_at, created_at, updated_at, max_access_level
       FROM users
       WHERE id = ?`,
      [id]
    ) as any[];

    // 7. 返回更新结果
    return NextResponse.json({
      success: true,
      user: updatedUsers[0],
      message: '用户信息更新成功',
    });

  } catch (error: any) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '更新用户信息失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - 删除用户（管理员权限）
 */
export async function DELETE(
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

    // 3. 防止管理员删除自己
    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: '不能删除自己的账号' },
        { status: 400 }
      );
    }

    // 4. 验证用户存在
    const existingUser = await query(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    ) as any[];

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 5. 执行软删除（将状态改为 deleted）
    await query(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['deleted', id]
    );

    // 6. 返回删除结果
    return NextResponse.json({
      success: true,
      message: `用户 ${existingUser[0].username} 已删除`,
    });

  } catch (error: any) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败: ' + error.message },
      { status: 500 }
    );
  }
}
