'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { Spin } from 'antd';

// 模拟检查登录状态的 hook（已禁用）
/*
function useAuth() {
  // 实际项目中，这里应该：
  // 1. 从 localStorage/cookie 读取 token
  // 2. 验证 token 是否有效
  // 3. 可以调用 API 验证用户信息
  
  const isLoggedIn = typeof window !== 'undefined' 
    ? localStorage.getItem('isLoggedIn') === 'true'
    : false;
  
  const isLoading = false; // 实际中可能需要异步验证
  
  return { isLoggedIn, isLoading };
}
*/

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🚫 路由守卫已暂时禁用
  // 如需启用，取消注释下面的代码和上面的导入
  
  /* 
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    // 如果未登录，重定向到登录页
    if (!isLoading && !isLoggedIn) {
      router.push('/login?redirect=' + window.location.pathname);
    }
  }, [isLoggedIn, isLoading, router]);

  // 加载中显示
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="验证登录状态..." />
      </div>
    );
  }

  // 未登录不渲染内容
  if (!isLoggedIn) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="跳转中..." />
      </div>
    );
  }
  */

  // 直接渲染子组件（无守卫）
  return <>{children}</>;
}

