import React from 'react';
import { Tab, User } from '../types';
import { FakeGlassCard } from '@/app/components/ui';
import { theme } from '@/app/config/theme';
import {
  ShieldCheck,
  Key,
  User as UserIcon,
  Bell,
  ChevronDown
} from 'lucide-react';
import { ProfileContent } from './sections/ProfileContent';
import { NotificationsContent } from './sections/NotificationsContent';
import { PermissionsContent } from './sections/PermissionsContent';
import { SecurityContent } from './sections/SecurityContent';
import '@/app/styles/profile.css';

// Profile 页面统一黑色文字样式
const profileTextStyle = { color: '#000000' } as const;

interface ContentAreaProps {
  activeTab: Tab | null;
  onTabChange: (tab: Tab | null) => void;
  user: User;
  notificationCount: number;
  onNotificationRead?: () => void;
}

interface SectionConfig {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  summary: string;
  content: React.ReactNode;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ activeTab, onTabChange, user, notificationCount, onNotificationRead }) => {
  const toggleTab = (tab: Tab) => {
    if (activeTab === tab) {
      onTabChange(null);
    } else {
      onTabChange(tab);
    }
  };

  const getNotificationSummary = () => {
    if (notificationCount === 0) {
      return '暂无新消息';
    }
    return `${notificationCount} 条新消息`;
  };

  const sections: SectionConfig[] = [
    {
      id: Tab.PROFILE,
      label: '个人资料',
      icon: UserIcon,
      summary: `@${user.handle}`,
      content: <ProfileContent user={user} />
    },
    {
      id: Tab.NOTIFICATIONS,
      label: '通知',
      icon: Bell,
      summary: getNotificationSummary(),
      content: <NotificationsContent onNotificationRead={onNotificationRead} />
    },
    {
      id: Tab.PERMISSIONS,
      label: '权限',
      icon: ShieldCheck,
      summary: user.role,
      content: <PermissionsContent user={user} />
    },
    {
      id: Tab.SECURITY,
      label: '安全',
      icon: Key,
      summary: '高',
      content: <SecurityContent />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {sections.map((section) => {
        const isProfile = section.id === Tab.PROFILE;
        const isNotifications = section.id === Tab.NOTIFICATIONS;
        const isOpen = activeTab === section.id;
        // 通知部分：没有消息时不可展开，隐藏展开按钮
        const isNotificationsEmpty = isNotifications && notificationCount === 0;
        const shouldHideExpandButton = isProfile || isNotificationsEmpty;
        const shouldDisableClick = isProfile || isNotificationsEmpty;
        
        return (
          <FakeGlassCard 
            key={section.id} 
            className={`
              profile-glass-effect
              overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
              ${isProfile ? 'md:col-span-2' : 'col-span-1'}
              ${!isProfile && isOpen ? 'ring-1 ring-white/60 shadow-lg' : ''}
              ${!isProfile && !isNotificationsEmpty ? 'hover:bg-white/60' : ''}
            `}
          >
            {/* Header */}
            <button
              onClick={() => !shouldDisableClick && toggleTab(section.id)}
              className={`
                w-full flex items-center justify-between p-6 focus:outline-none
                ${shouldDisableClick ? 'cursor-default pointer-events-none' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-4">
                <div
                  className="p-3 rounded-xl transition-colors duration-300"
                  style={{
                    backgroundColor: isOpen && !isProfile ? theme.colors.black : theme.background.whiteOverlayLight,
                    color: isOpen && !isProfile ? theme.colors.white : '#000000'
                  }}
                >
                  <section.icon size={20} />
                </div>
                <div className="text-left">
                  <span
                    className="block text-lg font-medium transition-colors"
                    style={{ ...profileTextStyle, color: '#000000' }}
                  >
                    {section.label}
                  </span>
                  {!isOpen && !isProfile && (
                    <span
                      className="block text-xs font-light animate-fade-in md:hidden"
                      style={{ ...profileTextStyle, color: '#000000' }}
                    >
                      {section.summary}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron: Only show on Mobile non-profile items, and hide when notifications are empty */}
              {!shouldHideExpandButton && (
                <ChevronDown
                  className="transition-transform duration-500 md:hidden"
                  style={{
                    color: isOpen ? '#000000' : '#000000',
                  }}
                  size={20}
                />
              )}
            </button>

            {/* Content Container */}
            <div 
              className={`
                px-6 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
                ${isProfile ? 'max-h-[1200px] opacity-100 pb-8' : (isOpen && !isNotificationsEmpty ? 'max-h-[800px] opacity-100 pb-8' : 'max-h-0 opacity-0')}
                ${isNotificationsEmpty ? 'md:max-h-0 md:opacity-0' : 'md:max-h-none md:opacity-100 md:pb-8 md:block'}
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

