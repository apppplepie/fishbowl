import React from 'react';
import { User } from '../../types';
import { theme } from '@/app/config/theme';
import { User as UserIcon } from 'lucide-react';

interface ProfileContentProps {
  user: User;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({ user }) => {
  return (
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
          <p style={{ color: theme.text.primary }}>{user.email}</p>
        </div>
      </div>
    </div>
  );
};

