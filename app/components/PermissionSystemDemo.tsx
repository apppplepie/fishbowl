'use client';

import { Button, Typography, Modal, message, Segmented, Card, Row, Col, Tag, Alert, Space, Divider } from 'antd';
import { LockOutlined, EyeOutlined, UserOutlined, CrownOutlined, MailOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { ACCESS_LEVELS } from '../types/block';
import { theme } from '../config/theme';
import PlaceholderDisplay from './blocks/PlaceholderDisplay';
import { useAuth } from '../hooks/useAuth';

const { Title, Paragraph } = Typography;

/**
 * 权限系统演示组件
 * 提取为独立组件，方便在不同页面嵌入
 */
export default function PermissionSystemDemo() {
  const { user, isLoggedIn } = useAuth();
  const [currentUserLevel, setCurrentUserLevel] = useState(2); // 模拟当前用户等级
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<string>('');

  // 模拟不同等级的内容
  const demoContent: Record<number, { title: string; content: string }> = {
    1: { title: "公开文章", content: "这是所有人都能看到的学习内容..." },
    2: { title: "个人日常", content: "这里分享一些生活琐事和个人感悟..." },
    3: { title: "会员专属", content: "会员用户才能看到的个人xp大作..." },
    4: { title: "成人内容", content: "需要通过成人内容验证才能访问..." },
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
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 space-y-8 text-left">
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
              backgroundColor: theme.background.whiteOverlayLight,
              padding: '8px',
              borderRadius: '12px'
            }}
            className="[&_.ant-segmented-item-selected]:h-12 md:[&_.ant-segmented-item-selected]:h-auto"
          />
          <div className="mt-4 text-white/80 text-sm leading-relaxed break-words text-center">
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
                          backgroundColor: theme.background.whiteOverlayLight,
                          border: `1px dashed ${theme.border.dashed}`,
                          color: theme.text.primaryDark
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
                <div className="flex items-center gap-2 text-gray-800">
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

