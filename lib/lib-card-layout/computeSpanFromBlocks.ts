/**
 * lib/lib-card-layout/computeSpanFromBlocks.ts
 * 前端备用：从 blocks[] 加总得到整卡 span（后端未返回 precomputedSpan 时可用）。
 * 建议以后端计算为准；行数由后端决定，前端默认一行时显示不完则裁剪。
 */

export const ROW_HEIGHT_PX = 8;

export const BLOCK_SPANS = {
  GAP: 1,
} as const;

export type BlockLike = { type: string; span?: number };

export function computeSpanFromBlocks(blocks: BlockLike[]): number {
  let total = 0;
  for (const b of blocks) {
    if (b.type === 'gap') total += BLOCK_SPANS.GAP;
    else total += b.span ?? 0;
  }
  return Math.max(1, total);
}
