'use client';

// GlassLoginModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from '@/app/components/ui/motion';
import {
  X, User, Lock, Mail, ArrowRight, Gamepad2, LogIn, UserPlus, BookOpen, Book, KeyRound, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { message } from '@/app/components/ui';

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

/* 抽到外部，避免每次输入导致重渲染时组件引用变化、输入框被打断 */
const BigInput: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  iconColor: string;
}> = ({ icon: Icon, type, placeholder, value, onChange, iconColor }) => (
  <div className="relative group w-full">
    <div className="relative flex items-center bg-black/40 border-2 border-white/10 rounded-xl p-2 transition-all duration-300 group-focus-within:border-white/50 group-focus-within:bg-black/60">
      <div className={`p-2.5 rounded-lg mr-2 transition-colors duration-300 bg-white/5 group-focus-within:bg-white/10 ${iconColor}`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent text-white text-lg font-medium placeholder-white/20 outline-none h-10 tracking-wide"
        placeholder={placeholder}
      />
    </div>
  </div>
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

  const getTheme = () => {
    if (activeTab === 'guest') {
      return isLearningMode
        ? { name: 'green', bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/50', shadow: 'shadow-green-500/50', gradient: 'from-green-400 to-emerald-600' }
        : { name: 'blue', bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500/50', shadow: 'shadow-blue-500/50', gradient: 'from-blue-400 to-indigo-600' };
    }
    if (activeTab === 'login') {
      return { name: 'yellow', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/50', shadow: 'shadow-amber-500/50', gradient: 'from-amber-400 to-orange-600' };
    }
    return { name: 'pink', bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/50', shadow: 'shadow-pink-500/50', gradient: 'from-pink-400 to-rose-600' };
  };

  const theme = getTheme();

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98,
    }),
  };

  const TabButton: React.FC<{ tab: TabType; icon: any; activeColor: string; baseColor: string }> = ({ tab, icon: Icon, activeColor, baseColor }) => {
    const isActive = activeTab === tab;
    const dynamicColor = tab === 'guest' ? (isLearningMode ? 'text-green-400' : 'text-blue-400') : activeColor;

    return (
      <button
        onClick={() => handleTabChange(tab)}
        className="relative group flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl transition-colors duration-300 bg-transparent hover:bg-white/5"
      >
        <div className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-60 group-hover:opacity-100'}`}>
          <Icon size={isActive ? 28 : 24} className={`${isActive ? dynamicColor : 'text-white/70'}`} strokeWidth={isActive ? 2.5 : 1.8} />
        </div>
      </button>
    );
  };

  const ActionButton: React.FC<{ onClick?: () => void; loading?: boolean; disabled?: boolean }> = ({ onClick, loading, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full group relative overflow-hidden rounded-xl p-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r ${theme.gradient} shadow-md ${theme.shadow} disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100`}
    >
      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      <div className="relative flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-lg py-3">
        {loading ? (
          <Loader2 size={24} className="text-white drop-shadow-md animate-spin" strokeWidth={3} />
        ) : (
          <ArrowRight size={24} className="text-white drop-shadow-md group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
        )}
      </div>
    </button>
  );

  return (
    <div className="relative w-full max-w-[820px] overflow-hidden rounded-xl bg-[#0f0f12] border border-white/10 shadow-xl">
      <div className="relative z-10 flex flex-col items-center p-5 md:p-6">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white transition-colors"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <div className="flex items-center justify-center gap-3 md:gap-6 mb-6 mt-2">
          <TabButton tab="guest" icon={Gamepad2} activeColor="text-blue-400" baseColor="shadow-blue-500/50" />
          <TabButton tab="login" icon={LogIn} activeColor="text-amber-400" baseColor="shadow-amber-500/50" />
          <TabButton tab="register" icon={UserPlus} activeColor="text-pink-400" baseColor="shadow-pink-500/50" />
        </div>

        <div className="w-full relative min-h-[320px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {activeTab === 'guest' && (
              <motion.div
                key="guest"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="w-full h-full flex flex-col justify-center items-center max-w-lg mx-auto"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const next = !isLearningMode;
                    setIsLearningMode(next);
                    updateFilterMode(next ? 'study' : 'loose');
                  }}
                  className={`mb-6 p-4 rounded-full border-2 transition-all duration-400 ${isLearningMode ? 'bg-green-500/14 border-green-400' : 'bg-blue-500/12 border-blue-400'}`}
                >
                  {isLearningMode ? (
                    <BookOpen size={40} className="text-green-400" strokeWidth={1.5} />
                  ) : (
                    <Book size={40} className="text-blue-400" strokeWidth={1.5} />
                  )}
                </motion.button>

                <div className="w-full max-w-xs">
                  <ActionButton onClick={onClose} />
                </div>
              </motion.div>
            )}

            {activeTab === 'login' && (
              <motion.div
                key="login"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="w-full h-full flex flex-col justify-center max-w-lg mx-auto"
              >
                <div className="w-full space-y-5 mt-2">
                  <BigInput
                    icon={User}
                    type="text"
                    placeholder="Username..."
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    iconColor={theme.text}
                  />

                  <BigInput
                    icon={KeyRound}
                    type="password"
                    placeholder="Password..."
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    iconColor={theme.text}
                  />

                  <div className="pt-4">
                    <ActionButton
                      loading={loginLoading}
                      onClick={() => onLoginSubmit?.(formData.username, formData.password)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'register' && (
              <motion.div
                key="register"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="w-full h-full flex flex-col justify-center max-w-lg mx-auto"
              >
                <div className="w-full space-y-4">
                  <BigInput
                    icon={User}
                    type="text"
                    placeholder="Username..."
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    iconColor={theme.text}
                  />
                  <BigInput
                    icon={Mail}
                    type="email"
                    placeholder="Email..."
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    iconColor={theme.text}
                  />
                  <BigInput
                    icon={Lock}
                    type="password"
                    placeholder="Password..."
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    iconColor={theme.text}
                  />

                  <div className="pt-2">
                    <ActionButton
                      loading={registerLoading}
                      onClick={() => onRegisterSubmit?.(formData.username, formData.email, formData.password)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
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

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  return (
    <AnimatePresence>
      {internalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black"
          />

          {/* Modal content */}
          <motion.div
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-3xl mx-auto"
          >
            <GlassLoginContent
              onClose={handleClose}
              onLoginSubmit={handleLoginSubmit}
              onRegisterSubmit={handleRegisterSubmit}
              loginLoading={loginLoading}
              registerLoading={registerLoading}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
