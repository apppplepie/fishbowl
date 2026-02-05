# lib-card-layout（块状 span）

全站统一：文章卡用 **blocks[] + precomputedSpan**；图片卡独立处理。

## 文章卡（blocks 驱动）

- **后端**：`buildBlocksFromArticle(article, breakpoint)` → `{ blocks, precomputedSpan }`。gap、pad 作为块显式存在。
- **前端**：`ArticleCardBlocks` 接收 `card`、`blocks`、`span`，按块渲染；每块高度 `--span * 8px`。
- **备用**：`computeSpanFromBlocks(blocks)` 在前端加总 span（后端未返回 precomputedSpan 时可用）。

## 其他卡（image / diary / code / book）

- 仍用 `getSpanForCard`、`getLayoutForCard`（presets + layoutHint）。图片卡 span 由列宽与宽高比计算。

## 常量

- `constants.ts`：`ROW_HEIGHT_PX`、`BLOCK_SPANS`、`DEFAULT_COL_WIDTH_PX` 等。
