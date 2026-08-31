import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

/**
 * POST /api/auth/logout - 用户登出
 */
export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    for (const name of [SESSION_COOKIE_NAME, 'access-token', 'refresh-token']) {
      response.cookies.set(name, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
    }

    return response;

  } catch (error: any) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { success: false, error: '登出失败: ' + error.message },
      { status: 500 }
    );
  }
}
