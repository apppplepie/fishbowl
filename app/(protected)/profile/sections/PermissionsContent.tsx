import React from 'react';
import { theme } from '@/app/config/theme';
import { Eye } from 'lucide-react';
import { Segmented } from '@/app/components/ui/compat';
import { useAccessFilter, FilterMode } from '@/app/hooks/useAccessFilter';
import '@/app/styles/profile.css';

interface PermissionsContentProps {
  user: { role?: string };
}

// 三种过滤模式配置
const FILTER_MODES: Array<{ value: FilterMode; label: string; description: string; icon: string }> = [
  {
    value: 'study', label: '学习模式', description: '只显示完全公开的文章',
    icon: ''
  },
  {
    value: 'strict', label: '严格模式', description: '只显示能完整阅读的文章',
    icon: ''
  },
  {
    value: 'loose', label: '宽松模式', description: '显示能看到部分内容的文章',
    icon: ''
  },
];

export const PermissionsContent: React.FC<PermissionsContentProps> = () => {
  const { filterMode, updateFilterMode } = useAccessFilter();

  // 处理过滤模式变化
  const handleFilterChange = (value: string) => {
    if (value === 'study' || value === 'strict' || value === 'loose') {
      updateFilterMode(value as FilterMode);
    }
  };

  return (
    <div className="space-y-6 pt-4 h-full flex flex-col justify-center">
      {/* <div
        className="p-6 rounded-2xl flex items-center justify-between"
        style={{
          backgroundColor: 'var(--profile-surface-warn, #fff7e6)',
          border: `1px solid ${theme.colors.warning}20`
        }}
      >
        <div>
          <h3 className="font-medium mb-1" style={{ color: 'var(--profile-fg, #000000)' }}>当前计划</h3>
          <p className="text-sm" style={{ color: 'var(--profile-fg, #000000)' }}>
            您是<span className="font-serif italic" style={{ color: 'var(--profile-fg, #000000)' }}>{user.role}</span>用户。
          </p>
        </div>
        <ShieldCheck size={24} style={{ color: 'var(--profile-fg, #000000)' }} />
      </div> */}

      {/* 文章权限过滤器 */}
      <div
        className="p-6 rounded-2xl"
        style={{
          backgroundColor: theme.background.whiteOverlayLight,
          border: `1px solid ${'var(--profile-border, #e6e6e6)'}`
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Eye size={20} style={{ color: 'var(--profile-fg, #000000)' }} />
          <h3 className="font-medium" style={{ color: 'var(--profile-fg, #000000)' }}>文章显示设置</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center">
            <Segmented<string>
              size="large"
              options={FILTER_MODES.map(mode => ({
                label: (
                  <div className="flex flex-col items-center gap-1 py-1 px-2">
                    <span className="text-lg">{mode.icon}</span>
                    <span className="text-xs font-medium">{mode.label}</span>
                  </div>
                ),
                value: mode.value,
                disabled: false
              }))}
              value={filterMode}
              onChange={handleFilterChange}
              style={{
                backgroundColor: 'var(--segmented-track-bg, rgba(0,0,0,.06))',
                padding: '8px',
                borderRadius: '12px'
              }}
            />
          </div>

          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--profile-fg-dim, #888)' }}>
              {FILTER_MODES.find(m => m.value === filterMode)?.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
