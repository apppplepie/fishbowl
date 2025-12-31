'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, message } from 'antd';
import { useAuth } from '@/app/hooks/useAuth';

/**
 * 管理员专用路由布局
 * 只有管理员才能访问的页面
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoggedIn, isLoading, user, getToken } = useAuth();

  useEffect(() => {
    const checkAdminAccess = async () => {
      // 等待初始化完成后再检查登录状态
      if (isLoading) return;

      if (!isLoggedIn) {
        router.push('/?login=true');
        return;
      }

      // 前端初步检查
      if (user?.role !== 'admin') {
        message.error('无权限访问此页面');
        router.push('/profile');
        return;
      }

      // 后端验证管理员权限
      try {
        const token = getToken();
        if (!token) {
          message.error('认证失败，请重新登录');
          router.push('/?login=true');
          return;
        }

        const response = await fetch('/api/auth/verify-admin', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          message.error(data.error || '无权限访问此页面');
          router.push('/profile');
          return;
        }

        const data = await response.json();
        if (!data.success || !data.isAdmin) {
          message.error('无权限访问此页面');
          router.push('/profile');
          return;
        }

      } catch (error) {
        console.error('验证管理员权限失败:', error);
        message.error('验证权限失败，请稍后重试');
        router.push('/profile');
      }
    };

    checkAdminAccess();
  }, [isLoggedIn, isLoading, user, router, getToken]);

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
            验证权限中...
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

  // 前端检查失败时显示加载状态（等待跳转）
  if (user?.role !== 'admin') {
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
            无权限访问...
          </div>
        </div>
      </div>
    );
  }

  // 已验证为管理员，渲染子组件
  return <>{children}</>;
}
