'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';

/**
 * 受保护的路由布局
 * 自动检查用户登录状态，未登录则跳转到首页
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    // 等待初始化完成后再检查登录状态
    if (!isLoading && !isLoggedIn) {
      router.push('/?login=true'); // 可以带上参数自动打开登录弹窗
    }
  }, [isLoggedIn, isLoading, router]);

  // 未登录时跳转，但不显示加载状态
  if (!isLoading && !isLoggedIn) {
    // useEffect 会处理跳转，这里直接返回 null 或 children
    return null;
  }

  // 直接渲染子组件，不显示加载状态
  return <>{children}</>;
}

