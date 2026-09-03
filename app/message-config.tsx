'use client';

import { useEffect } from 'react';
import { message } from '@/app/components/ui';

/**
 * 全局 Message 配置组件
 * 设置 message 显示位置，避免被 header 遮挡
 */
export default function MessageConfig() {
  useEffect(() => {
    message.config({
      top: 80,        // 距离顶部 80px，避免被 header 遮挡
      duration: 3,     // 持续 3 秒
      maxCount: 3,     // 最多同时显示 3 个
    });
  }, []);

  return null;
}

