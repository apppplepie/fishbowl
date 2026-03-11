'use client';

import { usePageShell } from '@/app/contexts/PageShellContext';

/**
 * 整页顶部吸附（纯 CSS）：PageShell 在 scrollSnapVh 时已是固定高度滚动容器 + scroll-snap，
 * 进入页滚动也在 PageShell 内完成。本 hook 仅占位，页面只需 setConfig({ scrollSnapVh: DEFAULT_SCROLL_SNAP_VH }) 即可。
 */
export function useScrollSnapAtTop() {
  usePageShell(); // 保证在 Provider 内，config 已由页面 setConfig
}
