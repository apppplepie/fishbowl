/**
 * lib/lib-card-layout/estimateTitleLines.ts
 * 估算标题在给定列宽下要占几行：按浏览器的贪心折行规则模拟一遍。
 * 全角字（中日韩）可任意断行、按 1 个字宽算；西文按空格断词、单词整体不拆，
 * 比一行还长的单词按 overflow-wrap: break-word 逐字断开。
 *
 * 铁律仍然是「行数靠 clamp，高度靠 span」——这里只负责算出行数，
 * 调用方要同时把 titleSpan 撑大（span）并把 --title-lines 传给卡片（clamp），两边必须用同一个值。
 * 服务端算出来的行数会随卡片一起下发（blocks.title.lines / layoutHint.titleLines），
 * 前端直接用，别再按自己的列宽重算，否则 span 和渲染高度会差一行。
 */

import { DEFAULT_COL_WIDTH_PX } from './constants';

/** 标题字号，与 card-blocks.css .card-block-title__text 的 font-size 保持一致 */
export const TITLE_FONT_SIZE_PX = 18;
/** 标题最多撑到几行，再长仍然省略号收尾 */
export const TITLE_MAX_LINES = 4;

/** 卡片类型：只用来查标题行左右被吃掉多少宽度 */
export type TitleCardKind = 'article' | 'book' | 'image' | 'code' | 'diary';

/** 各卡标题行被内边距/图标占掉的宽度（px），列宽减掉它才是标题真正能用的宽度 */
export const TITLE_RESERVED_PX: Record<TitleCardKind, number> = {
  article: 40, // bodyStyle padding 0 20px
  book: 32,    // bodyStyle padding 0 16px
  image: 68,   // padding 0 20px + 图标 20px + gap 8px
  code: 40,    // .card-block-title--code padding 0 20px
  diary: 40,   // bodyStyle padding 0 20px
};

/** 全角/表意文字：中日韩、假名、全角标点等，按一个字宽算，且前后都能断行 */
const WIDE_CHAR =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;

/** 半角字符平均字宽（实测 18px 600 字重下 a≈10.4px，取略偏大的系数留余量） */
const NARROW_RATIO = 0.58;
const SPACE_RATIO = 0.28;
/** 字宽是估的，可用宽度打个 97% 折扣：宁可多给一行，也别把最后几个字截掉 */
const SAFETY = 0.97;

function charWidth(ch: string, fontSizePx: number): number {
  if (WIDE_CHAR.test(ch)) return fontSizePx;
  if (/\s/.test(ch)) return fontSizePx * SPACE_RATIO;
  return fontSizePx * NARROW_RATIO;
}

/** 一段文字画出来大概多宽（不折行）；标签宽度也用它 */
export function measureTextWidth(text: string, fontSizePx: number): number {
  let width = 0;
  for (const ch of text) width += charWidth(ch, fontSizePx);
  return width;
}

/** 切成折行单元：全角字各自成块，西文单词整块，空格单独返回 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let word = '';
  for (const ch of text) {
    if (/\s/.test(ch)) {
      if (word) { tokens.push(word); word = ''; }
      tokens.push(' ');
    } else if (WIDE_CHAR.test(ch)) {
      if (word) { tokens.push(word); word = ''; }
      tokens.push(ch);
    } else {
      word += ch;
    }
  }
  if (word) tokens.push(word);
  return tokens;
}

export function estimateTitleLines(
  title: string | null | undefined,
  columnWidth?: number,
  kind: TitleCardKind = 'article',
  maxLines: number = TITLE_MAX_LINES
): number {
  const text = (title ?? '').trim();
  if (!text) return 1;

  const colW = columnWidth != null && columnWidth > 0 ? columnWidth : DEFAULT_COL_WIDTH_PX;
  const available = Math.max(
    TITLE_FONT_SIZE_PX * 2,
    (colW - TITLE_RESERVED_PX[kind]) * SAFETY
  );
  const spaceWidth = TITLE_FONT_SIZE_PX * SPACE_RATIO;

  let lines = 1;
  let used = 0;
  let pendingSpace = 0;

  for (const token of tokenize(text)) {
    if (token === ' ') {
      // 行首的空格会被吃掉，行中的才占宽
      if (used > 0) pendingSpace = spaceWidth;
      continue;
    }

    let width = measureTextWidth(token, TITLE_FONT_SIZE_PX);

    if (used === 0 ? width <= available : used + pendingSpace + width <= available) {
      used = used === 0 ? width : used + pendingSpace + width;
      pendingSpace = 0;
      continue;
    }

    // 放不下就换行；已经在行首还放不下，说明这个词比一行还长，逐字断开
    if (used > 0) {
      lines += 1;
      used = 0;
      pendingSpace = 0;
    }
    while (width > available) {
      width -= available;
      lines += 1;
    }
    used = width;

    if (lines >= maxLines) return maxLines;
  }

  return Math.min(Math.max(1, lines), Math.max(1, maxLines));
}
