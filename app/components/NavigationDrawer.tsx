'use client';

import React from 'react';
import { Drawer, Menu } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
}

/**
 * 导航抽屉组件
 * 负责显示侧边导航菜单，根据登录状态动态调整菜单项
 * 响应式：移动端宽度 75%，桌面端固定 300px
 */
export default function NavigationDrawer({ open, onClose, isLoggedIn }: NavigationDrawerProps) {
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
      placement="left"
      onClose={onClose}
      open={open}
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
        items={buildMenuItems()}
        style={{ border: 'none' }}
      />
    </Drawer>
  );
}

