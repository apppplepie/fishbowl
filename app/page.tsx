'use client';

import { Button, Typography, Modal, message, Segmented, Card, Row, Col, Tag, Alert, Space, Divider } from 'antd';
import { DownOutlined, LockOutlined, EyeOutlined, UserOutlined, CrownOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import { ACCESS_LEVELS } from './types/block';
import PlaceholderDisplay from './components/blocks/PlaceholderDisplay';
import { useAuth } from './hooks/useAuth';

const { Title, Paragraph } = Typography;

/**
 * 权限系统演示组件
 * 展示分级浏览系统的完整功能
 */
function PermissionSystemDemo() {
  const { user, isLoggedIn } = useAuth();
  const [currentUserLevel, setCurrentUserLevel] = useState(2); // 模拟当前用户等级
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<string>('');

  // 模拟不同等级的内容
  const demoContent: Record<number, { title: string; content: string }> = {
    1: { title: "公开文章", content: "这是所有人都能看到的学习内容..." },
    2: { title: "个人日常", content: "这里分享一些生活琐事和个人感悟..." },
    3: { title: "会员专属", content: "会员用户才能看到的个人xp大作..." },
    4: { title: "成人内容", content: "需要通过成人验证才能访问..." },
    5: { title: "管理员内容", content: "只有管理员才能查看的机密信息..." }
  };

  const handleLevelClick = (levelValue: number, levelLabel: string) => {
    if (levelValue > currentUserLevel) {
      setUpgradeTarget(levelLabel);
      setUpgradeModalVisible(true);
    }
  };

  // 获取用户的实际权限等级
  const getUserActualLevel = () => {
    if (!isLoggedIn || !user) return 2; // 游客默认2级
    if (!user.max_access_level) {
      // 根据用户角色设置默认等级
      switch (user.role) {
        case 'admin': return 5;
        case 'moderator': return 4;
        case 'user': return 3;
        default: return 2;
      }
    }
    return user.max_access_level;
  };

  const getUpgradeMessage = () => {
    switch (upgradeTarget) {
      case 'M':
        return '注册账号即可升级为会员用户，享受更多专属内容！';
      case 'A':
        return '需要通过成人内容验证。功能正在开发中，请联系管理员。';
      case 'R':
        return '管理员权限仅限内部人员使用。';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 space-y-8">
      {/* 当前用户等级指示器 */}
      <div className="text-center space-y-4">
        {/* 模拟权限选择器 */}
        <div className="inline-flex items-center gap-3 bg-white/20 rounded-full px-6 py-3">
          <UserOutlined className="text-white text-xl" />
          <span className="text-white font-medium">模拟权限等级</span>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: ACCESS_LEVELS.find(l => l.value === currentUserLevel)?.color }}
            />
            <span className="text-white font-bold">
              {ACCESS_LEVELS.find(l => l.value === currentUserLevel)?.label}
            </span>
          </div>
        </div>

        {/* 实际用户权限检测 */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-center gap-4 mb-3">
            <CrownOutlined className="text-white text-2xl" />
            <span className="text-white font-semibold text-lg">您的实际权限</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: ACCESS_LEVELS.find(l => l.value === getUserActualLevel())?.color }}
            />
            <span className="text-white font-bold text-xl">
              {ACCESS_LEVELS.find(l => l.value === getUserActualLevel())?.label}级
            </span>
            <span className="text-white/80 text-sm">
              ({isLoggedIn && user ? `${user.display_name || user.username}` : '游客'})
            </span>
          </div>
        </div>
      </div>

      {/* 权限等级选择器 */}
      <div className="text-center space-y-4">
        <h3 className="text-white font-medium text-lg">你可以在此页面体验各种权限</h3>
        <div className="bg-white/20 rounded-lg p-4 md:p-6 max-w-sm md:max-w-md mx-auto">
          <Segmented<string>
            size="large"
            options={ACCESS_LEVELS.map(level => ({
              label: (
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 font-medium py-1 md:py-0">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  <span className="text-xs md:text-sm">{level.label}</span>
                </div>
              ),
              value: level.label,
              disabled: false
            }))}
            value={ACCESS_LEVELS.find(level => level.value === currentUserLevel)?.label || 'G'}
            onChange={(value) => {
              const level = ACCESS_LEVELS.find(l => l.label === value);
              if (level) setCurrentUserLevel(level.value);
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '8px',
              borderRadius: '12px'
            }}
            className="[&_.ant-segmented-item-selected]:h-12 md:[&_.ant-segmented-item-selected]:h-auto"
          />
          <div className="mt-4 text-white/80 text-sm leading-relaxed break-words">
            {ACCESS_LEVELS.find(level => level.value === currentUserLevel)?.label === 'P' ? '游客可查看，学习模式（未开发）' :
             ACCESS_LEVELS.find(level => level.value === currentUserLevel)?.label === 'G' ? '游客可查看（含个人日常）' :
             ACCESS_LEVELS.find(level => level.value === currentUserLevel)?.label === 'M' ? '仅注册用户可查看' :
             ACCESS_LEVELS.find(level => level.value === currentUserLevel)?.label === 'A' ? '仅成人验证用户可查看' : '仅管理员可查看'}
          </div>
        </div>
      </div>

      {/* 内容预览区域 */}
      <div className="space-y-6">
        <h3 className="text-white font-medium text-lg text-center">内容浏览体验</h3>

        <Row gutter={[16, 16]}>
          {ACCESS_LEVELS.map(level => {
            const canAccess = level.value <= currentUserLevel;
            return (
              <Col xs={24} md={12} lg={8} key={level.value}>
                <Card
                  className={`h-full transition-all duration-300 ${
                    canAccess
                      ? 'bg-white/20 hover:bg-white/30 cursor-pointer border-white/30'
                      : 'bg-gray-100 hover:bg-gray-200 cursor-pointer border-gray-300'
                  }`}
                  onClick={() => handleLevelClick(level.value, level.label)}
                  style={{
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="space-y-3">
                    {/* 权限标签 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs shadow-md"
                          style={{
                            backgroundColor: level.color,
                            boxShadow: `0 2px 4px rgba(0,0,0,0.2)`
                          }}
                        >
                          {level.label}
                        </div>
                        <span className={`font-medium ${canAccess ? 'text-gray-800' : 'text-gray-600'}`}>
                          {level.label}级内容
                        </span>
                      </div>
                      {canAccess ? (
                        <EyeOutlined className="text-white" />
                      ) : (
                        <LockOutlined className="text-gray-500" />
                      )}
                    </div>

                    {/* 内容预览 */}
                    {canAccess ? (
                      <div>
                        <h4 className="text-gray-800 font-medium mb-2">
                          {demoContent[level.value].title}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {demoContent[level.value].content}
                        </p>
                        {/* 模拟block权限标签 */}
                        <div className="mt-3 flex justify-end">
                          <Tag
                            color={level.color}
                            style={{
                              color: 'white',
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {level.label}
                          </Tag>
                        </div>
                      </div>
                    ) : (
                      <PlaceholderDisplay
                        block={{
                          type: 'placeholder',
                          id: `demo-${level.value}`,
                          order: level.value,
                          original_type: 'text',
                          required_access_level: level.value,
                          user_access_level: currentUserLevel,
                          message: '权限不足'
                        }}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          border: '1px dashed rgba(255,255,255,0.3)',
                          color: 'rgba(255,255,255,0.8)'
                        }}
                      />
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* 升级提示弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CrownOutlined />
            权限升级提示
          </div>
        }
        open={upgradeModalVisible}
        onCancel={() => setUpgradeModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setUpgradeModalVisible(false)}>
            知道了
          </Button>,
          upgradeTarget === 'M' && (
            <Button key="upgrade" type="primary" onClick={() => message.success('跳转到注册页面...')}>
              立即注册
            </Button>
          ),
          (upgradeTarget === 'A' || upgradeTarget === 'R') && (
            <Button key="contact" type="primary" onClick={() => message.info('正在联系管理员...')}>
              联系管理员
            </Button>
          )
        ].filter(Boolean)}
        centered
      >
        <div className="py-4">
          <Alert
            message={`需要 ${upgradeTarget} 级权限`}
            description={getUpgradeMessage()}
            type="info"
            showIcon
            className="mb-4"
          />

          {upgradeTarget === 'M' && (
            <div className="text-center space-y-2">
              <p>注册账号后即可享受会员专属内容！</p>
              <div className="flex justify-center gap-4 text-sm text-gray-600">
                <span>XP大作</span>
                <span>评论功能</span>
              </div>
            </div>
          )}

          {(upgradeTarget === 'A' || upgradeTarget === 'R') && (
            <div className="text-center space-y-3">
              <p>此功能正在开发中，敬请期待！</p>
              <Divider>联系方式</Divider>
              <Space direction="vertical" size="small">
                <div className="flex items-center gap-2">
                  <MailOutlined />
                  <span>creepender42@outlook.com</span>
                </div>
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

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
      // 调整判定阈值，让吸附更敏感（从0.5改为0.4）
      const target = y < SNAP_POINT * 0.4 ? 0 : SNAP_POINT;
    
      // 如果距离目标点很近，直接吸附（阈值从2增加到5，让吸附更早触发）
      if (Math.abs(y - target) < 5) {
        if (Math.abs(y - target) > 1) {
          snapTo(target);
        }
        return;
      }

      // 如果滚动速度很慢或已停止，立即吸附
      const scrollSpeed = Math.abs(y - lastScrollTop);
      if (scrollSpeed < 1 && !isScrolling) {
        snapTo(target);
      }
    };

    const onScroll = () => {
      // 实时更新导航栏状态
      updateNavBar();

      if (isAutoScrolling.current) return;

      const currentScrollTop = container.scrollTop;
      const currentTime = Date.now();
      
      // 检测滚动速度
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);
      const timeDelta = currentTime - lastScrollTime;
      
      if (scrollDelta > 0) {
        isScrolling = true;
        lastScrollTop = currentScrollTop;
        lastScrollTime = currentTime;
      }

      // 使用 requestAnimationFrame 来更流畅地检测
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        // 在滚动过程中就开始检查是否需要吸附
        checkSnap();
      });

      // 清除之前的定时器
      if (scrollEndTimer) clearTimeout(scrollEndTimer);

      // 减少判定时间，从160ms减少到50ms，让响应更快
      scrollEndTimer = setTimeout(() => {
        isScrolling = false;
        checkSnap();
      },30);
    };

    // 触摸事件处理（移动端更早触发）
    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = () => {
      // 触摸结束后立即检查是否需要吸附
      setTimeout(() => {
        checkSnap();
      }, 30);
    };

    // 初始化导航栏状态
    updateNavBar();

    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    // 监听窗口大小变化，重新计算吸附点
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
          borderLeft: '6px solid black',
          borderRight: '6px solid black',
          borderBottom: '6px solid black',
          boxSizing: 'border-box',
          padding: 0
        }}
      >
        {/* 45px导航栏区域 */}
        <div
          style={{
            height: '45px',
            width: '100%',
            background: showNavBar ? 'transparent' : 'black',
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
          {/* 透明占位区域 - 可以添加内容 */}
        </div>

        {/* 盒模型2：内容区域 */}
        <div
        className="text-center text-white"
        style={{
          flex: 1,
          width: '100%',
          padding: '40px 24px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          boxSizing: 'border-box',
          }}>
          <Title level={2} className="!text-white mb-6">
            权限系统
          </Title>
          <Paragraph className="!text-white text-lg mb-6">
            体验渐进式内容浏览（纯属自己觉得自己写的丢人）
          </Paragraph>

          <PermissionSystemDemo />

          {/* 跳转到归档页面按钮 */}
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
