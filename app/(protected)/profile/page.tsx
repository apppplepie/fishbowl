'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '../types';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';
import { theme } from '@/app/config/theme';
import { ContentArea } from './ContentArea';
import { apiGetJson } from '@/lib/apiClient';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();
  const { user: authUser, isLoggedIn } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  // 设置页面配置
  useEffect(() => {
    setConfig({
      box1Content: null,
      box2Style: { padding: isMobile ? '40px 12px' : '40px 24px' },
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig, isMobile]);

  // 加载通知数量
  useEffect(() => {
    if (isLoggedIn) {
      loadNotificationCount();
    }
  }, [isLoggedIn]);

  // 有消息时自动展开通知
  useEffect(() => {
    if (notificationCount > 0) {
      setActiveTab(prev => prev !== Tab.NOTIFICATIONS ? Tab.NOTIFICATIONS : prev);
    } else {
      setActiveTab(prev => prev === Tab.NOTIFICATIONS ? null : prev);
    }
  }, [notificationCount]);

  const loadNotificationCount = async () => {
    try {
      // 使用轻量级的 count 端点，只返回数量
      const result = await apiGetJson<{ success: boolean; count?: number; error?: string }>('/api/notifications/count');
      if (result.success && result.count !== undefined) {
        setNotificationCount(result.count);
      }
    } catch (error) {
      console.error('获取通知数量失败:', error);
      setNotificationCount(0);
    }
  };

  // 如果未登录，显示错误提示
  if (!isLoggedIn || !authUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 style={{ color: '#000000' }}>请先登录</h2>
          <p style={{ color: '#000000' }}>您需要登录才能查看个人资料</p>
        </div>
      </div>
    );
  }

  // 转换认证用户数据为页面所需格式
  const user = {
    name: authUser.display_name || authUser.username,
    handle: authUser.username,
    role: authUser.role,
    avatar_base64: authUser.avatar_base64,
    email: authUser.email,
  };

  return (
    <ContentArea
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      notificationCount={notificationCount}
      onNotificationRead={loadNotificationCount}
    />
  );
}
