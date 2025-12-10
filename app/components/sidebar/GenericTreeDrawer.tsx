'use client';

import React from 'react';
import { Drawer, Button } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';

/**
 * 通用抽屉包装器
 * 用于移动端抽屉显示
 */
interface GenericTreeDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: number;
}

export default function GenericTreeDrawer({
  open,
  onClose,
  children,
  size = 280
}: GenericTreeDrawerProps) {
  return (
    <Drawer
      title={null}
      placement="left"
      onClose={onClose}
      open={open}
      size={size}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
      }}
    >
      {children}

      {/* 自定义样式 */}
      <style>{`
        /* 去掉drawer默认间距 */
        .ant-drawer-body {
          padding: 0 !important;
        }
      `}</style>
    </Drawer>
  );
}

/**
 * 抽屉打开按钮组件
 */
export function TreeDrawerButton({
  onClick
}: {
  onClick: () => void;
}) {
  return (
    <Button
      type="text"
      icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
      onClick={onClick}
      style={{ border: 'none' }}
    />
  );
}

