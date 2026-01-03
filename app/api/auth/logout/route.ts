import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout - 用户登出
 */
export async function POST(req: NextRequest) {
  try {
    // 清除refresh token cookie
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 立即过期
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { success: false, error: '登出失败: ' + error.message },
      { status: 500 }
    );
  }
}
