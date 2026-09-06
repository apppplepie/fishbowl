/**
 * lib/lib-card-layout/estimateTagRows.ts
 * 估算标签行要排几行、最多放得下几个标签：按 flex-wrap 的贪心规则模拟一遍。
 *
 * 和标题一样是「行数靠 clamp/换行，高度靠 span」：这里算出的 rows 必须同时
 * 写进 tags 块的 span 和卡片的 --tags-rows，两边用同一个值，否则网格行高对不上。
 * 放不下的标签用「+N」收尾，而不是让它们被裁掉。
 */

import { DEFAULT_COL_WIDTH_PX } from './constants';
import { TITLE_RESERVED_PX, measureTextWidth, type TitleCardKind } from './estimateTitleLines';

/** 标签字号，与 ui.css .ui-tag 的 font-size(--ui-font-size-sm) 一致 */
export const TAG_FONT_SIZE_PX = 12;
/** 单个标签除文字外占的宽：左右 padding 8+8、边框 1+1 */
export const TAG_CHROME_PX = 18;
/** 标签之间的横向间距，与 card-blocks.css .card-block-tags 的 column-gap 一致 */
export const TAG_COLUMN_GAP_PX = 6;
/** 标签最多排几行，再多就用「+N」收尾 */
export const TAG_MAX_ROWS = 3;

export type TagsLayout = {
  /** 标签块要排几行 */
  rows: number;
  /** 前几个标签能完整显示，其余用「+N」表示 */
  visibleCount: number;
};

function tagWidth(tag: string): number {
  return TAG_CHROME_PX + measureTextWidth(tag, TAG_FONT_SIZE_PX);
}

/** 「+N」那颗标签的宽度 */
function moreTagWidth(hiddenCount: number): number {
  return tagWidth(`+${hiddenCount}`);
}

export function estimateTagRows(
  tags: string[] | null | undefined,
  columnWidth?: number,
  kind: TitleCardKind = 'article',
  maxRows: number = TAG_MAX_ROWS
): TagsLayout {
  const list = (tags ?? []).filter((t) => !!t && t.trim());
  if (list.length === 0) return { rows: 1, visibleCount: 0 };

  const colW = columnWidth != null && columnWidth > 0 ? columnWidth : DEFAULT_COL_WIDTH_PX;
  // 字宽是估的，留 3% 余量，宁可多排一行也别把标签挤出去
  const available = Math.max(TAG_CHROME_PX * 2, (colW - TITLE_RESERVED_PX[kind]) * 0.97);

  /** 贪心排一遍：返回排完 list.slice(0, count) 用掉的行数与最后一行已用宽度 */
  const pack = (count: number) => {
    let rows = 1;
    let used = 0;
    for (let i = 0; i < count; i++) {
      const w = tagWidth(list[i]);
      const need = used === 0 ? w : used + TAG_COLUMN_GAP_PX + w;
      if (need <= available || used === 0) {
        used = need;
      } else {
        rows += 1;
        used = w;
      }
    }
    return { rows, used };
  };

  const all = pack(list.length);
  if (all.rows <= maxRows) return { rows: all.rows, visibleCount: list.length };

  // 排不下：从少到多试，找出「前 n 个 + 一颗 +N」还能压在 maxRows 内的最大 n
  for (let count = list.length - 1; count >= 1; count--) {
    const { rows, used } = pack(count);
    if (rows > maxRows) continue;
    const more = moreTagWidth(list.length - count);
    const fitsSameRow = used + TAG_COLUMN_GAP_PX + more <= available;
    if (fitsSameRow || rows < maxRows) {
      return { rows: fitsSameRow ? rows : rows + 1, visibleCount: count };
    }
  }

  // 连一个标签都排不下时，只显示「+N」
  return { rows: 1, visibleCount: 0 };
}
