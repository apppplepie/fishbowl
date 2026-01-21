import React from 'react';
import { User } from '../../types';
import { theme } from '@/app/config/theme';
import { ShieldCheck } from 'lucide-react';

interface PermissionsContentProps {
  user: User;
}

export const PermissionsContent: React.FC<PermissionsContentProps> = ({ user }) => {
  return (
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
  );
};

