# 数据库时间字段重构文档

## 📅 更新日期
2025-12-10

## 🎯 目标
统一和简化 `articles` 表的时间字段，解决字段冗余和命名不一致的问题。

## ❌ 旧的表结构问题

### 原有字段（存在问题）：
1. **`publish_date`** (DATE) - 发布日期，只有日期没有时分秒，精度不够
2. **`last_modified`** (DATETIME) - 最后修改时间
3. **`created_at`** (DATETIME) - 创建时间
4. **`updated_at`** (DATETIME) - 更新时间（自动更新）

### 问题分析：
- ❌ `last_modified` 和 `updated_at` 功能重复
- ❌ `publish_date` 类型为 DATE，缺少时分秒信息
- ❌ 字段命名不一致（snake_case 在数据库，camelCase 在前端）

## ✅ 新的表结构

### 优化后的字段：
1. **`published_at`** (DATETIME) - 发布时间（可为 NULL 表示草稿）
2. **`created_at`** (DATETIME) - 创建时间（自动设置）
3. **`updated_at`** (DATETIME) - 最后更新时间（自动更新）

### 优势：
- ✅ 删除冗余字段 `last_modified`
- ✅ 统一时间精度（都是 DATETIME）
- ✅ 语义更清晰
- ✅ 遵循常见的数据库设计规范

## 🔧 数据迁移

### 迁移脚本位置：
- SQL 脚本：`scripts/refactor-article-dates.sql`
- 执行脚本：`scripts/migrate-article-dates.mjs`

### 迁移步骤：
```sql
1. 添加 published_at 字段 (DATETIME)
2. 迁移 publish_date 数据到 published_at
3. 删除 publish_date 字段
4. 删除 last_modified 字段
5. 删除旧索引 idx_publish_date
6. 创建新索引 idx_published_at
```

### 执行命令：
```bash
node scripts/migrate-article-dates.mjs
```

## 📝 代码更新清单

### 后端 API 更新：
- ✅ `app/api/articles/list/route.ts` - 文章列表 API
- ✅ `app/api/articles/route.ts` - 文章创建/查询 API
- ✅ `app/api/articles/[id]/route.ts` - 文章详情/更新 API
- ✅ `app/api/articles/drawing/route.ts` - 绘画类型文章 API
- ✅ `app/api/categories/tree-with-articles/route.ts` - 分类树带文章
- ✅ `app/api/categories/[id]/tree-with-articles/route.ts` - 子分类树
- ✅ `lib/db.ts` - 数据库初始化脚本

### 前端组件更新：
- ✅ `app/components/cards/ArticleCard.tsx`
- ✅ `app/components/cards/ImageCard.tsx`
- ✅ `app/components/cards/DrawingGalleryCard.tsx`
- ✅ `app/components/cards/DiaryCard.tsx`
- ✅ `app/components/cards/CodeCard.tsx`
- ✅ `app/bookcase/page.tsx`
- ✅ `app/types/card.ts`

### 工具函数更新：
- ✅ `app/utils/timeFormat.ts` - 增加了输入验证和错误处理

## 🔄 字段映射关系

### 数据库 → 前端：
```javascript
// 数据库字段（snake_case）
{
  published_at: DateTime,
  created_at: DateTime,
  updated_at: DateTime
}

// 前端字段（camelCase）
{
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### API 返回格式：
所有 API 现在统一返回 camelCase 格式的时间字段。

## 🎨 前端显示逻辑

### 卡片组件时间显示优先级：
```javascript
formatRelativeTime(
  card.updatedAt ||        // 优先显示更新时间
  card.publishedAt ||      // 其次显示发布时间
  card.createdAt           // 最后显示创建时间
)
```

### 时间格式化函数增强：
- 增加了 `null`/`undefined` 检查
- 增加了 `isNaN()` 验证
- 无效日期返回 "未知时间"
- 添加了错误日志

## ✨ 测试结果

### 数据迁移验证：
```
✅ 数据库连接成功
✅ published_at 字段已创建
✅ 数据已成功迁移
✅ 旧字段已删除
✅ 索引已更新
```

### 示例数据：
```
id                                  | title | published_at             | created_at               | updated_at
------------------------------------|-------|--------------------------|--------------------------|---------------------------
02a30a92-c466-42ac-9c9d-76a5fdcf774e| pp1   | 2025-12-04T16:00:00.000Z | 2025-12-05T07:11:56.000Z | 2025-12-10T10:16:37.000Z
```

## 🚀 使用建议

### 创建新文章：
```javascript
// 只需要设置 published_at（如果是已发布状态）
// created_at 和 updated_at 会自动设置
await query(
  `INSERT INTO articles (id, title, author, author_id, published_at, ...) 
   VALUES (?, ?, ?, ?, ?, ...)`
);
```

### 更新文章：
```javascript
// updated_at 会自动更新，不需要手动设置
await query(
  `UPDATE articles SET title = ? WHERE id = ?`
);
```

### 查询文章：
```javascript
// 按更新时间排序
SELECT * FROM articles ORDER BY updated_at DESC

// 按发布时间排序
SELECT * FROM articles ORDER BY published_at DESC
```

## 📚 相关文档
- [数据库设计文档](./DATABASE_README.md)
- [时间格式化工具](./TEXT_FORMATTER_README.md)

## 👨‍💻 维护者
AI Assistant

---

**重要提示**：此迁移不可逆。在生产环境执行前，请务必备份数据库！

