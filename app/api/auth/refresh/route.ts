import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, TOKEN_EXPIRATION } from '@/lib/auth';

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
      // Refresh token无效，清除所有cookie
      const response = NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );

      // 清除 access-token cookie
      response.cookies.set('access-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // 立即过期
        path: '/',
      });

      // 清除 refresh-token cookie
      response.cookies.set('refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // 立即过期
        path: '/',
      });

      return response;
    }

    // 返回成功，不再返回 accessToken（存储在 cookie 中）
    const response = NextResponse.json({
      success: true,
    });

    // 设置新的 access token cookie（短期，1h +）
    response.cookies.set('access-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_COOKIE,
      path: '/',
    });

    // 更新 refresh token cookie（长期，7天 + ）
    response.cookies.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_COOKIE,
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
