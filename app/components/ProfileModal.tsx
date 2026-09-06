'use client';

// ProfileModal.tsx —— /profile 页的内容搬进弹窗，点 Header 用户名打开
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { apiGetJson } from '@/lib/apiClient';
import { Tab } from '@/app/(protected)/types';
import { ContentArea } from '@/app/(protected)/profile/ContentArea';
import './GlassLoginModal.css';
import './ProfileModal.css';

export interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user: authUser, isLoggedIn, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const loadNotificationCount = useCallback(async () => {
    try {
      const result = await apiGetJson<{ success: boolean; count?: number; error?: string }>(
        '/api/notifications/count'
      );
      if (result.success && result.count !== undefined) {
        setNotificationCount(result.count);
      }
    } catch (error) {
      console.error('获取通知数量失败:', error);
      setNotificationCount(0);
    }
  }, []);

  // 打开时才拉通知数量，避免弹窗没开也发请求
  useEffect(() => {
    if (open && isLoggedIn) {
      loadNotificationCount();
    }
  }, [open, isLoggedIn, loadNotificationCount]);

  // 有消息时自动展开通知（与原 /profile 页行为一致）
  useEffect(() => {
    if (notificationCount > 0) {
      setActiveTab((prev) => (prev !== Tab.NOTIFICATIONS ? Tab.NOTIFICATIONS : prev));
    } else {
      setActiveTab((prev) => (prev === Tab.NOTIFICATIONS ? null : prev));
    }
  }, [notificationCount]);

  // 关闭时先播完退出动画再卸载
  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const timer = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // 弹窗打开时锁住页面滚动
  useEffect(() => {
    if (!rendered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [rendered]);

  // SSR 时没有 document，直接不渲染；open 初始为 false，不会有 hydration 差异
  if (!rendered || typeof document === 'undefined' || !isLoggedIn || !authUser) return null;

  const user = {
    name: authUser.display_name || authUser.username,
    handle: authUser.username,
    role: authUser.role,
    avatar_base64: authUser.avatar_base64,
    email: authUser.email,
  };

  return createPortal(
    <div className={`gprofile-overlay${closing ? ' gprofile-closing' : ''}`}>
      <div className="gprofile-scrim" onClick={onClose} />

      <div className="gprofile-panel" role="dialog" aria-modal="true" aria-label="个人设置">
        <div className="gprofile-head">
          <span className="gprofile-avatar">
            <UserIcon size={22} strokeWidth={2} />
          </span>
          <div className="gprofile-titles">
            <h2 className="gprofile-name">{user.name}</h2>
            <p className="gprofile-handle">@{user.handle}</p>
          </div>
          <button type="button" className="gprofile-close" onClick={onClose} aria-label="关闭">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="gprofile-body">
          <ContentArea
            activeTab={activeTab}
            onTabChange={setActiveTab}
            user={user}
            notificationCount={notificationCount}
            onNotificationRead={loadNotificationCount}
          />
        </div>

        <div className="gprofile-footer">
          <button
            type="button"
            className="gprofile-logout"
            onClick={() => {
              logout();
              onClose();
            }}
          >
            <LogOut size={16} strokeWidth={2.2} />
            退出登录
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
