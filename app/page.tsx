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
          <div className="mt-3 text-center">
            <Alert
              message={
                getUserActualLevel() === 2 ? "学习模式功能正在开发中..." :
                getUserActualLevel() === 3 ? "已解锁会员专属内容" :
                getUserActualLevel() === 4 ? "已解锁成人内容访问权限" :
                getUserActualLevel() === 5 ? "拥有管理员权限" : "未知权限等级"
              }
              type={
                getUserActualLevel() === 2 ? "warning" :
                getUserActualLevel() === 3 ? "success" :
                getUserActualLevel() === 4 ? "info" : "success"
              }
              showIcon
              className="border-0 bg-white/10"
            />
          </div>
        </div>
      </div>

      {/* 权限等级选择器 */}
      <div className="text-center space-y-4">
        <h3 className="text-white font-medium text-lg">你可以在此页面体验各种权限</h3>
        <div className="bg-white/20 rounded-lg p-6 max-w-md mx-auto">
          <Segmented<string>
            size="large"
            options={ACCESS_LEVELS.map(level => ({
              label: (
                <div className="flex items-center gap-2 font-medium">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  {level.label}
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
          />
          <div className="mt-4 text-white/80 text-sm">
            {ACCESS_LEVELS.find(level => level.value === currentUserLevel)?.label === 'P' ? '游客可查看' :
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

      {/* 权限说明 */}
      <div className="bg-white/10 rounded-lg p-6 space-y-4">
        <h3 className="text-white font-medium text-lg">权限系统说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/90">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <UserOutlined /> 用户权限等级
            </h4>
            <ul className="space-y-1 text-sm">
              <li>• <strong>游客</strong>：可查看P、G级内容</li>
              <li>• <strong>注册用户</strong>：可查看P、G、M级内容</li>
              <li>• <strong>成人验证</strong>：可查看P、G、M、A级内容</li>
              <li>• <strong>管理员</strong>：可查看所有内容</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CrownOutlined /> 内容权限等级
            </h4>
            <ul className="space-y-1 text-sm">
              <li>• <strong>P (公开)</strong>：所有人可见的基础内容</li>
              <li>• <strong>G (一般)</strong>：含个人日常，方便学习模式筛选</li>
              <li>• <strong>M (会员)</strong>：注册用户专属内容</li>
              <li>• <strong>A (成人)</strong>：需要成人验证的内容</li>
              <li>• <strong>R (管理员)</strong>：仅管理员可见的机密内容</li>
            </ul>
          </div>
        </div>
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
  const router = useRouter();

  // 滚动到指定位置
  const scrollToPosition = (position: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isAutoScrolling.current = true;
    container.scrollTo({
      top: position,
      behavior: 'smooth',
    });

    // 立即更新导航栏状态
    const threshold = (window.innerHeight || 800) * 0.8;
    setShowNavBar(position >= threshold);

    // 给 smooth scroll 一个完成时间
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 100);
  };

  // 滑动吸附逻辑
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const SNAP_POINT = window.innerHeight * 0.8; // 80vh
    let scrollEndTimer: number | null = null;

    const snapTo = (target: number) => {
      isAutoScrolling.current = true;
      container.scrollTo({
        top: target,
        behavior: 'smooth',
      });

      // 在滚动开始时立即更新导航栏状态
      setShowNavBar(target >= SNAP_POINT);

      // 给 smooth scroll 一个"完成时间"
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 220);
    };

    const onScroll = () => {
      if (isAutoScrolling.current) return;

      if (scrollEndTimer) clearTimeout(scrollEndTimer);

      // 判断"用户停止滚动"
      scrollEndTimer = window.setTimeout(() => {
        const y = container.scrollTop;
      
        // 🚫 已经进入 par2 内容区 → 完全放行
        if (y >= SNAP_POINT) return;
      
        // 👇 仍在 par1 区域，决定回去还是进 par2
        const target = y < SNAP_POINT * 0.5 ? 0 : SNAP_POINT;
      
        if (Math.abs(y - target) < 2) return;
      
        snapTo(target);
      }, 160);
      
      
    };

    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
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
