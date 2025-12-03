'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Menu, Button } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  PictureOutlined,
  FileTextOutlined,
  EditOutlined,
  FormOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
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
export default function NavigationDrawer({
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

  // 图标映射
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'HomeOutlined': return <HomeOutlined />;
      case 'PictureOutlined': return <PictureOutlined />;
      case 'FileTextOutlined': return <FileTextOutlined />;
      case 'EditOutlined': return <EditOutlined />;
      case 'FormOutlined': return <FormOutlined />;
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
    // 根据屏幕宽度决定是否显示文字（移动端或小屏幕只显示图标）
    const showText = !isMobile && windowWidth > 1200;

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

    return [
      ...publicItems,
      {
        type: 'divider' as const,
      },
      ...protectedItems,
    ];
  };

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
          padding: isMobile ? '10px 0px' : '0px 24px',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          minHeight: isMobile ? '60px' : '48px',
        },
        wrapper: {
          position: 'absolute',
          top: '45px',
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
        }}>
          {isLoggedIn ? (
            /* 已登录 - 只显示用户名，点击跳转到仪表盘 */
            <div
              className="username-text"
              style={{
                color: 'white',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                router.push('/dashboard');
                onClose();
              }}
            >
              {username}
            </div>
          ) : (
            /* 未登录 - 显示登录按钮 */
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => {
                onLogin();
                onClose();
              }}
              size="small"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                height: '24px',
                fontWeight: 500,
                borderRadius: '4px',
              }}
            >
              登录
            </Button>
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
    </Drawer>
  );
}

