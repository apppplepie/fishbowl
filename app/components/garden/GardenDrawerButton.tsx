'use client';

import { useResponsive } from '@/app/hooks/useResponsive';
import { TreeDrawerButton } from '../sidebar/GenericTreeDrawer';

/**
 * 花园工具按钮组件
 * - 移动端：显示为抽屉打开按钮
 * - 桌面端：显示为侧边栏展开/收起按钮
 */
export function GardenDrawerButton({
  onClick,
  expanded,
  onToggle
}: {
  onClick?: () => void; // 移动端使用，打开抽屉
  expanded?: boolean; // 桌面端使用，侧边栏是否展开
  onToggle?: () => void; // 桌面端使用，切换展开/收起
}) {
  const { isMobile } = useResponsive();
  
  // 移动端：返回抽屉按钮
  if (isMobile) {
    return <TreeDrawerButton onClick={onClick || (() => {})} />;
  }
  
  // 桌面端：返回展开/收起按钮
  return (
    <TreeDrawerButton 
      onClick={onToggle || (() => {})} 
    />
  );
}

