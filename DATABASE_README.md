# 数据库配置说明

## 📋 数据库信息

- **数据库类型**: MySQL
- **数据库名**: test
- **用户名**: root
- **密码**: root
- **主机**: localhost

## 🗄️ 表结构

### 1. articles（文章表）
存储文章的基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 文章ID（主键，UUID格式）|
| title | VARCHAR(255) | 文章标题 |
| author | VARCHAR(100) | 作者名称 |
| publish_date | DATE | 发布日期 |
| last_modified | DATETIME | 最后修改时间 |
| excerpt | TEXT | 文章摘要 |
| status | ENUM | 文章状态（draft/published）|
| likes | INT | 点赞数 |
| shares | INT | 分享数 |
| comments | INT | 评论数 |

### 2. blocks（块表）
存储所有内容块

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 块ID（主键，UUID格式）|
| type | ENUM | 块类型（text/image/code）|
| content | TEXT | 块内容（JSON格式）|
| author | VARCHAR(100) | 创建者 |
| created_at | DATETIME | 创建时间 |

**content 字段的 JSON 结构：**

- **文字块**:
```json
{
  "content": "文字内容..."
}
```

- **图片块**:
```json
{
  "url": "图片URL",
  "title": "图片标题",
  "description": "图片描述"
}
```

- **代码块**:
```json
{
  "language": "编程语言",
  "code": "代码内容",
  "title": "代码标题"
}
```

### 3. article_blocks（文章-块关系表）
管理文章和块的关联关系

| 字段 | 类型 | 说明 |
|------|------|------|
| article_id | VARCHAR(36) | 文章ID（外键）|
| block_id | VARCHAR(36) | 块ID（外键）|
| order | INT | 块在文章中的顺序 |
| created_at | DATETIME | 关联创建时间 |

## 🚀 初始化步骤

### 1. 确保 MySQL 服务正在运行

### 2. 创建数据库表结构

```bash
npx ts-node scripts/init-db.ts
```

这个脚本会：
- 测试数据库连接
- 创建 articles、blocks、article_blocks 三张表

### 3. 插入测试数据（可选）

```bash
npx ts-node scripts/seed-data.ts
```

这个脚本会插入两篇测试文章：
- **文章1**：《关于写作的一些思考》（1个文字块）
- **文章2**：《全栈开发入门》（8个块：文字+图片+代码）

## 📡 API 接口

### 发布文章
**POST** `/api/articles`

```json
{
  "title": "文章标题",
  "author": "作者名称",
  "excerpt": "文章摘要（可选）",
  "blocks": [
    {
      "type": "text",
      "content": "文字内容",
      "order": 0
    },
    {
      "type": "image",
      "imageUrl": "https://...",
      "title": "图片标题",
      "description": "图片描述",
      "order": 1
    },
    {
      "type": "code",
      "language": "typescript",
      "code": "代码内容",
      "title": "代码标题",
      "order": 2
    }
  ],
  "status": "published"
}
```

### 获取文章列表
**GET** `/api/articles?status=published&limit=20&offset=0`

### 获取单篇文章
**GET** `/api/articles/[id]`

## 🔧 配置文件位置

数据库连接配置在 `lib/db.ts` 文件中，如需修改数据库信息，请编辑该文件：

```typescript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'test',
  // ...
});
```

## ⚠️ 注意事项

1. 确保 MySQL 服务已启动
2. 确保数据库 `test` 已存在
3. 确保用户 `root` 有足够的权限
4. 块的 `content` 字段存储的是 JSON 字符串，读取时需要解析
5. 块可以被多篇文章引用（通过关系表实现）

## 🎯 使用流程

1. 初始化数据库表 → `npx ts-node scripts/init-db.ts`
2. 插入测试数据 → `npx ts-node scripts/seed-data.ts`
3. 启动开发服务器 → `npm run dev`
4. 访问发布页面 → `http://localhost:3000/publish-article`
5. 发布新文章 → 填写表单并点击"发布文章"
6. 查看文章列表 → `http://localhost:3000/articles`
7. 查看文章详情 → 点击文章卡片

## 📝 数据流程

```
用户发布文章
    ↓
前端表单提交
    ↓
POST /api/articles
    ↓
插入 articles 表（文章信息）
    ↓
循环插入 blocks 表（各个内容块）
    ↓
建立 article_blocks 关系（关联+排序）
    ↓
返回成功响应
```

```
用户查看文章
    ↓
GET /api/articles/[id]
    ↓
查询 articles 表（基本信息）
    ↓
JOIN article_blocks + blocks（获取所有块）
    ↓
按 order 排序
    ↓
解析 JSON content
    ↓
返回完整文章数据
```

## 🐛 常见问题

**Q: 数据库连接失败？**
A: 检查 MySQL 服务是否启动，用户名密码是否正确

**Q: 表已存在？**
A: 脚本使用了 `IF NOT EXISTS`，重复运行不会报错

**Q: 文章ID格式？**
A: 使用 UUID v4 格式（例如：`article_1` 或 `550e8400-e29b-41d4-a716-446655440000`）

**Q: 如何清空所有数据？**
A: 
```sql
DELETE FROM article_blocks;
DELETE FROM blocks;
DELETE FROM articles;
```

**Q: 如何查看当前数据？**
A:
```sql
SELECT * FROM articles;
SELECT * FROM blocks;
SELECT * FROM article_blocks;
```

