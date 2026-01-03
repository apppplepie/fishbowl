import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';

/**
 * POST /api/auth/refresh - 刷新Access Token
 */
export async function POST(req: NextRequest) {
  try {
    // 从HttpOnly cookie中获取refresh token
    const refreshToken = req.cookies.get('refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // 使用refresh token生成新的token对
    const tokens = refreshAccessToken(refreshToken);

    if (!tokens) {
      // Refresh token无效，清除cookie
      const response = NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );

      response.cookies.set('refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // 立即过期
        path: '/',
      });

      return response;
    }

    // 返回新的access token，并更新refresh token cookie
    const response = NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
    });

    // 更新refresh token cookie
    response.cookies.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Token refresh failed:', error);
    return NextResponse.json(
      { success: false, error: 'Token refresh failed: ' + error.message },
      { status: 500 }
    );
  }
}
