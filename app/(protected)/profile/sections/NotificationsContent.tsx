'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/app/config/theme';
import { MessageCircle } from 'lucide-react';
import { apiGetJson, apiPatchJson } from '@/lib/apiClient';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import '@/app/styles/profile.css';

interface Notification {
  id: string;
  comment_id: string;
  article_id: string;
  article_title: string;
  commenter: {
    username: string;
    display_name: string | null;
    avatar_base64: string | null;
  };
  comment_content: string;
  is_reply: boolean;
  parent_comment_id: string | null;
  created_at: string;
}

interface NotificationsContentProps {
  onNotificationRead?: () => void;
}

export const NotificationsContent: React.FC<NotificationsContentProps> = ({ onNotificationRead }) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载通知列表
  useEffect(() => {
    setIsLoading(true);
    loadNotifications();

    // 当页面重新获得焦点时刷新通知列表（确保能看到最新消息）
    const handleFocus = () => {
      setIsLoading(true);
      loadNotifications();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 当通知数量从非空变为0时，触发小红点更新
  useEffect(() => {
    if (notifications.length === 0 && !isLoading) {
      // 延迟一点时间，确保API调用已经完成
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('notificationRead'));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [notifications.length, isLoading]);

  const loadNotifications = async () => {
    try {
      const result = await apiGetJson<{ success: boolean; notifications?: Notification[]; error?: string }>('/api/notifications');

      if (result.success && result.notifications) {
        setNotifications(result.notifications);
      } else {
        console.error('加载通知失败:', result.error);
        setNotifications([]);
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理通知点击：跳转到文章并标记为已读
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // 标记为已读
      await apiPatchJson(`/api/notifications/${notification.comment_id}/read`, {});
      
      // 从列表中移除（已读的通知不再显示）
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      
      // 通知父组件更新未读数量
      if (onNotificationRead) {
        onNotificationRead();
      }

      // 触发全局事件，通知 Header 立即更新通知数量
      window.dispatchEvent(new CustomEvent('notificationRead'));

      // 跳转到文章页面，定位到评论区域
      router.push(`/article/${notification.article_id}#comment-section`);
    } catch (error) {
      console.error('标记通知为已读失败:', error);
      // 即使标记失败也跳转
      router.push(`/article/${notification.article_id}#comment-section`);
    }
  };

  // 截取评论内容（最多50字）
  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  };

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="pt-4 h-full flex flex-col items-center justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--profile-surface-accent, #e6f7ff)', color: 'var(--profile-fg, #000000)' }}
        >
          <MessageCircle size={24} />
        </div>
        <div style={{ color: 'var(--profile-fg, #000000)', fontSize: '14px', textAlign: 'center' }}>
          {/* 加载中... */}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="pt-4 h-full flex flex-col items-center justify-center">
        <div style={{ color: 'var(--profile-fg, #000000)', fontSize: '14px', textAlign: 'center' }}>
          暂无未读通知
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className="w-full text-left"
            style={{
              backgroundColor: theme.background.whiteOverlayLight,
              border: `1px solid ${'var(--profile-border, #e6e6e6)'}`,
              borderRadius: '12px',
              padding: '16px',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--profile-surface-accent, #e6f7ff)';
              e.currentTarget.style.borderColor = theme.colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.background.whiteOverlayLight;
              e.currentTarget.style.borderColor = 'var(--profile-border, #e6e6e6)';
            }}
          >
            <div className="flex gap-4 items-start">
              {/* 头像 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: 'var(--profile-surface-accent, #e6f7ff)' }}
              >
                {notification.commenter.avatar_base64 ? (
                  <img
                    src={notification.commenter.avatar_base64}
                    alt={notification.commenter.display_name || notification.commenter.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div style={{ color: 'var(--profile-fg, #000000)', fontSize: '18px' }}>
                    {(notification.commenter.display_name || notification.commenter.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ color: 'var(--profile-fg, #000000)', fontSize: '14px' }}>
                    {notification.commenter.display_name || notification.commenter.username}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--profile-fg, #000000)' }}>
                    {notification.is_reply ? '回复了' : '评论了'}
                  </span>
                </div>
                
                <p
                  className="mb-2 text-sm leading-relaxed"
                  style={{
                    color: 'var(--profile-fg, #000000)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {truncateContent(notification.comment_content)}
                </p>

                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--profile-fg, #000000)' }}>
                  <span
                    className="truncate"
                    style={{ maxWidth: '200px' }}
                    title={notification.article_title}
                  >
                    {notification.article_title}
                  </span>
                  <span>•</span>
                  <span>{formatRelativeTime(notification.created_at)}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

