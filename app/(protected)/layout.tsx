'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
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

  // 正在初始化时显示加载状态
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', color: '#666' }}>
            加载中...
          </div>
        </div>
      </div>
    );
  }

  // 未登录时显示加载状态（等待跳转）
  if (!isLoggedIn) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', color: '#666' }}>
            请先登录...
          </div>
        </div>
      </div>
    );
  }

  // 已登录，渲染子组件
  return <>{children}</>;
}

