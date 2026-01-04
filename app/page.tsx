'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import PermissionSystemDemo from './components/PermissionSystemDemo';
import { theme } from './config/theme';

const { Title, Paragraph } = Typography;

export default function Home() {
  const [showNavBar, setShowNavBar] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);
  const navBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 滚动到指定位置
  const scrollToPosition = (position: number) => {
    const container = scrollContainerRef.current;
    if (!container || typeof window === 'undefined') return;

    isAutoScrolling.current = true;
    container.scrollTo({
      top: position,
      behavior: 'smooth',
    });

    // 延迟0.5s后更新导航栏状态
    const threshold = window.innerHeight * 0.8;
    const shouldShow = position >= threshold;
    
    // 清除之前的定时器
    if (navBarTimerRef.current) {
      clearTimeout(navBarTimerRef.current);
      navBarTimerRef.current = null;
    }
    
    // 延迟0.5s后更新状态
    navBarTimerRef.current = setTimeout(() => {
      setShowNavBar(shouldShow);
      navBarTimerRef.current = null;
    }, 500);

    // 减少完成时间，让响应更快
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 150);
  };

  // 滑动吸附逻辑和滚动位置检测
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof window === 'undefined') return;

    const getSnapPoint = () => window.innerHeight * 0.8; // 80vh
    let scrollEndTimer: NodeJS.Timeout | null = null;
    let lastScrollTop = container.scrollTop;
    let lastScrollTime = Date.now();
    let isScrolling = false;
    let rafId: number | null = null;

    // 更新导航栏显示状态（带延迟）
    const updateNavBar = () => {
      const y = container.scrollTop;
      const threshold = getSnapPoint();
      const shouldShow = y >= threshold;
      
      // 清除之前的定时器
      if (navBarTimerRef.current) {
        clearTimeout(navBarTimerRef.current);
        navBarTimerRef.current = null;
      }
      
      // 延迟0.5s后更新状态
      navBarTimerRef.current = setTimeout(() => {
        setShowNavBar(shouldShow);
        navBarTimerRef.current = null;
      }, 500);
    };

    const snapTo = (target: number) => {
      isAutoScrolling.current = true;
      container.scrollTo({
        top: target,
        behavior: 'smooth',
      });

      // 在滚动结束后更新导航位置
      setTimeout(() => {
        isAutoScrolling.current = false;
        updateNavBar(); // 确保状态同步
      }, 30);
    };

    // 检查是否需要吸附
    const checkSnap = () => {
      if (isAutoScrolling.current) return;

      const y = container.scrollTop;
      const SNAP_POINT = getSnapPoint();
    
      // [表情] 已经进入 par2 内容区 → 完全放行
      if (y >= SNAP_POINT) return;
    
      // [表情] 仍在 par1 区域，决定回去还是进 par2
      const target = y < SNAP_POINT * 0.4 ? 0 : SNAP_POINT;
    
      if (Math.abs(y - target) < 5) {
        if (Math.abs(y - target) > 1) {
          snapTo(target);
        }
        return;
      }

      const scrollSpeed = Math.abs(y - lastScrollTop);
      if (scrollSpeed < 1 && !isScrolling) {
        snapTo(target);
      }
    };

    const onScroll = () => {
      updateNavBar();

      if (isAutoScrolling.current) return;

      const currentScrollTop = container.scrollTop;
      const currentTime = Date.now();
      
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);
      
      if (scrollDelta > 0) {
        isScrolling = true;
        lastScrollTop = currentScrollTop;
        lastScrollTime = currentTime;
      }

      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        checkSnap();
      });

      if (scrollEndTimer) clearTimeout(scrollEndTimer);

      scrollEndTimer = setTimeout(() => {
        isScrolling = false;
        checkSnap();
      },30);
    };

    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = () => {
      setTimeout(() => {
        checkSnap();
      }, 30);
    };

    updateNavBar();

    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    const handleResize = () => {
      updateNavBar();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
      if (rafId) cancelAnimationFrame(rafId);
      if (navBarTimerRef.current) {
        clearTimeout(navBarTimerRef.current);
        navBarTimerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div
        ref={scrollContainerRef}
        style={{
          height: '100vh',
          overflowY: 'scroll',
        }}
      >
        {/* 第一部分 - 首屏 */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            height: '80vh',
            background: 'transparent',
          }}
        >
          <div className="text-center text-white px-8">
            <Title level={1} className="!text-white mb-6" style={{ fontSize: '3.5rem' }}>
              Fishbowl
            </Title>
            <Paragraph className="!text-white text-xl mb-8 max-w-2xl">
              没开发完，先这样吧
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<DownOutlined />}
              className="animate-bounce"
              style={{
                height: '50px',
                fontSize: '18px',
                borderRadius: '25px',
                padding: '0 32px'
              }}
              onClick={() => scrollToPosition(window.innerHeight * 0.8)}
            >
              探索更多
            </Button>
          </div>
        </div>

        {/* 第二部分 - 内容展示 */}
        <div
          className="flex flex-col items-center"
          style={{
            background: 'transparent',
            minHeight: '100vh',
            borderLeft: `6px solid ${theme.colors.black}`,
            borderRight: `6px solid ${theme.colors.black}`,
            borderBottom: `6px solid ${theme.colors.black}`,
            boxSizing: 'border-box',
            padding: 0
          }}
        >
          {/* 45px导航栏区域 */}
          <div
            style={{
              height: '45px',
              width: 'calc(100% + 12px)',
              marginLeft: '-6px',
              marginRight: '-6px',
              background: showNavBar ? 'transparent' : theme.colors.black,
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              transition: 'background-color 0.3s ease',
              overflow: 'hidden',
            }}
          >
            {showNavBar && (
              <Header embedded={true} />
            )}
          </div>
          
          {/* 盒模型1：7vh高的透明顶部区域 */}
          <div
            style={{
              height: '7vh',
              background: 'transparent',
              width: '100%',
              flexShrink: 0,
              flexGrow: 0,
            }}
          >
          </div>

          {/* 盒模型2：主要内容区域 */}
          <div
            className="text-center text-white"
            style={{
              flex: 1,
              width: '100%',
              padding: '40px 24px',
              background: theme.gradients.secondary,
              boxSizing: 'border-box',
            }}
          >
          <Title level={2} className="!text-white mb-6">
            权限系统
          </Title>
          <Paragraph className="!text-white text-lg mb-6">
            体验渐进式内容浏览
          </Paragraph>

          <div className="max-w-5xl mx-auto">
            <PermissionSystemDemo />
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Button
              type="primary"
              size="large"
              onClick={() => router.push('/archive')}
              style={{
                height: '50px',
                fontSize: '16px',
                borderRadius: '25px',
                padding: '0 40px',
                background: theme.gradients.primary,
                border: 'none',
              }}
            >
              进入文章归档
            </Button>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
