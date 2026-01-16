'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Menu, Button, message } from 'antd';
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
  SunOutlined,
} from '@ant-design/icons';
import { publicNavigationItems, protectedNavigationItems } from '@/app/config/navigation';
import { theme } from '@/app/config/theme';
import LoginModal from './LoginModal';
import '../styles/navigation.css';

interface HeaderProps {
  isVisible?: boolean;
  leftContent?: React.ReactNode;
  embedded?: boolean;
}

function Header({ isVisible = true, leftContent, embedded = false }: HeaderProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { isLoggedIn, username, logout } = useAuth();
  const { isMobile } = useResponsive();
  const pathname = usePathname();
  const router = useRouter();

  // guard：避免某些"重逻辑"被重复初始化（视项目有无需要）
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    // initHeavyIfAny();
  }, []);

  // 标记组件已挂载，避免 hydration 不匹配
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // resize listener - 只在客户端挂载后更新，避免 hydration 不匹配
  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') return;
    
    const updateWindowWidth = () => setWindowWidth(window.innerWidth);
    // 立即更新窗口宽度（此时组件已挂载）
    updateWindowWidth();
    
    window.addEventListener('resize', updateWindowWidth);
    return () => {
      window.removeEventListener('resize', updateWindowWidth);
    };
  }, []);

  // login prompt listener
  useEffect(() => {
    let timeoutId: number | null = null;
    const handleLoginPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      message.warning(customEvent?.detail?.message || '登录已过期，请重新登录', 4);
      timeoutId = window.setTimeout(() => {
        setLoginModalOpen(true);
        timeoutId = null;
      }, 500);
    };
    window.addEventListener('showLoginPrompt', handleLoginPrompt);
    return () => {
      window.removeEventListener('showLoginPrompt', handleLoginPrompt);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // stable icon getter (no change)
  const getIcon = useCallback((iconName?: string) => {
    switch (iconName) {
      case 'HomeOutlined': return <HomeOutlined />;
      case 'PictureOutlined': return <PictureOutlined />;
      case 'FileTextOutlined': return <FileTextOutlined />;
      case 'BookOutlined': return <BookOutlined />;
      case 'SunOutlined': return <SunOutlined />;
      default: return null;
    }
  }, []);

  // ---------- CRITICAL FIXES ----------
  // 1) 把 selectedKeys memoize，避免每次传入新数组字面量
  const selectedKeys = useMemo(() => [pathname], [pathname]);

  // 2) 将路由跳转集中到 Menu 的 onClick（避免为每个 item 创建新的 onClick closure）
  const handleMenuClick = useCallback((info: { key: string }) => {
    const key = info?.key;
    if (key && key !== pathname) {
      router.push(key);
    }
  }, [router, pathname]);

  // 3) 生成 menuItems：只创建 label（因 pathname 会影响字体粗细，此处允许依赖 pathname）
  const menuItems = useMemo((): MenuProps['items'] => {
    // 使用稳定的判断逻辑，避免 hydration 不匹配
    // 在服务端和客户端首次渲染时，windowWidth 是 null，所以默认为 true（显示文本）
    // 只有在客户端挂载并获取到实际窗口宽度后才使用真实判断
    const effectiveWidth = windowWidth ?? 1024;
    const showText = !isMobile && effectiveWidth > 568;

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
  }, [isMobile, windowWidth, isMounted, pathname, isLoggedIn, getIcon]);

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
  }), []);

  // right area style memo
  const rightStyle = useMemo(() => ({
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  }), []);

  // handler for login modal
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // logout
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // profile nav
  const goProfile = useCallback(() => {
    if (pathname !== '/profile') router.push('/profile');
  }, [router, pathname]);

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
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
                onClick={goProfile}
              >
                <UserOutlined style={{ fontSize: 16 }} />
                {!isMobile && <span>{username}</span>}
              </span>
            ) : (
              <Button
                type="text"
                icon={<LoginOutlined />}
                onClick={openLoginModal}
                style={{
                  color: '#ffffff',
                  border: 'none',
                  padding: isMobile ? '4px 8px' : '4px 12px',
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

      <LoginModal
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
