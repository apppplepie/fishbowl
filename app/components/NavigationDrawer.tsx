'use client';

import React from 'react';
import { Drawer, Menu, Avatar, Button } from 'antd';
import { UserOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';

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

  // 构建菜单项
  const buildMenuItems = (): MenuProps['items'] => {
    // 公共菜单项
    const publicItems = publicNavigationItems.map(item => ({
      key: item.path,
      label: item.icon ? `${item.icon} ${item.label}` : item.label,
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
      label: item.icon ? `${item.icon} ${item.label}` : item.label,
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
          padding: isMobile ? '20px 16px' : '16px 24px',
          background: 'black',
        },
        wrapper: {
          position: 'absolute',
          top: '45px',
          pointerEvents: 'auto',
          height: isMobile ? undefined : 'fit-content',
        },
        header: {
          display: 'none',
        },
        mask: {
          position: 'absolute',
          top: '45px',
          height: 'calc(100vh - 45px)',
          pointerEvents: 'auto',
        },
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '24px' : '40px',
        alignItems: isMobile ? 'stretch' : 'center',
      }}>
        {/* 个人面板 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: isMobile ? '16px' : '12px 24px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          minWidth: isMobile ? 'auto' : '200px',
        }}>
          <Avatar 
            size={isMobile ? 64 : 56} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: isLoggedIn ? '#1677ff' : '#666' }} 
          />
          <span style={{ 
            color: 'white', 
            fontSize: isMobile ? '16px' : '14px',
            fontWeight: 500,
          }}>
            {isLoggedIn ? username : '访客'}
          </span>
          {isLoggedIn ? (
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={() => {
                onLogout();
                onClose();
              }}
              style={{ width: '100%' }}
            >
              退出登录
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => {
                onLogin();
                onClose();
              }}
              style={{ width: '100%' }}
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
            }}
            theme="dark"
          />
        </div>
      </div>
    </Drawer>
  );
}

