import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/change-password - 修改当前用户的密码
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
    const { oldPassword, newPassword, confirmPassword } = body;

    // 3. 验证输入
    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: '请填写所有字段' },
        { status: 400 }
      );
    }

    // 4. 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: '两次输入的新密码不一致' },
        { status: 400 }
      );
    }

    // 5. 验证新密码强度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码长度至少为6个字符' },
        { status: 400 }
      );
    }

    if (newPassword.length > 100) {
      return NextResponse.json(
        { success: false, error: '密码长度不能超过100个字符' },
        { status: 400 }
      );
    }

    // 6. 获取用户当前密码
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [currentUser.id]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 7. 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, users[0].password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '当前密码错误' },
        { status: 400 }
      );
    }

    // 8. 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 9. 更新密码
    await query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, currentUser.id]
    );

    // 10. 返回成功结果
    return NextResponse.json({
      success: true,
      message: '密码修改成功',
    });

  } catch (error: any) {
    console.error('修改密码失败:', error);
    return NextResponse.json(
      { success: false, error: '修改密码失败: ' + error.message },
      { status: 500 }
    );
  }
}

