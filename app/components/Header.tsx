'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Button, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { useResponsive } from '@/app/hooks/useResponsive';
import {
  HomeOutlined,
  PictureOutlined,
  FileTextOutlined,
  BookOutlined,
  UserOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import LoginModal from './LoginModal';
import '../styles/navigation.css';
// import NavigationDrawer from './NavigationDrawer'; // 保留但不使用，以后扩展

interface HeaderProps {
  isVisible?: boolean;
  leftContent?: React.ReactNode; // 左侧自定义内容（可选）
}

/**
 * Header 组件
 * 职责：顶部栏布局容器，集成导航菜单和用户信息
 * - 左侧：可自定义内容插槽
 * - 中间：导航菜单（响应式：桌面端显示文字+图标，移动端只显示图标）
 * - 右侧：用户信息（已登录显示用户名，未登录显示登录按钮）
 */
export default function Header({ isVisible = true, leftContent }: HeaderProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const { isLoggedIn, username, logout, login } = useAuth();
  const { isMobile } = useResponsive();
  const pathname = usePathname();
  const router = useRouter();

  // 监听窗口大小变化
  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    updateWindowWidth(); // 初始化
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, []);

  // 图标映射
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'HomeOutlined': return <HomeOutlined />;
      case 'PictureOutlined': return <PictureOutlined />;
      case 'FileTextOutlined': return <FileTextOutlined />;
      case 'BookOutlined': return <BookOutlined />;
      default: return null;
    }
  };

  // 登录成功处理
  const handleLoginSuccess = (user: string) => {
    login(user);
    setLoginModalOpen(false);
  };

  // 退出登录处理
  const handleLogout = () => {
    logout();
  };

  // 构建菜单项 - 响应式显示（桌面端显示文字+图标，移动端只显示图标）
  const buildMenuItems = (): MenuProps['items'] => {
    // 根据屏幕宽度决定是否显示文字（桌面端显示文字，移动端只显示图标）
    const showText = !isMobile && windowWidth > 568;

    // 公共菜单项
    const publicItems = publicNavigationItems.map(item => ({
      key: item.path,
      label: showText ? (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: pathname === item.path ? 600 : 500,
        }}>
          {item.icon && getIcon(item.icon)}
          <span>{item.label}</span>
        </span>
      ) : (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {item.icon && getIcon(item.icon)}
        </span>
      ),
      title: !showText ? item.label : undefined, // 仅图标模式下显示tooltip
      onClick: () => {
        router.push(item.path);
      },
    }));

    // 如果未登录，只返回公共菜单
    if (!isLoggedIn) {
      return publicItems;
    }

    // 已登录，添加受保护的菜单项
    const protectedItems = protectedNavigationItems.map(item => ({
      key: item.path,
      label: showText ? (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: pathname === item.path ? 600 : 500,
        }}>
          {item.icon && getIcon(item.icon)}
          <span>{item.label}</span>
        </span>
      ) : (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {item.icon && getIcon(item.icon)}
        </span>
      ),
      title: !showText ? item.label : undefined,
      onClick: () => {
        router.push(item.path);
      },
    }));

    // 如果没有受保护菜单项，直接返回公共菜单
    if (protectedItems.length === 0) {
      return publicItems;
    }

    return [
      ...publicItems,
      ...protectedItems,
    ];
  };

  return (
    <>
      {/* Header容器 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: isVisible ? '45px' : '0',
          display: isVisible ? 'block' : 'none',
          zIndex: 10000,
          pointerEvents: 'none',
          transition: 'height 0.3s ease',
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
            padding: isMobile ? '0 12px' : '0 24px',
            zIndex: 10001,
            pointerEvents: 'auto',
            width: '100%',
          }}
        >
          {/* 左侧 - 自定义内容 */}
          {leftContent && (
            <div style={{ flexShrink: 0 }}>
              {leftContent}
            </div>
          )}

          {/* 中间 - 导航菜单（绝对定位，始终居中） */}
          <div style={{ 
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            pointerEvents: 'auto',
            width: 'auto',
            maxWidth: 'calc(100% - 200px)', // 确保左右两侧有足够空间
          }}>
            <Menu
              mode="horizontal"
              selectedKeys={[pathname]}
              items={buildMenuItems()}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'white',
                fontSize: isMobile ? '14px' : '15px',
                fontWeight: 500,
                lineHeight: '45px',
              }}
              theme="dark"
              className="header-nav-menu"
            />
          </div>

          {/* 右侧 - 用户信息（绝对定位，始终居右） */}
          <div style={{ 
            position: 'absolute',
            right: isMobile ? '12px' : '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            {isLoggedIn ? (
              // 已登录 - 显示用户名，点击跳转到个人资料页
              <Tooltip title="个人资料">
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: isMobile ? '14px' : '15px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => {
                    router.push('/profile');
                  }}
                >
                  <UserOutlined style={{ fontSize: '16px' }} />
                  {!isMobile && <span>{username}</span>}
                </span>
              </Tooltip>
            ) : (
              // 未登录 - 显示登录按钮
              <Tooltip title="登录">
                <Button
                  type="text"
                  icon={<LoginOutlined />}
                  onClick={() => setLoginModalOpen(true)}
                  style={{
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '4px 8px' : '4px 12px',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {!isMobile && <span>登录</span>}
                </Button>
              </Tooltip>
            )}
          </div>
        </header>

        {/* 导航抽屉 - 保留但不使用，以后扩展 */}
        {/* <NavigationDrawer
          open={false}
          onClose={() => {}}
          isLoggedIn={isLoggedIn}
          username={username}
          onLogin={() => setLoginModalOpen(true)}
          onLogout={handleLogout}
        /> */}
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

