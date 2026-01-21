'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '../types';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';
import { theme } from '@/app/config/theme';
import { ContentArea } from './ContentArea';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();
  const { user: authUser, isLoggedIn } = useAuth();

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

  // 如果未登录，显示错误提示
  if (!isLoggedIn || !authUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 style={{ color: theme.text.primary }}>请先登录</h2>
          <p style={{ color: theme.text.secondary }}>您需要登录才能查看个人资料</p>
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

  // 模拟通知数据（后续可以从API获取）
  const notification = {
    user: 'Sarah Kim',
    action: 'This is a beautiful piece of work!',
    context: 'Article: Digital Gardens',
    time: '2h ago',
  };

  return (
    <ContentArea
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      notification={notification}
    />
  );
}
