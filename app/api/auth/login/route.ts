import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateTokens, TOKEN_EXPIRATION } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/login - 用户登录
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    // 1. 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 2. 查询用户（支持用户名或邮箱登录）
    const users = await query(
      `SELECT id, username, email, password_hash, display_name, avatar_url, role, status, max_access_level
       FROM users
       WHERE username = ? OR email = ?`,
      [username, username]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 3. 检查用户状态
    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: '账号已被封禁，请联系管理员' },
        { status: 403 }
      );
    }

    if (user.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: '账号已被删除' },
        { status: 403 }
      );
    }

    // 4. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 5. 更新最后登录时间
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // 6. 生成JWT Tokens
    const tokens = generateTokens({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      max_access_level: user.max_access_level || 3,
    });

    // 7. 设置HttpOnly cookie存储access token和refresh token
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      // 不再返回 accessToken，因为存储在 HttpOnly cookie 中
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role,
        max_access_level: user.max_access_level || 3,
      },
    });

    // 设置 access token cookie（短期，1h +）
    response.cookies.set('access-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 改为 lax 以支持从其他页面跳转
      maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_COOKIE,
      path: '/',
    });

    // 设置 refresh token cookie（长期，7天 + ）
    response.cookies.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_COOKIE,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: '登录失败: ' + error.message },
      { status: 500 }
    );
  }
}
