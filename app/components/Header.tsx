'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, message } from '@/app/components/ui';
import { Menu } from '@/app/components/ui/compat';
import type { MenuProps } from '@/app/components/ui/compat';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { IoFishOutline } from '@/app/components/ui/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import {
  HomeOutlined,
  PictureOutlined,
  FileTextOutlined,
  BookOutlined,
  UserOutlined,
  LoginOutlined,
} from '@/app/components/ui/icons';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import { theme } from '@/app/config/theme';
import GlassLoginModal from './GlassLoginModal';
import ProfileModal from './ProfileModal';
import { apiGetJson } from '@/lib/apiClient';
import '../styles/navigation.css';

interface HeaderProps {
  isVisible?: boolean;
  leftContent?: React.ReactNode;
  embedded?: boolean;
  /** 页面自报的高亮项；给书房那种「同一个路由、多个导航入口」的场景用 */
  activeNavKey?: string | null;
}

function Header({ isVisible = true, leftContent, embedded = false, activeNavKey = null }: HeaderProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { isLoggedIn, username, logout } = useAuth();
  const { isMobile, mounted } = useResponsive();
  const pathname = usePathname();
  const router = useRouter();

  // guard：避免某些"重逻辑"被重复初始化（视项目有无需要）
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    // initHeavyIfAny();
  }, []);

  // 统一的加载通知数量函数
  const loadNotificationCount = useCallback(async () => {
    try {
      const result = await apiGetJson<{ success: boolean; count?: number; error?: string }>('/api/notifications/count');
      if (result.success && result.count !== undefined) {
        setNotificationCount(result.count);
      }
    } catch (error) {
      console.error('获取通知数量失败:', error);
      setNotificationCount(0);
    }
  }, []);

  // login prompt listener - 只显示提示，不自动弹出登录框
  useEffect(() => {
    const handleLoginPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      message.warning(customEvent?.detail?.message || '登录已过期，请重新登录', 4);
      // 移除自动弹出登录框的逻辑，右上角会自动变为登出状态
    };

    // 处理通知已读事件，立即刷新通知数量
    const handleNotificationRead = () => {
      loadNotificationCount();
    };

    window.addEventListener('showLoginPrompt', handleLoginPrompt);
    window.addEventListener('notificationRead', handleNotificationRead);
    return () => {
      window.removeEventListener('showLoginPrompt', handleLoginPrompt);
      window.removeEventListener('notificationRead', handleNotificationRead);
    };
  }, [loadNotificationCount]);

  // 加载未读通知数量（优化版：使用轻量级端点，页面不可见时停止轮询）
  useEffect(() => {
    if (!isLoggedIn) {
      setNotificationCount(0);
      return;
    }

    let interval: NodeJS.Timeout | null = null;

    // 初始加载
    loadNotificationCount();

    // 页面可见性 API：只在页面可见时轮询
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面不可见，停止轮询
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        // 页面可见，立即刷新并开始轮询
        loadNotificationCount();
        if (!interval) {
          interval = setInterval(loadNotificationCount, 60000); // 每60秒刷新一次
        }
      }
    };

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 开始轮询（页面可见时）
    if (!document.hidden) {
      interval = setInterval(loadNotificationCount, 60000); // 每60秒刷新一次
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoggedIn, loadNotificationCount]);

  // stable icon getter (no change)
  const getIcon = useCallback((iconName?: string) => {
    switch (iconName) {
      case 'HomeOutlined': return <HomeOutlined />;
      case 'PictureOutlined': return <PictureOutlined />;
      case 'FileTextOutlined': return <FileTextOutlined />;
      case 'BookOutlined': return <BookOutlined />;
      case 'IoFishOutline': return <IoFishOutline style={{ fontSize: 20 }} />;
      default: return null;
    }
  }, []);

  // ---------- CRITICAL FIXES ----------
  // 1) 把 selectedKeys memoize，避免每次传入新数组字面量
  //    书房三项共用 /library，光看 pathname 分不出来，所以优先信页面报上来的 key
  const activeKey = activeNavKey ?? pathname;
  const selectedKeys = useMemo(() => [activeKey], [activeKey]);

  // 2) 将路由跳转集中到 Menu 的 onClick（避免为每个 item 创建新的 onClick closure）
  const handleMenuClick = useCallback((info: { key: string }) => {
    const key = info?.key;
    if (!key || key === activeKey) return;
    // 书房内部换视角是同一个页面，别让路由把滚动位置冲掉
    const isLibrary = key === '/library' || key.startsWith('/library?');
    router.push(key, { scroll: !isLibrary });
  }, [router, activeKey]);

  // 3) 生成 menuItems：只创建 label（因 pathname 会影响字体粗细，此处允许依赖 pathname）
  const menuItems = useMemo((): MenuProps['items'] => {
    // 移动端只显示图标，桌面端显示图标+文字
    // 使用 ResponsiveContext 的 isMobile 判断，确保服务端和客户端首次渲染一致
    const showText = !isMobile;

    const build = (itemsSource: Array<{ path: string; label: string; icon?: string }>) =>
      itemsSource.map(item => ({
        key: item.path,
        // label 会随 pathname 改变，但使用 useMemo 控制整体引用只有当 deps 变化时才改变
        label: showText ? (
          <span style={{
            display: 'flex',
            alignItems: 'center',
          }}>
            {item.icon && <span style={{ marginRight: '6px' }}>{getIcon(item.icon)}</span>}
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
        // NOTE: 不在这里给 onClick，统一由 Menu onClick 处理（减少函数创建）
      }));

    const publicItems = build(publicNavigationItems);
    if (!isLoggedIn) return publicItems;
    const protectedItems = build(protectedNavigationItems);
    if (protectedItems.length === 0) return publicItems;
    return [...publicItems, ...protectedItems];
  }, [isMobile, isLoggedIn, getIcon]);

  // memo style objects to avoid new object refs each render
  const containerStyle = useMemo(() => ({
    position: embedded ? ('static' as const) : ('fixed' as const),
    top: embedded ? 'auto' : 0,
    left: embedded ? 'auto' : 0,
    right: embedded ? 'auto' : 0,
    height: embedded ? '45px' : (isVisible ? '45px' : '0'),
    opacity: embedded ? 1 : (isVisible ? 1 : 0),
    visibility: embedded ? ('visible' as const) : (isVisible ? ('visible' as const) : ('hidden' as const)),
    zIndex: embedded ? 'auto' : 10000,
    pointerEvents: embedded ? ('auto' as const) : (isVisible ? ('auto' as const) : ('none' as const)),
    transition: embedded ? 'none' : 'height 0.3s ease, opacity 0.3s ease, visibility 0.3s ease',
    overflow: embedded ? ('visible' as const) : ('hidden' as const),
  }), [embedded, isVisible]);

  const headerStyle = useMemo(() => ({
    position: 'relative' as const,
    height: '45px',
    minHeight: '45px',
    background: '#000000',
    display: 'flex' as const,
    alignItems: 'center' as const,
    padding: isMobile ? '0 12px' : '0 24px',
    zIndex: 10001,
    pointerEvents: (isVisible ? 'auto' : 'none') as 'auto' | 'none',
    width: '100%',
  }), [isMobile, isVisible]);

  const centerStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto' as const,
    opacity: mounted ? 1 : 0.8,
    transition: 'opacity 0.2s ease-in-out',
  }), [mounted]);

  // right area style memo
  const rightStyle = useMemo(() => ({
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    opacity: mounted ? 1 : 0.8,
    transition: 'opacity 0.2s ease-in-out',
  }), [mounted]);

  // handler for login modal
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // logout
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // 个人设置：改成弹窗，不再跳 /profile（/profile 路由本身仍可直接访问）
  const openProfileModal = useCallback(() => setProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setProfileModalOpen(false), []);

  // ---------- JSX ----------
  return (
    <>
      <div style={containerStyle}>
        <header style={headerStyle}>
          {leftContent && <div style={{ flexShrink: 0 }}>{leftContent}</div>}

          <div style={centerStyle}>
            <Menu
              mode="horizontal"
              selectedKeys={selectedKeys}
              items={menuItems}
              onClick={handleMenuClick} // centralized handler
              style={{
                border: 'none',
                background: 'transparent',
                color: '#ffffff',
                fontSize: isMobile ? 14 : 15,
                fontWeight: 500,
                lineHeight: '45px',
              }}
              theme="dark"
              className="header-nav-menu"
            />
          </div>

          <div style={rightStyle}>
            {isLoggedIn ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: isMobile ? 14 : 15,
                  padding: '4px 8px',
                  borderRadius: 4,
                  transition: 'background-color 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
                onClick={openProfileModal}
              >
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <UserOutlined style={{ fontSize: 16 }} />
                  {notificationCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#ff4444',
                        border: '2px solid #000000',
                        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  )}
                </span>
                {!isMobile && <span>{username}</span>}
              </span>
            ) : (
              <Button
                type="text"
                icon={<LoginOutlined />}
                onClick={openLoginModal}
                onTouchEnd={() => {
                  // iOS：手指抬起时立即打开，避免被滚动容器“抢”掉 click
                  openLoginModal();
                }}
                style={{
                  color: '#ffffff',
                  border: 'none',
                  padding: isMobile ? '12px 16px' : '4px 12px',
                  minHeight: isMobile ? 44 : undefined,
                  minWidth: isMobile ? 44 : undefined,
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {!isMobile && <span>登录</span>}
              </Button>
            )}
          </div>
        </header>
      </div>

      <ProfileModal open={profileModalOpen} onClose={closeProfileModal} />

      <GlassLoginModal
        open={loginModalOpen}
        onClose={closeLoginModal}
        onLoginSuccess={() => {
          setLoginModalOpen(false);
        }}
      />
    </>
  );
}

export default React.memo(Header);
