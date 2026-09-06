'use client';

// GlassLoginModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, User, Mail, ArrowRight, Compass, LogIn, UserPlus, BookOpen, Book, KeyRound, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { message } from '@/app/components/ui';
import './GlassLoginModal.css';

type TabType = 'guest' | 'login' | 'register';

export interface GlassLoginModalProps {
  /** 与 LoginModal 一致：是否打开 */
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onLoginSuccess?: (username: string) => void;
  defaultOpen?: boolean;
}

interface GlassLoginContentProps {
  onClose?: () => void;
  onLoginSubmit?: (username: string, password: string) => Promise<void>;
  onRegisterSubmit?: (username: string, email: string, password: string) => Promise<void>;
  loginLoading?: boolean;
  registerLoading?: boolean;
}

const tabOrder: TabType[] = ['guest', 'login', 'register'];

const TAB_META: Record<TabType, { label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; title: string; sub: string }> = {
  guest: { label: '随便逛逛', icon: Compass, title: '随便逛逛', sub: '不登录也能看，先挑一个阅读模式。' },
  login: { label: '登录', icon: LogIn, title: '欢迎回来', sub: '登录后可以发布、收藏和留言。' },
  register: { label: '注册', icon: UserPlus, title: '新建账号', sub: '取个名字，就可以开始写了。' },
};

/* 抽到外部，避免每次输入导致重渲染时组件引用变化、输入框被打断 */
const Field: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  type: string;
  placeholder: string;
  label: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ icon: Icon, type, placeholder, label, autoComplete, value, onChange }) => (
  <label className="glogin-field">
    <Icon size={18} strokeWidth={2} />
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={label}
      autoComplete={autoComplete}
    />
  </label>
);

/* ---------- GlassLogin 内容 ---------- */
const GlassLoginContent: React.FC<GlassLoginContentProps> = ({
  onClose,
  onLoginSubmit,
  onRegisterSubmit,
  loginLoading = false,
  registerLoading = false,
}) => {
  const { filterMode, updateFilterMode } = useAccessFilter();
  const [activeTab, setActiveTab] = useState<TabType>('guest');
  const [prevTab, setPrevTab] = useState<TabType>('guest');
  const [isLearningMode, setIsLearningMode] = useState(filterMode === 'study');

  // 与全局过滤模式同步（例如从个人设置页切回弹窗时）
  useEffect(() => {
    setIsLearningMode(filterMode === 'study');
  }, [filterMode]);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleTabChange = (tab: TabType) => {
    if (activeTab === tab) return;
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const direction = tabOrder.indexOf(activeTab) > tabOrder.indexOf(prevTab) ? 1 : -1;
  const activeIndex = tabOrder.indexOf(activeTab);
  const meta = TAB_META[activeTab];
  const loading = activeTab === 'login' ? loginLoading : activeTab === 'register' ? registerLoading : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'guest') {
      onClose?.();
      return;
    }
    if (activeTab === 'login') {
      onLoginSubmit?.(formData.username, formData.password);
      return;
    }
    onRegisterSubmit?.(formData.username, formData.email, formData.password);
  };

  const submitLabel = activeTab === 'guest' ? '开始浏览' : activeTab === 'login' ? '登录' : '创建账号';

  return (
    <div className="glogin-panel" role="dialog" aria-modal="true" aria-label={meta.title}>
      <button onClick={onClose} aria-label="关闭" className="glogin-close" type="button">
        <X size={16} strokeWidth={2.5} />
      </button>

      <div className="glogin-head">
        <h2 className="glogin-title">{meta.title}</h2>
        <p className="glogin-sub">{meta.sub}</p>
      </div>

      <div className="glogin-tabs" role="tablist">
        <div
          className="glogin-tab-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden="true"
        />
        {tabOrder.map((tab) => {
          const Icon = TAB_META[tab].icon;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-active={isActive}
              onClick={() => handleTabChange(tab)}
              className="glogin-tab"
            >
              <Icon size={15} strokeWidth={2.2} />
              <span>{TAB_META[tab].label}</span>
            </button>
          );
        })}
      </div>

      <form className="glogin-body" onSubmit={handleSubmit}>
        <div className="glogin-pane" key={activeTab} data-dir={direction}>
          {activeTab === 'guest' && (
            <>
              <button
                type="button"
                className="glogin-mode"
                data-study={isLearningMode}
                aria-pressed={isLearningMode}
                onClick={() => {
                  const next = !isLearningMode;
                  setIsLearningMode(next);
                  updateFilterMode(next ? 'study' : 'loose');
                }}
              >
                <span className="glogin-mode-icon">
                  {isLearningMode
                    ? <BookOpen size={22} strokeWidth={1.8} />
                    : <Book size={22} strokeWidth={1.8} />}
                </span>
                <span className="glogin-mode-text">
                  <span className="glogin-mode-title">
                    {isLearningMode ? '学习模式' : '自由模式'}
                  </span>
                  <span className="glogin-mode-desc">
                    {isLearningMode
                      ? '只显示公开、适合专注阅读的内容。'
                      : '显示全部对访客开放的内容。'}
                  </span>
                </span>
              </button>
              <p className="glogin-hint">点一下卡片可以切换，随时能在设置里改。</p>
            </>
          )}

          {activeTab === 'login' && (
            <>
              <Field
                icon={User}
                type="text"
                label="用户名"
                placeholder="用户名"
                autoComplete="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              />
              <Field
                icon={KeyRound}
                type="password"
                label="密码"
                placeholder="密码"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </>
          )}

          {activeTab === 'register' && (
            <>
              <Field
                icon={User}
                type="text"
                label="用户名"
                placeholder="用户名"
                autoComplete="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              />
              <Field
                icon={Mail}
                type="email"
                label="邮箱"
                placeholder="邮箱"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Field
                icon={KeyRound}
                type="password"
                label="密码"
                placeholder="密码"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </>
          )}

          <button type="submit" className="glogin-submit" disabled={loading}>
            <span className="glogin-submit-inner">
              {loading ? (
                <Loader2 size={18} strokeWidth={2.5} className="glogin-spin" />
              ) : (
                <>
                  <span>{submitLabel}</span>
                  <ArrowRight size={17} strokeWidth={2.5} />
                </>
              )}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

/* ---------- Modal wrapper + export ---------- */
export default function GlassLoginModal({
  open: openProp,
  isOpen: isOpenProp,
  onClose,
  onLoginSuccess,
  defaultOpen,
}: GlassLoginModalProps) {
  const controlledOpen = openProp ?? isOpenProp;
  const [internalOpen, setInternalOpen] = useState<boolean>(!!defaultOpen || !!controlledOpen);
  const [rendered, setRendered] = useState<boolean>(!!defaultOpen || !!controlledOpen);
  const [closing, setClosing] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLoginSubmit = useCallback(
    async (username: string, password: string) => {
      if (!username.trim() || !password) {
        message.error('请输入用户名和密码');
        return;
      }
      setLoginLoading(true);
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          message.success('登录成功！');
          await login(data.user);
          onLoginSuccess?.(data.user?.display_name || data.user?.username || username);
          onClose?.();
          router.replace('/');
        } else {
          message.error(data.error || '登录失败，请检查用户名和密码');
        }
      } catch (error) {
        console.error('登录错误:', error);
        message.error('登录失败，请稍后重试');
      } finally {
        setLoginLoading(false);
      }
    },
    [login, onClose, onLoginSuccess, router]
  );

  const handleRegisterSubmit = useCallback(
    async (username: string, email: string, password: string) => {
      const u = username?.trim() || '';
      if (!u || !email?.trim() || !password) {
        message.error('请填写用户名、邮箱和密码');
        return;
      }
      setRegisterLoading(true);
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: u, email: email.trim(), password }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          message.success('注册成功！');
          if (data.user) await login(data.user);
          onLoginSuccess?.(data.user?.display_name || data.user?.username || u);
          onClose?.();
          router.replace('/');
        } else {
          message.error(data.error || '注册失败，请稍后重试');
        }
      } catch (error) {
        console.error('注册错误:', error);
        message.error('注册失败，请稍后重试');
      } finally {
        setRegisterLoading(false);
      }
    },
    [login, onClose, onLoginSuccess, router]
  );

  // sync with controlled prop if provided
  useEffect(() => {
    if (typeof controlledOpen === 'boolean') {
      setInternalOpen(controlledOpen);
    }
  }, [controlledOpen]);

  // 关闭时先播完退出动画再卸载（motion 那层是空壳，退场只能自己做）
  useEffect(() => {
    if (internalOpen) {
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
  }, [internalOpen, rendered]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        else setInternalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 弹窗打开时锁住页面滚动
  useEffect(() => {
    if (!rendered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [rendered]);

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  // Header 的 sticky 包装层在页顶时 opacity 为 0，弹窗必须挂到 body 才不会被一起吃掉
  // SSR 时没有 document，直接不渲染；open 初始为 false，不会有 hydration 差异
  if (!rendered || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`glogin-overlay${closing ? ' glogin-closing' : ''}`}>
      <div className="glogin-scrim" onClick={handleClose} />
      <GlassLoginContent
        onClose={handleClose}
        onLoginSubmit={handleLoginSubmit}
        onRegisterSubmit={handleRegisterSubmit}
        loginLoading={loginLoading}
        registerLoading={registerLoading}
      />
    </div>,
    document.body
  );
}
