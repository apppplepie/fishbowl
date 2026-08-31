'use client';

import React from 'react';
import { Button, Card } from '@/app/components/ui';
import { Avatar } from '@/app/components/ui/compat';
import { User, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import '../styles/user-menu.css';

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
  const router = useRouter();

  const handleLogin = () => {
    onLogin();
    onClose?.();
  };

  const handleLogout = () => {
    onLogout();
    onClose?.();
  };

  const handleUsernameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发 NavigationDrawer 中的弹窗
    if (isLoggedIn) {
      router.push('/profile');
      onClose?.();
    }
  };

  return (
    <Card
      className="user-menu-card"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        minWidth: isMobile ? 'auto' : '280px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
      }}
      bodyStyle={{
        padding: isMobile ? '20px 16px' : '16px 20px',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* 用户头像 */}
        <div className="user-avatar-container" style={{
          position: 'relative',
          flexShrink: 0,
        }}>
          <Avatar
            size={isMobile ? 48 : 48}
            icon={<User size={20} />}
            style={{
              backgroundColor: isLoggedIn ? '#1677ff' : '#666',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          />
          {isLoggedIn && (
            <div className="online-indicator" style={{
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
        <div className="user-info-section" style={{
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
            <div 
              className="username-text" 
              onClick={handleUsernameClick}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '2px',
                cursor: isLoggedIn ? 'pointer' : 'default',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (isLoggedIn) {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                if (isLoggedIn) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
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
          {!isLoggedIn && (
            <Button
              type="primary"
              icon={<LogIn size={18} />}
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
    </Card>
  );
}

