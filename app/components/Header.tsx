'use client';

import React, { useState } from 'react';
import { Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import NavigationDrawer from './NavigationDrawer';
import LoginModal from './LoginModal';

interface HeaderProps {
  isVisible?: boolean;
  leftContent?: React.ReactNode; // 左侧自定义内容（可选）
}

/**
 * Header 组件
 * 职责：顶部栏布局容器，组合子组件
 * - 左侧：可自定义内容插槽
 * - 右侧：导航菜单按钮
 */
export default function Header({ isVisible = true, leftContent }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { isLoggedIn, username, logout, login } = useAuth();
  const router = useRouter();

  // 登录成功处理
  const handleLoginSuccess = (user: string) => {
    login(user);
    setLoginModalOpen(false);
  };

  // 退出登录处理
  const handleLogout = () => {
    logout();
    // 不自动跳转到主页，让用户停留在当前页面
    // router.push('/');
  };

  return (
    <>
      {/* Header容器 - 包含header和drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          display: isVisible ? 'block' : 'none',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        {/* Header 固定在顶部 */}
        <header
          style={{
            position: 'relative',
            height: '45px',
            background: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 10001,
            pointerEvents: 'auto',
          }}
        >
          {/* 左侧 - 自定义内容或占位（NavigationDrawer打开时隐藏） */}
          {!drawerOpen && leftContent ? leftContent : <div style={{ width: '40px' }}></div>}
          
          {/* 中间 - 占位保持居中 */}
          <div style={{ flex: 1 }}></div>
          
          {/* 右侧 - 菜单按钮 */}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: '20px', color: 'white' }} />}
            onClick={() => setDrawerOpen(true)}
            style={{ border: 'none' }}
          />

        </header>

        {/* 导航抽屉 - 在header容器内渲染 */}
        <NavigationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isLoggedIn={isLoggedIn}
          username={username}
          onLogin={() => setLoginModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* 登录模态框 */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

