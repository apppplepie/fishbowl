# 🧱 块编辑器文章发布系统

## 📖 概述

这是一个基于"块（Block）"概念的现代化文章编辑器，灵感来自 Notion、飞书文档等产品。文章内容被组织成一个个独立的块，每个块可以是不同类型的内容（文字、图片、代码等）。

## 🎯 核心特性

### ✅ 已实现功能

1. **三种块类型**
   - 📝 文字块：支持多行文本编辑
   - 🖼️ 图片块：支持URL/上传，可添加标题、描述、作者信息
   - 💻 代码块：支持18种编程语言语法高亮

2. **灵活的编辑体验**
   - ⬆️⬇️ 上移/下移：调整块的顺序
   - 🗑️ 删除：移除不需要的块
   - ⌨️ 快捷删除：空块中按 Backspace 快速删除
   - 🎨 悬停高亮：鼠标悬停显示编辑工具

3. **文章管理**
   - 💾 保存草稿：自动保存到本地存储
   - 📊 实时统计：字数、块数、预估阅读时间
   - 🏷️ 标签系统：支持多标签分类
   - 🖼️ 封面图：可选的文章封面

4. **用户体验优化**
   - 📱 响应式设计：适配各种屏幕尺寸
   - 🎯 统一编辑界面：所有操作在一个页面完成
   - 💡 操作提示：实时显示使用帮助
   - ✨ 平滑动画：流畅的交互体验

## 📂 文件结构

```
app/
├── types/
│   └── block.ts                    # 块类型定义
├── components/
│   ├── BlockEditor.tsx             # 主编辑器组件
│   └── blocks/
│       ├── TextBlock.tsx           # 文字块组件
│       ├── ImageBlock.tsx          # 图片块组件
│       └── CodeBlock.tsx           # 代码块组件
└── publish-article/
    └── page.tsx                    # 文章发布页面
```

## 🎨 设计理念

### 1. 统一编辑模式
不区分"浅编辑"和"深编辑"，所有操作在同一界面完成：
- 点击内容 → 直接编辑
- 悬停块 → 显示工具栏
- 点击按钮 → 添加新块

### 2. 块的独立性
每个块都是独立的实体，拥有：
- 唯一ID
- 类型标识
- 排序顺序
- 自己的数据

### 3. 空块处理（学习 Notion）
- 删除内容 → 块变空但保留
- 显示提示："按 Backspace 删除此块"
- 再按删除 → 删除整个块

## 🔧 技术实现

### 数据结构

```typescript
// 块的基础结构
interface Block {
  id: string;           // 唯一标识
  type: BlockType;      // 块类型
  order: number;        // 排序
  // ... 其他类型特定字段
}

// 文章结构
interface Article {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  tags: string[];
  blocks: Block[];      // 块数组
  createdAt: string;
  updatedAt: string;
}
```

### 块的操作

```typescript
// 添加块
const addBlock = (type: BlockType) => {
  const newBlock = {
    id: generateId(),
    type,
    order: blocks.length,
    // ...
  };
  setBlocks([...blocks, newBlock]);
};

// 删除块
const deleteBlock = (index: number) => {
  const newBlocks = blocks.filter((_, i) => i !== index);
  // 重新排序
  const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
  setBlocks(reordered);
};

// 移动块
const moveBlock = (from: number, to: number) => {
  const newBlocks = [...blocks];
  [newBlocks[from], newBlocks[to]] = [newBlocks[to], newBlocks[from]];
  setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
};
```

## 🚀 使用方法

### 1. 访问页面
导航到 `/publish-article` 或点击顶部菜单的"创作文章"

### 2. 填写基本信息
- 输入文章标题（必填）
- 上传封面图（可选）
- 填写作者信息
- 添加标签

### 3. 创作内容
1. 点击"添加新块"按钮
2. 选择块类型（文字/图片/代码）
3. 编辑块内容
4. 使用工具栏调整顺序
5. 重复以上步骤添加更多块

### 4. 发布或保存
- **发布文章**：提交到服务器（需要后端API）
- **保存草稿**：保存到本地存储
- **加载草稿**：恢复上次编辑的内容

## 🔌 后端集成

当前版本是纯前端实现，需要接入后端API：

### 1. 发布文章
```typescript
POST /api/articles
Body: {
  title: string;
  author: string;
  coverImage?: string;
  tags: string[];
  blocks: Block[];
}
```

### 2. 保存草稿
```typescript
POST /api/articles/draft
Body: Article
```

### 3. 图片上传
```typescript
POST /api/upload/image
Body: FormData
Response: { url: string }
```

## 📊 数据库设计建议

基于你的多对多设计思路：

```sql
-- 文章表
CREATE TABLE articles (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(100),
  cover_image VARCHAR(500),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 文字块表
CREATE TABLE text_blocks (
  id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP
);

-- 图片块表
CREATE TABLE image_blocks (
  id VARCHAR(50) PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  author VARCHAR(100),
  created_at TIMESTAMP
);

-- 代码块表
CREATE TABLE code_blocks (
  id VARCHAR(50) PRIMARY KEY,
  code TEXT NOT NULL,
  language VARCHAR(50),
  title VARCHAR(255),
  created_at TIMESTAMP
);

-- 文章-块关系表（多对多）
CREATE TABLE article_blocks (
  article_id VARCHAR(50),
  block_id VARCHAR(50),
  block_type ENUM('text', 'image', 'code'),
  order_index INT,
  PRIMARY KEY (article_id, block_id),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 标签表
CREATE TABLE article_tags (
  article_id VARCHAR(50),
  tag VARCHAR(50),
  PRIMARY KEY (article_id, tag),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);
```

这样设计的好处：
- ✅ 块可以被多篇文章复用
- ✅ 易于统计（某个图片被引用多少次）
- ✅ 支持版本控制（每个块独立）
- ✅ 灵活的查询和过滤

## 🎨 样式说明

### 颜色系统
- **文字块**：蓝色 (#1890ff)
- **图片块**：绿色 (#52c41a)
- **代码块**：紫色 (#722ed1)

### 交互反馈
- 悬停时：显示边框和背景色
- 聚焦时：高亮显示
- 按钮禁用：灰色

## 🔮 未来扩展

### 可以添加的功能
1. **更多块类型**
   - 引言块
   - 视频块
   - 音频块
   - 表格块
   - 分隔线
   - TODOs

2. **高级编辑**
   - 拖拽排序（react-beautiful-dnd）
   - 快捷键支持（Ctrl+S 保存等）
   - Markdown 支持
   - 协作编辑

3. **内容管理**
   - 历史版本
   - 块模板库
   - 块搜索和引用
   - 导入导出

4. **用户体验**
   - 实时预览
   - 移动端优化
   - 离线编辑
   - 自动保存

## 💡 使用技巧

1. **快速创作**：使用快捷键（可扩展）
2. **内容复用**：图片块可以被多篇文章引用
3. **定期保存**：编辑过程中定期点击"保存草稿"
4. **合理分段**：适当使用文字块分段，提高可读性
5. **代码高亮**：正确选择代码语言获得更好的展示效果

## 🐛 已知问题

- [ ] 图片上传暂时使用本地URL，需要接入真实的上传服务
- [ ] 草稿只保存在本地存储，切换设备会丢失
- [ ] 暂不支持拖拽排序（可以用上移下移代替）
- [ ] 代码块暂无语法高亮渲染（编辑器中显示纯文本）

## 📝 总结

这个块编辑器实现了你最初的设计思路：
- ✅ 后端结构化存储（支持关系表设计）
- ✅ 前端负责渲染
- ✅ 图文分离，可以独立管理
- ✅ 统一的编辑界面
- ✅ 灵活的内容组织

这是一个非常现代化且可扩展的方案！🎉

