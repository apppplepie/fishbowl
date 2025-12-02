# 评论系统设计文档

## 数据库表结构

### comments 表

支持评论文章和回复评论（无限层级树形结构）。

```sql
CREATE TABLE comments (
  id VARCHAR(36) PRIMARY KEY,                -- UUID
  article_id VARCHAR(36) NOT NULL,           -- 文章ID
  user_id VARCHAR(36) NOT NULL,              -- 评论用户ID
  parent_id VARCHAR(36),                     -- 父评论ID（NULL表示顶级评论）
  content TEXT NOT NULL,                     -- 评论内容
  like_count INT DEFAULT 0,                  -- 点赞数
  status ENUM('visible', 'hidden', 'deleted') DEFAULT 'visible',  -- 状态
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_created_at (created_at)
);
```

## 字段说明

### 核心字段

- **id**: 评论唯一标识（UUID）
- **article_id**: 所属文章ID（必填）
- **user_id**: 评论者ID（必填）
- **parent_id**: 父评论ID
  - `NULL`: 表示这是对文章的直接评论
  - 有值: 表示这是对某条评论的回复
- **content**: 评论内容（TEXT类型，支持长文本）

### 统计字段

- **like_count**: 点赞数（默认0）

### 状态字段

- **visible**: 正常可见
- **hidden**: 隐藏（被管理员/版主隐藏）
- **deleted**: 已删除（软删除）

## 评论层级结构

### 示例数据

```
文章：《React Hooks 详解》

├─ 评论1 (id: c1, parent_id: NULL)
│   用户A: "讲得很好！"
│   
│   ├─ 回复1-1 (id: c2, parent_id: c1)
│   │   用户B: "@用户A 同意！"
│   │
│   └─ 回复1-2 (id: c3, parent_id: c1)
│       用户C: "@用户A 有个问题..."
│       
│       └─ 回复1-2-1 (id: c4, parent_id: c3)
│           用户A: "@用户C 可以这样..."
│
└─ 评论2 (id: c5, parent_id: NULL)
    用户D: "收藏了！"
```

### 数据表示

| id | article_id | user_id | parent_id | content |
|----|-----------|---------|-----------|---------|
| c1 | article1  | userA   | NULL      | 讲得很好！ |
| c2 | article1  | userB   | c1        | @用户A 同意！ |
| c3 | article1  | userC   | c1        | @用户A 有个问题... |
| c4 | article1  | userA   | c3        | @用户C 可以这样... |
| c5 | article1  | userD   | NULL      | 收藏了！ |

## API 设计

### 1. 获取文章评论列表

**GET** `/api/articles/{article_id}/comments`

查询参数：
- `sort`: 排序方式（`latest` | `oldest` | `hot`）
- `limit`: 每页数量
- `offset`: 偏移量

返回：
```json
{
  "success": true,
  "comments": [
    {
      "id": "c1",
      "article_id": "article1",
      "user": {
        "id": "userA",
        "username": "张三",
        "avatar_url": "..."
      },
      "content": "讲得很好！",
      "like_count": 10,
      "reply_count": 2,
      "created_at": "2024-12-02T10:00:00Z",
      "replies": [
        {
          "id": "c2",
          "user": {...},
          "content": "@用户A 同意！",
          "created_at": "...",
          "replies": []
        }
      ]
    }
  ],
  "total": 50
}
```

### 2. 发布评论

**POST** `/api/articles/{article_id}/comments`

请求体：
```json
{
  "content": "这是一条评论",
  "parent_id": null  // 可选，回复评论时填写
}
```

### 3. 删除评论

**DELETE** `/api/comments/{comment_id}`

权限：
- 评论作者可以删除自己的评论
- 管理员和版主可以删除任何评论

### 4. 点赞评论

**POST** `/api/comments/{comment_id}/like`

### 5. 隐藏评论（管理员功能）

**PATCH** `/api/comments/{comment_id}/hide`

## 查询优化

### 1. 查询文章的所有顶级评论

```sql
SELECT c.*, u.username, u.avatar_url
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.article_id = ? 
  AND c.parent_id IS NULL
  AND c.status = 'visible'
ORDER BY c.created_at DESC
LIMIT 20;
```

### 2. 查询某条评论的所有回复

```sql
SELECT c.*, u.username, u.avatar_url
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.parent_id = ?
  AND c.status = 'visible'
ORDER BY c.created_at ASC;
```

### 3. 递归查询完整评论树（MySQL 8.0+）

```sql
WITH RECURSIVE comment_tree AS (
  -- 顶级评论
  SELECT c.*, u.username, u.avatar_url, 0 as depth
  FROM comments c
  JOIN users u ON c.user_id = u.id
  WHERE c.article_id = ?
    AND c.parent_id IS NULL
    AND c.status = 'visible'
  
  UNION ALL
  
  -- 递归查询回复
  SELECT c.*, u.username, u.avatar_url, ct.depth + 1
  FROM comments c
  JOIN users u ON c.user_id = u.id
  JOIN comment_tree ct ON c.parent_id = ct.id
  WHERE c.status = 'visible'
)
SELECT * FROM comment_tree
ORDER BY created_at ASC;
```

## 前端显示建议

### 1. 分页策略

- **顶级评论**: 分页加载（每页20条）
- **回复**: 默认显示前3条，点击"查看更多回复"加载剩余

### 2. 嵌套层级限制

建议最多显示3-4层嵌套，超过层级的回复可以展平显示或折叠。

### 3. UI 布局

```
┌─────────────────────────────────────────┐
│ 👤 张三  2024-12-02 10:00              │
│ 讲得很好！                               │
│ 👍 10  💬 回复                           │
│                                         │
│  ├─ 👤 李四  10:05                      │
│  │  @张三 同意！                         │
│  │  👍 2  💬 回复                        │
│  │                                      │
│  └─ 👤 王五  10:10                      │
│     @张三 有个问题...                    │
│     👍 0  💬 回复                        │
│                                         │
│     └─ 👤 张三  10:15                   │
│        @王五 可以这样...                 │
│        👍 1  💬 回复                     │
└─────────────────────────────────────────┘
```

## 权限控制

### 评论权限

| 操作 | user | moderator | admin |
|------|------|-----------|-------|
| 发布评论 | ✅ | ✅ | ✅ |
| 删除自己的评论 | ✅ | ✅ | ✅ |
| 删除他人评论 | ❌ | ✅ | ✅ |
| 隐藏评论 | ❌ | ✅ | ✅ |
| 查看已隐藏评论 | ❌ | ✅ | ✅ |

## 安全考虑

### 1. 内容审核

- XSS 防护：前端转义 HTML
- 敏感词过滤
- 垃圾评论检测（频率限制）

### 2. 防刷评论

- 同一用户在短时间内评论次数限制
- IP 限制
- 验证码（可选）

### 3. 软删除

- 评论删除使用软删除（status = 'deleted'）
- 保留评论记录用于审计
- 级联删除：父评论删除时，子评论也标记为删除

## 统计功能

### 文章评论数统计

```sql
SELECT COUNT(*) as comment_count
FROM comments
WHERE article_id = ?
  AND status = 'visible';
```

### 用户评论数统计

```sql
SELECT COUNT(*) as comment_count
FROM comments
WHERE user_id = ?
  AND status = 'visible';
```

## 通知系统（可选扩展）

当评论被回复时，可以触发通知：

1. 站内通知
2. 邮件通知（如果用户开启）
3. 推送通知

## 性能优化建议

1. **索引优化**
   - `article_id` 索引：快速查找文章的所有评论
   - `parent_id` 索引：快速查找评论的回复
   - 复合索引：`(article_id, created_at)` 用于排序

2. **缓存策略**
   - 热门评论缓存
   - 评论数量缓存
   - Redis 存储评论树结构

3. **分页加载**
   - 游标分页（基于 created_at）
   - 避免深度分页

4. **读写分离**
   - 评论列表从读库查询
   - 新评论写入主库

## 未来扩展

1. **评论点赞表**（如需记录点赞用户）

```sql
CREATE TABLE comment_likes (
  comment_id VARCHAR(36),
  user_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

2. **评论举报表**

```sql
CREATE TABLE comment_reports (
  id VARCHAR(36) PRIMARY KEY,
  comment_id VARCHAR(36),
  reporter_id VARCHAR(36),
  reason TEXT,
  status ENUM('pending', 'resolved', 'rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
```

3. **@提及功能**

在 content 中解析 @username，创建关联表记录提及关系。

