'use client';

import React, { useState, useEffect } from 'react';
import { Tab, User, Notification } from '../types';
import { FakeGlassCard } from '@/app/components/ui';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';
import { theme } from '@/app/config/theme';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Key,
  User as UserIcon,
  Bell,
  ChevronDown
} from 'lucide-react';

interface ContentAreaProps {
  activeTab: Tab | null;
  onTabChange: (tab: Tab | null) => void;
  user: User;
  notification: Notification;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ activeTab, onTabChange, user, notification }) => {
  
  const toggleTab = (tab: Tab) => {
    if (activeTab === tab) {
      onTabChange(null);
    } else {
      onTabChange(tab);
    }
  };

  const sections = [
    {
      id: Tab.PROFILE,
      label: '个人资料',
      icon: UserIcon,
      summary: `@${user.handle}`,
      content: (
        <div className="space-y-8 pt-4">
           {/* Profile Content */}
           <div className="flex flex-col items-center space-y-6">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-lg"
                  style={{
                    borderColor: theme.border.light,
                    backgroundColor: theme.background.whiteOverlayLight
                  }}
                >
                  {user.avatar_base64 ? (
                    <img
                      src={user.avatar_base64}
                      alt={`${user.name}的头像`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: theme.background.selected }}
                    >
                      <UserIcon size={48} style={{ color: theme.text.tertiary }} />
                    </div>
                  )}
                </div>
                {/* Avatar glow effect */}
                <div
                  className="absolute inset-0 rounded-full opacity-20 blur-xl -z-10"
                  style={{ backgroundColor: theme.colors.primary }}
                />
              </div>

              {/* User Info */}
              <div className="text-center">
                <h2 className="text-2xl font-serif" style={{ color: theme.text.primary }}>{user.name}</h2>
                <p className="text-sm uppercase tracking-wider mt-1" style={{ color: theme.text.tertiary }}>{user.role}</p>
              </div>
           </div>

           {/* 简介和邮箱 */}
           <div className="space-y-6 px-2">
              <div className="space-y-1">
                 <label className="text-xs uppercase tracking-wider block" style={{ color: theme.text.tertiary }}>简介</label>
                 <p className="font-light leading-relaxed" style={{ color: theme.text.secondary }}>
                   ？？？？？
                 </p>
              </div>
              <div className="space-y-1">
                 <label className="text-xs uppercase tracking-wider block" style={{ color: theme.text.tertiary }}>邮箱</label>
                 <p style={{ color: theme.text.primary }}>hello@{user.handle}.io</p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: Tab.NOTIFICATIONS,
      label: '通知',
      icon: Bell,
      summary: '1 条新消息',
      content: (
        <div className="pt-4 h-full flex flex-col">
             <div
               className="relative overflow-hidden rounded-2xl p-6 transition-all hover:opacity-80 flex-1"
               style={{
                 backgroundColor: theme.background.whiteOverlayLight,
                 border: `1px solid ${theme.border.light}`
               }}
             >
                <div className="flex gap-5 items-start">
                   <div
                     className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                     style={{ backgroundColor: theme.background.selected, color: theme.colors.primary }}
                   >
                      <Sparkles size={18} />
                   </div>
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium" style={{ color: theme.text.primary }}>{notification.user}</span>
                        <span className="text-xs" style={{ color: theme.text.tertiary }}>回复了</span>
                      </div>
                      <p className="font-serif italic mb-3 text-sm leading-relaxed" style={{ color: theme.text.secondary }}>
                        "{notification.action}"
                      </p>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                        <span>{notification.context}</span>
                        <span>• {notification.time}</span>
                      </div>
                   </div>
                </div>
             </div>
             <button
               className="w-full mt-4 text-xs text-center py-2 transition-colors hover:opacity-80"
               style={{ color: theme.text.tertiary }}
             >
               查看历史
             </button>
        </div>
      )
    },
    {
      id: Tab.PERMISSIONS,
      label: '权限',
      icon: ShieldCheck,
      summary: user.role,
      content: (
        <div className="space-y-6 pt-4 h-full flex flex-col justify-center">
            <div
              className="p-6 rounded-2xl flex items-center justify-between"
              style={{
                backgroundColor: theme.background.selectedWarning,
                border: `1px solid ${theme.colors.warning}20`
              }}
            >
              <div>
                 <h3 className="font-medium mb-1" style={{ color: theme.text.primary }}>当前计划</h3>
                 <p className="text-sm" style={{ color: theme.text.secondary }}>
                   您是<span className="font-serif italic" style={{ color: theme.colors.warning }}>{user.role}</span>用户。
                 </p>
              </div>
              <ShieldCheck size={24} style={{ color: theme.colors.warning + '80' }} />
            </div>

            <div
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: theme.gradients.dark,
                color: theme.text.primaryDark,
                boxShadow: theme.shadow.md
              }}
            >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg mb-1">培养者</h3>
                    <p className="text-xs font-light" style={{ color: theme.text.secondary }}>解锁私人圣地。</p>
                  </div>
                  <button
                    className="px-5 py-2 rounded-full text-xs font-medium transition-colors border hover:opacity-80"
                    style={{
                      backgroundColor: theme.background.whiteOverlayLight,
                      borderColor: theme.border.dashed,
                      color: theme.text.primary,
                    }}
                  >
                    升级
                  </button>
                </div>
            </div>
        </div>
      )
    },
    {
      id: Tab.SECURITY,
      label: '安全',
      icon: Key,
      summary: '高',
      content: (
         <div className="space-y-3 pt-4 h-full flex flex-col">
            <button
              className="w-full p-4 rounded-2xl flex items-center justify-between transition-colors group hover:opacity-90"
              style={{
                backgroundColor: theme.background.whiteOverlayLight,
                border: `1px solid ${theme.border.light}`,
              }}
            >
               <div className="flex items-center gap-3">
                  <Key size={18} style={{ color: theme.text.tertiary }} className="group-hover:opacity-80" />
                  <div className="text-left">
                     <span className="block text-sm font-medium" style={{ color: theme.text.primary }}>密码</span>
                     <span className="block text-[10px] uppercase tracking-wide" style={{ color: theme.text.tertiary }}>最后修改于90天前</span>
                  </div>
               </div>
               <ArrowRight size={16} style={{ color: theme.text.disabled }} />
            </button>

            <button
              className="w-full p-4 rounded-2xl flex items-center justify-between transition-colors group hover:opacity-90"
              style={{
                backgroundColor: theme.background.whiteOverlayLight,
                border: `1px solid ${theme.border.light}`,
              }}
            >
               <div className="flex items-center gap-3">
                  <Clock size={18} style={{ color: theme.text.tertiary }} className="group-hover:opacity-80" />
                  <div className="text-left">
                     <span className="block text-sm font-medium" style={{ color: theme.text.primary }}>活跃会话</span>
                     <span className="block text-[10px] uppercase tracking-wide" style={{ color: theme.text.tertiary }}>2 台设备</span>
                  </div>
               </div>
               <ArrowRight size={16} style={{ color: theme.text.disabled }} />
            </button>
         </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {sections.map((section) => {
        const isProfile = section.id === Tab.PROFILE;
        const isOpen = activeTab === section.id;
        
        return (
          <FakeGlassCard 
            key={section.id} 
            className={`
              overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
              ${isProfile ? 'md:col-span-2' : 'col-span-1'}
              ${!isProfile && isOpen ? 'ring-1 ring-white/60 shadow-lg' : ''}
              ${!isProfile ? 'hover:bg-white/60' : ''}
            `}
          >
            {/* Header */}
            <button
              onClick={() => toggleTab(section.id)}
              className={`
                w-full flex items-center justify-between p-6 focus:outline-none
                ${isProfile ? 'cursor-default pointer-events-none' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-4">
                <div
                  className="p-3 rounded-xl transition-colors duration-300"
                  style={{
                    backgroundColor: isOpen && !isProfile ? theme.colors.black : theme.background.whiteOverlayLight,
                    color: isOpen && !isProfile ? theme.colors.white : theme.text.tertiary
                  }}
                >
                  <section.icon size={20} />
                </div>
                <div className="text-left">
                  <span
                    className="block text-lg font-medium transition-colors"
                    style={{
                      color: isOpen && !isProfile ? theme.text.primary : theme.text.secondary
                    }}
                  >
                    {section.label}
                  </span>
                  {!isOpen && !isProfile && (
                    <span
                      className="block text-xs font-light animate-fade-in md:hidden"
                      style={{ color: theme.text.tertiary }}
                    >
                      {section.summary}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron: Only show on Mobile non-profile items */}
              {!isProfile && (
                <ChevronDown
                  className="transition-transform duration-500 md:hidden"
                  style={{
                    color: isOpen ? theme.text.primary : theme.text.disabled,
                  }}
                  size={20}
                />
              )}
            </button>

            {/* Content Container */}
            <div 
              className={`
                px-6 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
                ${isProfile ? 'max-h-[1200px] opacity-100 pb-8' : (isOpen ? 'max-h-[800px] opacity-100 pb-8' : 'max-h-0 opacity-0')}
                md:max-h-none md:opacity-100 md:pb-8 md:block
              `}
            >
              {section.content}
            </div>
          </FakeGlassCard>
        );
      })}
    </div>
  );
};

// 默认导出的页面组件
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();
  const { user: authUser, isLoggedIn } = useAuth();

  // 设置页面配置
  useEffect(() => {
    setConfig({
      box1Content: null, // box1 空着
      box2Style: { padding: isMobile ? '40px 12px' : '40px 24px' },
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig, isMobile]);

  // 如果未登录，显示错误或重定向
  if (!isLoggedIn || !authUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 style={{ color: theme.text.primary }}>请先登录</h2>
          <p style={{ color: theme.text.secondary }}>您需要登录才能查看个人资料</p>
        </div>
      </div>
    );
  }

  // 使用真实的认证用户数据
  const user: User = {
    name: authUser.display_name || authUser.username,
    handle: authUser.username,
    role: authUser.role,
    avatar_base64: authUser.avatar_base64,
  };

  // 模拟通知数据（后续可以从API获取）
  const notification: Notification = {
    user: 'Sarah Kim',
    action: 'This is a beautiful piece of work!',
    context: 'Article: Digital Gardens',
    time: '2h ago',
  };

  return (
    <ContentArea
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      notification={notification}
    />
  );
}
