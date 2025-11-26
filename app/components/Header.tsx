'use client';

import React, { useState, useEffect } from 'react';
import { Button, Drawer, Menu, Avatar, Dropdown } from 'antd';
import { MenuOutlined, UserOutlined, LoginOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';

interface HeaderProps {
  isVisible?: boolean;
}

export default function Header({ isVisible = true }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 模拟登录状态
  const [username] = useState('张三'); // 模拟用户名
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 响应式检测
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 检查登录状态
  const checkLoginStatus = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  };

  // 导航菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      label: '首页',
      onClick: () => {
        router.push('/');
        setDrawerOpen(false);
      },
    },
    {
      key: '/about',
      label: '关于我们',
      onClick: () => {
        router.push('/about');
        setDrawerOpen(false);
      },
    },
    {
      key: '/services',
      label: '服务项目',
      onClick: () => {
        router.push('/services');
        setDrawerOpen(false);
      },
    },
    {
      key: '/contact',
      label: '联系方式',
      onClick: () => {
        router.push('/contact');
        setDrawerOpen(false);
      },
    },
    ...(checkLoginStatus() ? [
      {
        type: 'divider' as const,
      },
      {
        key: '/dashboard',
        label: '🎯 仪表盘',
        onClick: () => {
          router.push('/dashboard');
          setDrawerOpen(false);
        },
      },
      {
        key: '/profile',
        label: '👤 个人资料',
        onClick: () => {
          router.push('/profile');
          setDrawerOpen(false);
        },
      },
    ] : []),
  ];

  // 同步登录状态
  useEffect(() => {
    const syncLoginStatus = () => {
      setIsLoggedIn(checkLoginStatus());
    };
    
    syncLoginStatus();
    
    // 监听 storage 变化（用于跨标签页同步）
    window.addEventListener('storage', syncLoginStatus);
    // 自定义事件（用于同一页面内同步）
    window.addEventListener('loginStatusChanged', syncLoginStatus);
    
    return () => {
      window.removeEventListener('storage', syncLoginStatus);
      window.removeEventListener('loginStatusChanged', syncLoginStatus);
    };
  }, []);

  // 跳转到登录页
  const handleLogin = () => {
    router.push('/login');
  };
  
  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    // 触发自定义事件通知状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
    router.push('/');
  };

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      label: '仪表盘',
      onClick: () => router.push('/dashboard'),
    },
    {
      key: 'profile',
      label: '个人资料',
      onClick: () => router.push('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      {/* Header 固定在顶部 */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '45px',
          background: 'black',
          display: isVisible ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 1000,
        }}
      >
        {/* 左侧 - 菜单按钮 */}
        <Button
          type="text"
          icon={<MenuOutlined style={{ fontSize: '20px', color: 'white' }} />}
          onClick={() => setDrawerOpen(true)}
          style={{ border: 'none' }}
        />

        {/* 中间 - Logo/标题（可选） */}
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          🐠
        </div>

        {/* 右侧 - 用户信息/登录按钮 */}
        <div>
          {isLoggedIn ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                {!isMobile && (
                  <span style={{ color: 'white' }}>
                    {username}
                  </span>
                )}
              </div>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={handleLogin}
            >
              登录
            </Button>
          )}
        </div>
      </header>

      {/* 导航抽屉 - 适配电脑端和手机端 */}
      <Drawer
        title="导航菜单"
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{
          body: {
            padding: 0,
          },
          wrapper: {
            width: isMobile ? '75%' : '300px',
          },
        }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[pathname]}
          items={menuItems}
          style={{ border: 'none' }}
        />
      </Drawer>
    </>
  );
}

