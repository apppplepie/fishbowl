'use client';

import React from 'react';
import { Drawer } from 'antd';
import { useResponsive } from '@/app/hooks/useResponsive';
import Controls from './Controls';
import { PlantSettings, PlantType } from '../../types/garden';

interface GardenSidebarProps {
  settings: PlantSettings;
  updateSettings: (newSettings: Partial<PlantSettings>) => void;
  applyPreset: (type: PlantType) => void;
  onClear: () => void;
  visible?: boolean; // 移动端：抽屉是否可见
  onClose?: () => void; // 移动端：关闭抽屉
  expanded?: boolean; // 桌面端：侧边栏是否展开
}

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
    // 移动端：抽屉
    return (
      <Drawer
        title={null}
        placement="left"
        onClose={onClose || (() => {})}
        open={visible}
        size={320}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' },
        }}
      >
        {controlsContent}
        
        {/* 去掉drawer默认间距 */}
        <style>{`
          .ant-drawer-body {
            padding: 0 !important;
          }
        `}</style>
      </Drawer>
    );
  }

  // 桌面端：固定侧边栏（支持展开/收起）
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '45px', // header 的高度
        bottom: 0,
        width: expanded ? '320px' : '0',
        background: 'white',
        borderRight: expanded ? '1px solid #e8e8e8' : 'none',
        zIndex: 999,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.3s ease, border-right 0.3s ease',
      }}
    >
      {expanded && (
        <div style={{ width: '320px', height: '100%' }}>
          {controlsContent}
        </div>
      )}
    </div>
  );
}

export default React.memo(GardenSidebar);
