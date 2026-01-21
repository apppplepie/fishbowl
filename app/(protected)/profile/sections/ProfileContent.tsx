import React from 'react';
import { User } from '../../types';
import { theme } from '@/app/config/theme';
import { User as UserIcon } from 'lucide-react';
import '@/app/styles/profile.css';

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
                <UserIcon size={48} style={{ color: '#000000' }} />
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
          <h2 className="text-2xl font-serif" style={{ color: '#000000' }}>{user.name}</h2>
          <p className="text-sm uppercase tracking-wider mt-1" style={{ color: '#000000' }}>{user.role}</p>
        </div>
      </div>
    </div>
  );
};

