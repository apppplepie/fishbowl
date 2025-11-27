'use client';

import React from 'react';
import { Avatar, Dropdown, Button } from 'antd';
import { UserOutlined, LoginOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import { userMenuItems } from '@/app/config/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';

interface UserMenuProps {
  isLoggedIn: boolean;
  username: string;
  onLogin: () => void;
  onLogout: () => void;
}

/**
 * 用户菜单组件
 * 负责显示用户头像、下拉菜单或登录按钮
 * 响应式：移动端隐藏用户名
 */
export default function UserMenu({ isLoggedIn, username, onLogin, onLogout }: UserMenuProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  // 用户下拉菜单项
  const dropdownMenuItems: MenuProps['items'] = [
    ...userMenuItems.map(item => ({
      key: item.key,
      label: item.label,
      onClick: () => router.push(item.path),
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: '退出登录',
      danger: true,
      onClick: onLogout,
    },
  ];

  // 未登录状态 - 显示登录按钮
  if (!isLoggedIn) {
    return (
      <Button
        type="primary"
        icon={<LoginOutlined />}
        onClick={onLogin}
      >
        登录
      </Button>
    );
  }

  // 已登录状态 - 显示用户头像和下拉菜单
  return (
    <Dropdown menu={{ items: dropdownMenuItems }} placement="bottomRight">
      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
        {!isMobile && (
          <span style={{ color: 'white' }}>
            {username}
          </span>
        )}
      </div>
    </Dropdown>
  );
}

