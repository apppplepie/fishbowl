import React from 'react';
import { theme } from '@/app/config/theme';
import { Key, Clock, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import '@/app/styles/profile.css';

export const SecurityContent: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await logout();
    }
  };

  return (
    <div className="space-y-3 pt-4 h-full flex flex-col">
      <button
        className="w-full p-4 rounded-2xl flex items-center justify-between transition-colors group hover:opacity-90"
        style={{
          backgroundColor: theme.background.whiteOverlayLight,
          border: `1px solid ${theme.border.light}`,
        }}
      >
        <div className="flex items-center gap-3">
          <Key size={18} style={{ color: '#000000' }} className="group-hover:opacity-80" />
          <div className="text-left">
            <span className="block text-sm font-medium" style={{ color: '#000000' }}>密码</span>
            <span className="block text-[10px] uppercase tracking-wide" style={{ color: '#000000' }}>最后修改于90天前</span>
          </div>
        </div>
        <ArrowRight size={16} style={{ color: '#000000' }} />
      </button>

      <button
        className="w-full p-4 rounded-2xl flex items-center justify-between transition-colors group hover:opacity-90"
        style={{
          backgroundColor: theme.background.whiteOverlayLight,
          border: `1px solid ${theme.border.light}`,
        }}
      >
        <div className="flex items-center gap-3">
          <Clock size={18} style={{ color: '#000000' }} className="group-hover:opacity-80" />
          <div className="text-left">
            <span className="block text-sm font-medium" style={{ color: '#000000' }}>活跃会话</span>
            <span className="block text-[10px] uppercase tracking-wide" style={{ color: '#000000' }}>2 台设备</span>
          </div>
        </div>
        <ArrowRight size={16} style={{ color: '#000000' }} />
      </button>

      {/* 退出登录按钮 */}
      <div className="pt-4 mt-4 border-t" style={{ borderColor: theme.border.light }}>
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl flex items-center justify-center gap-3 transition-colors group hover:opacity-90"
          style={{
            backgroundColor: theme.background.whiteOverlayLight,
            border: `1px solid ${theme.colors.error}40`,
          }}
        >
          <LogOut size={18} style={{ color: theme.colors.error }} className="group-hover:opacity-80 profile-error-button" />
          <span className="text-sm font-medium profile-error-button" style={{ color: theme.colors.error }}>退出登录</span>
        </button>
      </div>
    </div>
  );
};

