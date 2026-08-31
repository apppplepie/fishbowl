'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Menu } from '@/app/components/ui/compat';
import { Modal } from '@/app/components/ui';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from '@/app/components/ui/compat';
import {
  HomeOutlined,
  PictureOutlined,
  FileTextOutlined,
  EditOutlined,
  FormOutlined,
  LoginOutlined,
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@/app/components/ui/icons';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import UserMenu from './UserMenu';
import GlassLoginModal from './GlassLoginModal';
import { IoFishOutline } from '@/app/components/ui/icons';
import '../styles/navigation.css';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  username?: string;
  onLogin: () => void;
  onLogout: () => void;
}

/**
 * 导航抽屉组件
 * 负责显示侧边导航菜单和个人面板
 * 响应式：桌面端横向布局，手机端竖向布局
 * 从Header下方弹出，而非全屏
 */
function NavigationDrawer({
  open,
  onClose,
  isLoggedIn,
  username = '访客',
  onLogin,
  onLogout
}: NavigationDrawerProps) {
  const { isMobile } = useResponsive();
  const pathname = usePathname();
  const router = useRouter();
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 图标映射
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'HomeOutlined': return <HomeOutlined />;
      case 'PictureOutlined': return <PictureOutlined />;
      case 'FileTextOutlined': return <FileTextOutlined />;
      case 'EditOutlined': return <EditOutlined />;
      case 'FormOutlined': return <FormOutlined />;
      case 'BookOutlined': return <BookOutlined />;
      case 'UserOutlined': return <UserOutlined />;
      case 'IoFishOutline': return <IoFishOutline style={{ fontSize: 18 }} />;
      default: return null;
    }
  };

  // 监听窗口大小变化
  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    updateWindowWidth(); // 初始化
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, []);

  // 构建菜单项 - 支持响应式显示（图标+文字 或 仅图标）
  const buildMenuItems = (): MenuProps['items'] => {
    // 根据屏幕宽度决定是否显示文字（移动端显示文字，大屏幕显示文字，中等屏幕只显示图标）
    const showText = isMobile || windowWidth > 1200;

    // 公共菜单项
    const publicItems = publicNavigationItems.map(item => ({
      key: item.path,
      label: (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: showText ? '6px' : '0',
          fontWeight: pathname === item.path ? 600 : 500,
          justifyContent: 'center',
        }}>
          {item.icon && <span style={{
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>{getIcon(item.icon)}</span>}
          {showText && <span>{item.label}</span>}
        </span>
      ),
      title: showText ? undefined : item.label, // 仅图标模式下显示tooltip
      onClick: () => {
        router.push(item.path);
        onClose();
      },
    }));

    // 如果未登录，只返回公共菜单
    if (!isLoggedIn) {
      return publicItems;
    }

    // 已登录，添加分隔线和受保护的菜单项
    const protectedItems = protectedNavigationItems.map(item => ({
      key: item.path,
      label: (
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: showText ? '6px' : '0',
          fontWeight: pathname === item.path ? 600 : 500,
          justifyContent: 'center',
        }}>
          {item.icon && <span style={{
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>{getIcon(item.icon)}</span>}
          {showText && <span>{item.label}</span>}
        </span>
      ),
      title: showText ? undefined : item.label, // 仅图标模式下显示tooltip
      onClick: () => {
        router.push(item.path);
        onClose();
      },
    }));

    // 如果没有受保护菜单项，直接返回公共菜单
    if (protectedItems.length === 0) {
      return publicItems;
    }

    return [
      ...publicItems,
      // {
      //   type: 'divider' as const,
      // },
      ...protectedItems,
    ];
  };

  // 避免混用 padding 与 paddingTop 等导致的样式覆盖问题
  const bodyPaddingTop = windowWidth <= 768 ? '24px' : (isMobile ? '30px' : '0px');
  const bodyPaddingBottom = isMobile ? '30px' : '0px';
  const bodyPaddingHorizontal = isMobile ? '0px' : '24px';

  return (
    <Drawer
      title="导航菜单"
      placement="top"
      onClose={onClose}
      open={open}
      getContainer={false}
      mask={true}
      closable={false}
      maskClosable={true}
      styles={{
        body: {
          paddingTop: bodyPaddingTop,
          paddingBottom: bodyPaddingBottom,
          paddingLeft: bodyPaddingHorizontal,
          paddingRight: bodyPaddingHorizontal,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          minHeight: isMobile ? '60px' : '48px',
        },
        wrapper: {
          position: 'absolute',
          top: '44px',
          pointerEvents: 'auto',
          height: isMobile ? undefined : 'fit-content',
          width: '100vw',
        },
        header: {
          display: 'none',
        },
        mask: {
          position: 'absolute',
          top: '45px',
          height: 'calc(100vh - 45px)',
          pointerEvents: 'auto',
          backdropFilter: 'blur(4px)',
          background: 'rgba(0, 0, 0, 0.3)',
        },
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '16px' : '24px',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
      }}>
        {/* 用户信息区域 - 极简设计 */}
        <div className="user-info-embedded" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-start',
        }}>
          {isLoggedIn ? (
            /* 已登录 - 显示用户名，点击跳转到个人资料页 */
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '16px',
              }}
              onClick={() => {
                router.push('/profile');
                onClose();
              }}
            >
              <span style={{
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <UserOutlined />
              </span>
              <span>{username}</span>
            </span>
          ) : (
            /* 未登录 - 显示登录按钮，点击弹出登录窗口 */
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '15px',
              }}
              onClick={() => {
                setShowLoginModal(true);
                onClose();
              }}
            >
              <span style={{
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <LoginOutlined />
              </span>
              <span>登录</span>
            </span>
          )}
        </div>

        {/* 导航菜单 */}
        <div style={{ flex: 1 }}>
          <Menu
            mode={isMobile ? 'vertical' : 'horizontal'}
            selectedKeys={[pathname]}
            items={buildMenuItems()}
            style={{
              border: 'none',
              justifyContent: isMobile ? 'flex-start' : 'center',
              background: 'transparent',
              color: 'white',
              fontSize: '15px',
              fontWeight: 500,
              lineHeight: '1.2',
            }}
            theme="dark"
            className="custom-nav-menu"
          />
        </div>
      </div>

      {/* 用户菜单弹窗 */}
      <Modal
        open={showUserMenu}
        onCancel={() => setShowUserMenu(false)}
        footer={null}
        centered
        width={400}
        styles={{
          mask: {
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
          },
        }}
      >
        <div style={{ padding: '24px 0' }}>
          <UserMenu
            isLoggedIn={isLoggedIn}
            username={username}
            onLogin={() => {
              setShowUserMenu(false);
              setShowLoginModal(true);
            }}
            onLogout={() => {
              onLogout();
              setShowUserMenu(false);
              onClose();
            }}
            onClose={() => setShowUserMenu(false)}
          />
        </div>
      </Modal>

      {/* 登录弹窗 */}
      <GlassLoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(username) => {
          setShowLoginModal(false);
          onClose();
          onLogin();
        }}
      />
    </Drawer>
  );
}

export default React.memo(NavigationDrawer);
