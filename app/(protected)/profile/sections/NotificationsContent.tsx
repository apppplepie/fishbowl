import React from 'react';
import { Notification } from '../../types';
import { theme } from '@/app/config/theme';
import { Sparkles } from 'lucide-react';

interface NotificationsContentProps {
  notification: Notification;
}

export const NotificationsContent: React.FC<NotificationsContentProps> = ({ notification }) => {
  return (
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
  );
};

