# 📰 文章块渲染系统说明

## 🎯 系统概述

文章详情页现在支持基于"块"的内容渲染，可以灵活组织文字和图片内容。

## 📊 文章类型

### 类型 1：纯文字文章（ID: 1）
**标题：** 探索 Next.js 的服务端渲染：从理论到实践

**特点：**
- ✅ 全部由文字块组成
- ✅ 支持 Markdown 风格标题（##、###）
- ✅ 支持代码块显示（用反引号包裹）
- ✅ 段落间自动保持间距

**访问方式：**
```
/article/1
```

**内容结构：**
```
文字块 1: 引言段落
文字块 2: 什么是服务端渲染
文字块 3: Next.js 的 SSR 实现
文字块 4: 性能优化技巧
文字块 5: 实战案例
文字块 6: 总结
```

---

### 类型 2：图文结合文章（ID: 2）
**标题：** 城市摄影日记：捕捉光影间的美好瞬间

**特点：**
- ✅ 文字块和图片块交替排列
- ✅ 图片点击后弹出大图查看器（复用 ImageCardModal）
- ✅ 图片支持标题和描述
- ✅ 图片 hover 时有放大效果

**访问方式：**
```
/article/2
```

**内容结构：**
```
文字块 1: 引言
文字块 2: 清晨的城市
图片块 1: 晨光中的城市（点击可查看大图）
文字块 3: 拍摄故事
文字块 4: 街头人文
图片块 2: 城市夜景（点击可查看大图）
文字块 5: 建筑之美
图片块 3: 现代建筑（点击可查看大图）
文字块 6: 摄影心得和总结
```

---

## 🎨 渲染逻辑

### 块类型识别
```typescript
blocks.map((block, index) => {
  if (block.type === 'text') {
    // 渲染文字块
    return <div>{block.content}</div>;
  } else if (block.type === 'image') {
    // 渲染图片块
    return (
      <img 
        src={block.imageUrl}
        onClick={() => openImageModal(block)}
      />
    );
  }
});
```

### 文字块渲染
- `whiteSpace: 'pre-wrap'` - 保留换行和空格
- `lineHeight: 1.8` - 舒适的行间距
- 自动识别 Markdown 标题语法（##、###）

### 图片块渲染
- **hover 效果** - 轻微放大（scale: 1.02）
- **点击查看** - 弹出 ImageCardModal
- **圆角阴影** - 优雅的视觉效果
- **标题显示** - 图片下方显示标题

---

## 🔌 数据结构

### 文章数据
```typescript
interface Article {
  id: string;
  title: string;
  author: string;
  publishDate: string;
  lastModified: string;
  excerpt: string;        // 摘要，用于列表展示
  blocks: ArticleBlock[]; // 内容块数组
  likes: number;
  shares: number;
  comments: number;
}
```

### 块数据
```typescript
// 文字块
interface TextBlock {
  type: 'text';
  content: string;
}

// 图片块
interface ImageBlock {
  type: 'image';
  imageUrl: string;
  title?: string;
  description?: string;
  author?: string;
}

type ArticleBlock = TextBlock | ImageBlock;
```

---

## 🚀 使用方式

### 1. 查看文章
1. 访问 `/articles` 文章归档页面
2. 点击卡片（ID=1 纯文字，ID=2 图文结合）
3. 查看文章详情

### 2. 图片交互（仅图文文章）
1. 鼠标悬停图片 - 轻微放大
2. 点击图片 - 弹出大图查看器
3. 在查看器中可以看到图片标题和描述

### 3. 评论互动
1. 滚动到底部评论区
2. 登录后可以发表评论
3. 可以点赞、删除自己的评论

---

## 📝 文章归档页面集成

在 `/articles` 页面的瀑布流中会显示这两篇文章的卡片：

**卡片 1（ID: 1）：**
```
┌─────────────────────────────┐
│ [封面图]                     │
│                              │
│ 探索 Next.js 的服务端渲染... │
│                              │
│ 深入探讨 Next.js 的 SSR...  │
│                              │
│ 👤 张三  ⏱️ 8分钟  💬 23     │
└─────────────────────────────┘
```

**卡片 2（ID: 2）：**
```
┌─────────────────────────────┐
│ [摄影封面图]                 │
│                              │
│ 城市摄影日记...              │
│                              │
│ 用镜头记录城市的美好瞬间...  │
│                              │
│ 👤 李摄影  ⏱️ 6分钟  💬 47   │
└─────────────────────────────┘
```

---

## 🎯 技术亮点

### 1. 统一渲染引擎
不管是纯文字还是图文结合，都用同一套渲染逻辑，只是块的组合不同。

### 2. 图片复用逻辑
图片块可以被多篇文章引用（和你的数据库设计一致）：
```typescript
// 文章 A 使用图片块 123
// 文章 B 也可以使用图片块 123
// 数据库中只存储一份图片
```

### 3. 灵活扩展
未来可以轻松添加新的块类型：
- 代码块（带语法高亮）
- 引言块
- 视频块
- 表格块
- ...

---

## 💾 数据库存储建议

基于你的多对多设计：

```sql
-- 文章基本信息
CREATE TABLE articles (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255),
  author VARCHAR(100),
  publish_date DATE,
  last_modified DATE,
  excerpt TEXT,
  likes INT DEFAULT 0,
  shares INT DEFAULT 0,
  comments INT DEFAULT 0
);

-- 文字块池
CREATE TABLE text_blocks (
  id VARCHAR(50) PRIMARY KEY,
  content TEXT
);

-- 图片块池（可复用）
CREATE TABLE image_blocks (
  id VARCHAR(50) PRIMARY KEY,
  image_url VARCHAR(500),
  title VARCHAR(255),
  description TEXT,
  author VARCHAR(100)
);

-- 文章-块关联表（多对多 + 排序）
CREATE TABLE article_blocks (
  article_id VARCHAR(50),
  block_id VARCHAR(50),
  block_type ENUM('text', 'image'),
  order_index INT,
  PRIMARY KEY (article_id, block_id, order_index),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);
```

**查询示例：**
```sql
-- 获取文章的所有块（按顺序）
SELECT 
  ab.block_type,
  ab.order_index,
  CASE 
    WHEN ab.block_type = 'text' THEN tb.content
    WHEN ab.block_type = 'image' THEN ib.image_url
  END as content
FROM article_blocks ab
LEFT JOIN text_blocks tb ON ab.block_id = tb.id AND ab.block_type = 'text'
LEFT JOIN image_blocks ib ON ab.block_id = ib.id AND ab.block_type = 'image'
WHERE ab.article_id = '1'
ORDER BY ab.order_index;
```

---

## 🎨 前端展示效果

### 纯文字文章（ID: 1）
```
┌──────────────────────────────┐
│ 探索 Next.js 的服务端渲染... │
├──────────────────────────────┤
│ 在现代 Web 开发中...          │
│                              │
│ ## 什么是服务端渲染？         │
│ 服务端渲染是指...            │
│                              │
│ ## Next.js 的 SSR 实现       │
│ Next.js 通过...              │
└──────────────────────────────┘
```

### 图文结合文章（ID: 2）
```
┌──────────────────────────────┐
│ 城市摄影日记...              │
├──────────────────────────────┤
│ 摄影是一门捕捉瞬间的艺术...  │
│                              │
│ ## 清晨的城市                │
│ 清晨的城市总是格外宁静...    │
│                              │
│ [🖼️ 晨光中的城市]  ← 点击查看│
│                              │
│ 这张照片拍摄于某个周日...    │
│                              │
│ [🖼️ 城市夜景]     ← 点击查看│
│                              │
│ ## 建筑之美                  │
│ 现代建筑的线条和光影...      │
│                              │
│ [🖼️ 现代建筑]     ← 点击查看│
└──────────────────────────────┘
```

---

## 🎉 总结

现在文章系统支持：
- ✅ 纯文字文章（ID: 1）
- ✅ 图文结合文章（ID: 2）
- ✅ 统一的渲染引擎
- ✅ 图片点击放大查看
- ✅ 完整的评论系统
- ✅ 与你的数据库设计完美契合

试试访问这两篇文章，体验不同的内容呈现方式！🎨

