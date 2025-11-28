'use client';

import React, { useState } from 'react';
import { Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import NavigationDrawer from './NavigationDrawer';
import UserMenu from './UserMenu';
import LoginModal from './LoginModal';
import TimeRangeSelector from './TimeRangeSelector';

interface HeaderProps {
  isVisible?: boolean;
}

/**
 * Header 组件
 * 职责：顶部栏布局容器，组合子组件
 * - 左侧：菜单按钮
 * - 中间：Logo
 * - 右侧：用户菜单
 */
export default function Header({ isVisible = true }: HeaderProps) {
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
    router.push('/');
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
          zIndex: 1000,
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
            zIndex: 1001,
            pointerEvents: 'auto',
          }}
        >
          {/* 左侧 - 菜单按钮 */}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: '20px', color: 'white' }} />}
            onClick={() => setDrawerOpen(true)}
            style={{ border: 'none' }}
          />

          {/* 中间 - 时间范围选择器 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <TimeRangeSelector />
          </div>

          {/* 右侧 - 用户菜单 */}
          <UserMenu
            isLoggedIn={isLoggedIn}
            username={username}
            onLogin={() => setLoginModalOpen(true)}
            onLogout={handleLogout}
          />
        </header>

        {/* 导航抽屉 - 在header容器内渲染 */}
        <NavigationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isLoggedIn={isLoggedIn}
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

