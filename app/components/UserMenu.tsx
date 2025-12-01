'use client';

import React from 'react';
import { Avatar, Button, Card } from 'antd';
import { UserOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import TimeRangeSelector from './TimeRangeSelector';

interface UserMenuProps {
  isLoggedIn: boolean;
  username: string;
  onLogin: () => void;
  onLogout: () => void;
  onClose?: () => void;
}

/**
 * 用户卡片组件
 * 以卡片形式展示用户信息和操作按钮
 * 响应式：移动端和桌面端样式略有不同
 */
export default function UserMenu({ 
  isLoggedIn, 
  username, 
  onLogin, 
  onLogout,
  onClose 
}: UserMenuProps) {
  const { isMobile } = useResponsive();

  const handleLogin = () => {
    onLogin();
    onClose?.();
  };

  const handleLogout = () => {
    onLogout();
    onClose?.();
  };

  return (
    <Card
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        minWidth: isMobile ? 'auto' : '280px',
      }}
      styles={{
        body: {
          padding: isMobile ? '20px 16px' : '16px 20px',
        },
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* 第一行：头像、用户信息和操作按钮 */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* 用户头像 */}
          <div style={{
            position: 'relative',
            flexShrink: 0,
          }}>
            <Avatar 
              size={isMobile ? 48 : 48} 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: isLoggedIn ? '#1677ff' : '#666',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }} 
            />
            {isLoggedIn && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '12px',
                height: '12px',
                background: '#52c41a',
                borderRadius: '50%',
                border: '2px solid black',
              }}></div>
            )}
          </div>

          {/* 用户信息和操作按钮 */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: isMobile ? '8px' : '16px',
          }}>
            {/* 用户名 */}
            <div style={{ 
              textAlign: 'left',
              flex: 1,
            }}>
              <div style={{ 
                color: 'white', 
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '2px',
              }}>
                {isLoggedIn ? username : '访客'}
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
              }}>
                {isLoggedIn ? '已登录' : '未登录'}
              </div>
            </div>

            {/* 操作按钮 */}
            {isLoggedIn ? (
              <Button
                type="default"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                size="middle"
                style={{ 
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {isMobile ? '退出' : '退出登录'}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={handleLogin}
                size="middle"
                style={{ 
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                登录
              </Button>
            )}
          </div>
        </div>

        {/* 第二行：时间范围选择器 */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '12px',
        }}>
          <TimeRangeSelector />
        </div>
      </div>
    </Card>
  );
}

