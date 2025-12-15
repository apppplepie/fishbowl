# 文章分类系统说明文档

## 概述

本文档介绍了文章分类树系统的实现，采用**邻接列表模型**来管理文章的层级分类关系。

## 数据库设计

### 1. 分类表 (categories)

```sql
CREATE TABLE categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(36),              -- 父分类ID，NULL表示根分类
  order_index INT DEFAULT 0,          -- 同级排序
  depth INT NOT NULL DEFAULT 1,       -- 分类深度（根节点为1）
  path VARCHAR(1000) NOT NULL DEFAULT '', -- 路径字符串（如：000001-000001-000002）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_path (path(255)),
  INDEX idx_depth (depth)
);
```

### 2. 自动路径生成触发器

为确保分类的 path 字段正确维护，添加了插入触发器：

```sql
CREATE TRIGGER trg_categories_before_insert
BEFORE INSERT ON categories
FOR EACH ROW
BEGIN
  DECLARE p_path VARCHAR(1000);
  DECLARE p_depth INT;

  SET p_path = NULL;
  SET p_depth = 0;

  -- 若没有父节点，则为根节点
  IF NEW.parent_id IS NULL OR NEW.parent_id = '' THEN
    SET NEW.depth = 1;
    SET NEW.path = LPAD(NEW.order_index, 6, '0');
  ELSE
    -- 查询父节点 path/depth
    SELECT path, depth
      INTO p_path, p_depth
      FROM categories
      WHERE id = NEW.parent_id
      LIMIT 1;

    -- 如果找不到父节点（异常情况）
    IF p_path IS NULL THEN
      SET NEW.depth = 1;
      SET NEW.path = LPAD(NEW.order_index, 6, '0');
    ELSE
      SET NEW.depth = p_depth + 1;
      SET NEW.path = CONCAT(p_path, '-', LPAD(NEW.order_index, 6, '0'));
    END IF;
  END IF;
END;
```

**Path 格式说明：**
- 根节点：`000001` (6位数字，不足补0)
- 子节点：`000001-000002` (父path-子order_index)
- 用于实现深度优先排序

### 3. 文章表新增字段 (articles)

```sql
ALTER TABLE articles 
  ADD COLUMN category_id VARCHAR(36),        -- 所属分类
  ADD COLUMN order_index INT DEFAULT 0; -- 分类内排序
```

### 3. 默认分类树结构

```
📁 未分类
📁 🎨 绘画作品
  ├─ 角色设计
  ├─ 场景概念
  └─ 写实练习
📁 📝 技术博客
  ├─ 前端开发
  └─ 后端开发
📁 📖 生活随笔
```

## API 接口

### 分类管理 API

#### 1. 获取所有分类

**请求：**
```http
GET /api/categories?format=tree
```

**参数：**
- `format`: `flat` | `tree` (可选，默认 flat)
  - `flat`: 返回扁平列表
  - `tree`: 返回树形结构

**响应：**
```json
{
  "success": true,
  "categories": [
    {
      "id": "cat_drawing",
      "name": "🎨 绘画作品",
      "parent_id": null,
      "order_index": 1,
      "children": [
        {
          "id": "cat_drawing_character",
          "name": "角色设计",
          "parent_id": "cat_drawing",
          "order_index": 1,
          "children": []
        }
      ]
    }
  ]
}
```

#### 2. 创建分类

**请求：**
```http
POST /api/categories
Content-Type: application/json

{
  "id": "cat_new",
  "name": "新分类",
  "parent_id": "cat_drawing",  // 可选
  "order_index": 1
}
```

#### 3. 更新分类

**请求：**
```http
PUT /api/categories/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  "parent_id": "new_parent_id",
  "order_index": 2
}
```

#### 4. 删除分类

**请求：**
```http
DELETE /api/categories/:id
```

**注意：** 如果分类下还有文章，删除会失败。

## 前端组件

### 1. ArticleCategoryModal（文章章节调整弹窗）

**功能：**
- 显示分类树和所有文章
- 支持拖拽调整当前文章的分类和位置
- 只有当前文章可拖拽，其他文章不可拖拽

**使用：**
```tsx
import ArticleCategoryModal from '@/app/components/ArticleCategoryModal';

<ArticleCategoryModal
  open={open}
  articleId="article-id"
  articleTitle="文章标题"
  currentCategoryId="cat_drawing"
  onClose={() => setOpen(false)}
  onSuccess={() => {
    // 刷新数据
  }}
/>
```

**交互说明：**
1. 打开弹窗，显示完整的分类树
2. 当前文章会高亮显示
3. 可以将当前文章拖拽到：
   - 分类节点内（成为该分类的第一个文章）
   - 其他文章节点的上方或下方（按顺序插入）
4. 拖拽完成后自动保存

### 2. ArticleEditFloat（文章编辑悬浮按钮）

**新增功能：**
- 添加了"调整章节"按钮（📁图标）
- 只有在浏览模式且有编辑权限时显示

**按钮组：**
```
┌─ 操作 ─┐
│ ✏️ 编辑 │
│ 📁 调整章节 │
│ 🗑️ 删除 │
└────────┘
```

## 使用场景

### 场景1：为文章指定分类

1. 打开文章页面
2. 点击右下角悬浮按钮
3. 选择"调整章节"
4. 将文章拖拽到目标分类

### 场景2：调整文章在分类中的顺序

1. 打开文章页面
2. 点击"调整章节"
3. 在同一分类内，将文章拖拽到其他文章的上方或下方

### 场景3：移动文章到其他分类

1. 打开文章页面
2. 点击"调整章节"
3. 将文章拖拽到新的分类节点

## 数据库查询示例

### 1. 获取某分类下的所有子分类（递归）

```sql
WITH RECURSIVE category_tree AS (
  SELECT * FROM categories WHERE id = 'cat_drawing'
  UNION ALL
  SELECT c.* FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree;
```

### 2. 获取某分类下的所有文章（包括子分类）

```sql
WITH RECURSIVE category_tree AS (
  SELECT id FROM categories WHERE id = 'cat_drawing'
  UNION ALL
  SELECT c.id FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT a.* FROM articles a
WHERE a.category_id IN (SELECT id FROM category_tree)
ORDER BY a.order_index ASC;
```

### 3. 获取文章的分类路径（面包屑）

```sql
WITH RECURSIVE category_path AS (
  SELECT * FROM categories 
  WHERE id = (SELECT category_id FROM articles WHERE id = 'article-id')
  UNION ALL
  SELECT c.* FROM categories c
  JOIN category_path cp ON cp.parent_id = c.id
)
SELECT * FROM category_path 
ORDER BY order_index;
```

## 迁移脚本

运行以下命令执行数据库迁移：

```bash
npx ts-node --project tsconfig.node.json scripts/add-categories.ts
```

**迁移内容：**
1. 创建 `categories` 表
2. 为 `articles` 表添加 `category_id` 和 `order_index` 字段
3. 创建默认分类树
4. 创建必要的索引

## 注意事项

### 1. 性能优化

- 为 `parent_id` 和 `order_index` 创建了索引
- 新增 `created_at` 和 `updated_at` 时间戳字段，自动记录创建和更新时间
- 为 `articles.category_id` 创建了索引
- 树形结构查询使用递归 CTE，性能较好

### 2. 数据完整性

- 使用外键约束确保数据一致性
- 删除分类时会级联删除子分类（CASCADE）
- 删除分类前检查是否有文章使用

### 3. 未来扩展

可以考虑添加以下功能：
- 分类图标/颜色
- 分类权限控制
- 分类统计信息（文章数量、最后更新时间等）
- 分类描述字段
- 批量移动文章

## 文件清单

### 数据库
- `scripts/add-categories.ts` - 数据库迁移脚本

### API
- `app/api/categories/route.ts` - 分类列表 API
- `app/api/categories/[id]/route.ts` - 单个分类 API

### 组件
- `app/components/ArticleCategoryModal.tsx` - 章节调整弹窗
- `app/components/ArticleEditFloat.tsx` - 文章编辑悬浮按钮（已更新）

### 页面
- `app/article/[id]/page.tsx` - 文章详情页（已更新）

## 常见问题

### Q1: 如何修改默认分类？

编辑 `scripts/add-categories.ts` 中的 `defaultCategories` 数组，然后重新运行迁移脚本（注意：会跳过已存在的分类）。

### Q2: 如何限制只有叶子节点才能关联文章？

在 `ArticleCategoryModal` 组件的 `onDrop` 方法中添加检查：

```typescript
// 检查目标分类是否有子分类
const hasChildren = await checkIfCategoryHasChildren(newCategoryId);
if (hasChildren) {
  message.warning('只能将文章放入最底层分类');
  return;
}
```

### Q3: 如何实现分类的拖拽排序？

可以创建一个独立的分类管理页面，使用类似 `ArticleCategoryModal` 的 Tree 拖拽功能，但允许拖拽分类节点本身。

## 总结

✅ 完成了完整的文章分类树系统
✅ 支持无限层级的分类结构
✅ 提供直观的拖拽界面调整文章位置
✅ 数据库设计清晰，易于扩展
✅ 代码结构良好，组件化程度高

现在你可以通过文章页面的悬浮按钮轻松管理文章的分类和顺序了！🎉

