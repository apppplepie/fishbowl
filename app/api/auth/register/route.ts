import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/auth/register - 用户注册
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, display_name } = body;

    // 1. 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '用户名、邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 2. 验证用户名格式（3-20字符，字母数字下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名必须是3-20个字符，只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // 3. 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 4. 验证密码强度（至少6个字符）
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6个字符' },
        { status: 400 }
      );
    }

    // 5. 检查用户名是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: '用户名已被使用' },
        { status: 400 }
      );
    }

    // 6. 检查邮箱是否已存在
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { success: false, error: '邮箱已被注册' },
        { status: 400 }
      );
    }

    // 7. 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 8. 创建用户
    const userId = uuidv4();
    await query(
      `INSERT INTO users 
       (id, username, email, password_hash, display_name, role, status, email_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        email,
        passwordHash,
        display_name || username,
        'user', // 默认角色
        'active',
        false // 邮箱未验证
      ]
    );

    // 9. 创建用户设置
    await query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );

    // 10. 生成JWT Token
    const token = generateToken({
      id: userId,
      username,
      email,
      role: 'user',
    });

    // 11. 返回用户信息和token
    return NextResponse.json({
      success: true,
      message: '注册成功',
      token,
      user: {
        id: userId,
        username,
        email,
        display_name: display_name || username,
        role: 'user',
      },
    });

  } catch (error: any) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { success: false, error: '注册失败: ' + error.message },
      { status: 500 }
    );
  }
}

