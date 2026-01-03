import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 这个函数会在每个请求之前执行
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 从HttpOnly cookie获取refresh token来检查登录状态
  const refreshToken = request.cookies.get('refresh-token')?.value;
  const isLoggedIn = !!refreshToken;

  // 定义需要保护的路由
  const protectedRoutes = [
    '/(protected)', // 所有受保护的路由
    '/publish-article',
    '/publish-book',
    '/publish-chapter',
    '/admin'
  ];

  const authRoutes = ['/login', '/register', '/forgot-password'];
  const publicRoutes = ['/', '/about', '/gallery', '/bookcase', '/archive'];

  // 检查是否访问受保护的路由
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // 检查是否访问认证页面
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  );

  // 检查是否为公开路由或API路由
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/article/') || pathname.startsWith('/book/')
  );

  const isApiRoute = pathname.startsWith('/api/');

  // API路由不需要重定向，由前端处理token过期
  if (isApiRoute) {
    return NextResponse.next();
  }

  // 未登录访问受保护路由 → 重定向到首页（而非登录页）
  if (isProtectedRoute && !isLoggedIn) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // 已登录访问认证页面 → 重定向到首页
  if (isAuthRoute && isLoggedIn) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // 允许请求继续
  return NextResponse.next();
}

// 配置哪些路径需要执行 middleware
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api (API routes)
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

