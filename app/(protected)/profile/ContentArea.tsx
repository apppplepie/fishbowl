import React from 'react';
import { Tab, User, Notification } from '../types';
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

interface ContentAreaProps {
  activeTab: Tab | null;
  onTabChange: (tab: Tab | null) => void;
  user: User;
  notification: Notification;
}

interface SectionConfig {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  summary: string;
  content: React.ReactNode;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ activeTab, onTabChange, user, notification }) => {
  const toggleTab = (tab: Tab) => {
    if (activeTab === tab) {
      onTabChange(null);
    } else {
      onTabChange(tab);
    }
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
      summary: '1 条新消息',
      content: <NotificationsContent notification={notification} />
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

