# 卡片格式与加载方式说明（块状 span）

所有卡片共用 **lib-card-layout** 的 **块状 span**：标题 3 span、简介每行 2 span、分割线 1、日期 2、标签 3、表情天气 3、代码块 8。图片卡 = 图片高度(px→span) + 标题(3) + 简介(若有)(行数×2)。修改 `lib/lib-card-layout/constants.ts` 的 `BLOCK_SPANS` 即可全局生效。

---

## 1. ImageCard（图片卡）

- **格式**：上方大图（按 aspectRatio 占位）+ 下方标题区 **3 span**（`spanToHeightPx(3)`）。有简介时：行数×2 span。
- **加载**：Next.js `Image`，高度由数据宽高比决定；支持 blur 占位、priority。
- **span**：`imageSpan(列宽/宽高比→px→span) + titleSpan(3) + excerptLines*2`。

---

## 2. ArticleCard（文章卡）

- **格式**：标题 **3 span** + 简介 **行数×2 span** + 分割线 1 + 日期 2 + 标签 3。标题单行省略，简介 line-clamp。
- **加载**：纯文本，列表 API。
- **span**：`3 + excerptLines*2 + 1 + 2 + 3`（由 preset + layoutHint 决定 excerptLines）。

---

## 3. DiaryCard（日志卡）

- **格式**：标题（日期）**3 span** + 表情 **3 span**（无则不用）+ 正文 **行数×2 span** + 分割线 1 + 日期 2。
- **加载**：纯文本，从 content/excerpt 解析。
- **span**：`3 + 3 + excerptLines*2 + 1 + 2`。

---

## 4. BookCard（书籍卡）

- **格式**：封面图固定高度 + 书名/作者/日期；封面 280px 换算成 span。
- **span**：`imageSpan + titleSpan(3) + excerptLines*2 + dateSpan(2)`。

---

## 5. CodeCard（代码卡）

- **格式**：标题 **3 span** + 代码块 **8 span**（内部行数固定）。
- **span**：`3 + 8`。

---

## 统一约定

- **块高**：全部由 `BLOCK_SPANS` + `spanToHeightPx(span)` 得到像素高度，无行高换算。
- **图片**：仅图片高度需 px→span 换算，其余均为 span 相加。

### 修改简介每行 span（EXCERPT_LINE）

只改 **两处** 即可全站生效：

1. **TS**：`lib/lib-card-layout/constants.ts` → `BLOCK_SPANS.EXCERPT_LINE`（如改为 `3`）。
2. **CSS**：`app/components/cards/card-blocks.css` → `:root { --excerpt-span-per-line: 3; }`（与上同值）。

`buildBlocksFromArticle`、`masonry-server-utils`、`ArticleCardBlocks` 均从 constants 读取；卡片区块样式（含 ArticleCardBlocks）统一在 card-blocks.css。

---

## 6. ArticleCardBlocks（文章卡 — blocks[] 驱动，完整演示）

- **数据**：后端用 `buildBlocksFromArticle(article, breakpoint)` 生成 `{ blocks, precomputedSpan }`；gap、pad-top/pad-bottom 作为块显式存在。
- **前端**：`ArticleCardBlocks` 接收 `card`、`blocks`、`span`（即 precomputedSpan），按 blocks 顺序渲染；每个块用 CSS 变量 `--span` 控高，`height = var(--span) * 8px`，内容垂直居中。
- **图片**：独立处理，不在此 blocks 流程；图片卡可由后端单独返回 `image.span` 等。

### 示例：后端输出（3 行 excerpt）

输入文章示例：

```json
{
  "id": "a1",
  "title": "How span-first layout changed my life",
  "excerpt": "短篇示例文字，约 50 字左右，应该被判定为 3 行的小段落，用来演示后端如何进行行数阈值映射。",
  "tags": ["design", "ui"],
  "publishedAt": "2026-02-05T08:00:00Z"
}
```

`buildBlocksFromArticle(article, 'desktop')` 输出：

```json
{
  "blocks": [
    {"type":"pad-top","span":2},
    {"type":"title","span":3,"text":"How span-first layout changed my life"},
    {"type":"gap"},
    {"type":"tags","span":3,"tags":["design","ui"]},
    {"type":"gap"},
    {"type":"excerpt","lines":3,"span":6,"text":"短篇示例文字..."},
    {"type":"gap"},
    {"type":"divider","span":1},
    {"type":"gap"},
    {"type":"date","span":2,"value":"2026-02-05T08:00:00Z"},
    {"type":"pad-bottom","span":2}
  ],
  "precomputedSpan": 19
}
```

使用：列表 API 返回 `blocks` + `precomputedSpan` 时，用 `<ArticleCardBlocks card={article} blocks={article.blocks} span={article.precomputedSpan} />` 渲染。
