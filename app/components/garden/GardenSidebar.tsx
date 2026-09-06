'use client';

import React from 'react';
import { Drawer } from '@/app/components/ui/compat';
import { useResponsive } from '@/app/hooks/useResponsive';
import Controls from './Controls';
import { PlantSettings, PlantType } from '../../types/garden';

// 复用书房侧边栏那套黑色主题变量，两边保持一个样
import '@/app/components/sidebar/sidebar.css';

interface GardenSidebarProps {
  settings: PlantSettings;
  updateSettings: (newSettings: Partial<PlantSettings>) => void;
  applyPreset: (type: PlantType) => void;
  onClear: () => void;
  visible?: boolean; // 移动端：抽屉是否可见
  onClose?: () => void; // 移动端：关闭抽屉
  expanded?: boolean; // 桌面端：侧边栏是否展开
}

const SIDEBAR_WIDTH = 320;

function GardenSidebar({
  settings,
  updateSettings,
  applyPreset,
  onClear,
  visible = false,
  onClose,
  expanded = false,
}: GardenSidebarProps) {
  const { isMobile } = useResponsive();

  const controlsContent = (
    <Controls
      settings={settings}
      updateSettings={updateSettings}
      applyPreset={applyPreset}
      onClear={onClear}
    />
  );

  if (isMobile) {
    // 移动端：抽屉（点遮罩关闭，不要那条白色标题栏）
    return (
      <Drawer
        title={null}
        closable={false}
        placement="left"
        onClose={onClose || (() => {})}
        open={visible}
        width={SIDEBAR_WIDTH}
        className="garden-sidebar"
        styles={{
          wrapper: { background: 'var(--sidebar-bg, #000000)' },
          body: { padding: 0 },
        }}
      >
        {controlsContent}
      </Drawer>
    );
  }

  // 桌面端：固定侧边栏（支持展开/收起）
  return (
    <div
      className="garden-sidebar"
      style={{
        position: 'fixed',
        left: 0,
        top: '45px', // header 的高度
        bottom: 0,
        width: expanded ? `${SIDEBAR_WIDTH}px` : '0',
        background: 'var(--sidebar-bg, #000000)',
        borderRight: expanded ? '1px solid var(--sidebar-border, rgba(38, 38, 38, 0.8))' : 'none',
        zIndex: 999,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.3s ease, border-right 0.3s ease',
      }}
    >
      {expanded && (
        <div style={{ width: `${SIDEBAR_WIDTH}px`, height: '100%' }}>
          {controlsContent}
        </div>
      )}
    </div>
  );
}

export default React.memo(GardenSidebar);
