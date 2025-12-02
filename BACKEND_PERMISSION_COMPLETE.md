# 后端权限验证完成

## ✅ 已实现的功能

### 1. 文章发布权限
**API**: `POST /api/articles`

**权限要求**: 必须登录

**验证逻辑**:
```typescript
// 1. 验证用户登录
const currentUser = getCurrentUser(request);
if (!currentUser) {
  return 401 未授权
}

// 2. 使用登录用户信息
author: currentUser.username
author_id: currentUser.id
```

**变更**:
- ✅ 添加登录验证
- ✅ 自动设置 `author` 为当前用户用户名
- ✅ 自动设置 `author_id` 为当前用户ID
- ✅ 前端移除 `author` 参数（由后端自动设置）
- ✅ 前端添加 `Authorization` header

### 2. 文章编辑权限
**API**: `PUT /api/articles/[id]`

**权限要求**: 
- 必须登录
- 必须是作者本人 OR 管理员 OR 版主

**验证逻辑**:
```typescript
// 1. 验证登录
const currentUser = getCurrentUser(request);
if (!currentUser) {
  return 401 未授权
}

// 2. 获取文章信息
const article = await query('SELECT author, author_id FROM articles WHERE id = ?');

// 3. 检查权限
const isAuthor = article.author === currentUser.username || 
                 article.author_id === currentUser.id;
const hasModeratePermission = currentUser.role === 'admin' || 
                               currentUser.role === 'moderator';

if (!isAuthor && !hasModeratePermission) {
  return 403 禁止访问
}
```

**变更**:
- ✅ 添加登录验证
- ✅ 添加权限验证（作者/管理员/版主）
- ✅ 前端添加 `Authorization` header
- ✅ 前端添加 token 验证

### 3. 文章删除权限
**API**: `DELETE /api/articles/[id]`

**权限要求**:
- 必须登录
- 必须是作者本人 OR 管理员 OR 版主

**验证逻辑**:
```typescript
// 同编辑权限
// 1. 验证登录
// 2. 获取文章信息
// 3. 检查权限（作者/管理员/版主）
```

**变更**:
- ✅ 添加登录验证
- ✅ 添加权限验证（作者/管理员/版主）
- ✅ 添加操作日志
- ✅ 前端添加 `Authorization` header

## 📂 Next.js 文件结构说明

```
app/
├── api/                           ← 🟢 后端API（服务器端）
│   ├── articles/
│   │   ├── route.ts              ← POST /api/articles (发布)
│   │   └── [id]/
│   │       └── route.ts          ← PUT/DELETE /api/articles/[id] (编辑/删除)
│   └── auth/
│       ├── login/route.ts        ← 登录API
│       └── register/route.ts     ← 注册API
│
├── article/[id]/
│   └── page.tsx                  ← 🔵 前端页面
│
├── publish-article/
│   └── page.tsx                  ← 🔵 发布页面
│
└── components/
    └── GalleryPublishFloat.tsx   ← 🔵 绘画发布组件

🟢 = 后端代码（Node.js服务器）
🔵 = 前端代码（React浏览器）
```

## 📝 已修改的文件

### 后端API（3个）

1. **`app/api/articles/route.ts`** ⭐
   - 添加登录验证
   - 自动设置 author 和 author_id
   - 记录操作日志

2. **`app/api/articles/[id]/route.ts`** ⭐
   - PUT: 添加登录和权限验证
   - DELETE: 添加登录和权限验证
   - 记录操作日志

3. **`lib/auth.ts`**
   - 已存在，提供工具函数
   - `getCurrentUser()` - 获取当前用户
   - `canModerate()` - 检查管理权限

### 前端页面/组件（3个）

1. **`app/publish-article/page.tsx`**
   - 添加 token 获取
   - 添加 Authorization header
   - 添加登录检查

2. **`app/article/[id]/page.tsx`**
   - handleSave: 添加 token
   - handleDelete: 添加 token
   - 添加登录检查

3. **`app/components/GalleryPublishFloat.tsx`**
   - 添加 token 获取
   - 添加 Authorization header
   - 移除 author 参数（后端自动设置）

## 🔐 权限矩阵

| API | 未登录 | 作者 | 其他用户 | 版主 | 管理员 |
|-----|--------|------|---------|------|--------|
| POST /api/articles | ❌ 401 | ✅ | ✅ | ✅ | ✅ |
| PUT /api/articles/[id] | ❌ 401 | ✅ | ❌ 403 | ✅ | ✅ |
| DELETE /api/articles/[id] | ❌ 401 | ✅ | ❌ 403 | ✅ | ✅ |

## 🧪 测试场景

### 场景1: 发布文章
```bash
# 未登录
POST /api/articles (no token)
→ 401 Unauthorized

# 已登录
POST /api/articles + Bearer token
→ 200 OK
→ author 自动设置为当前用户
→ author_id 自动设置为当前用户ID
```

### 场景2: 编辑自己的文章
```bash
# 作者本人
PUT /api/articles/123 + Bearer token
→ 200 OK

# 其他用户
PUT /api/articles/123 + Bearer token
→ 403 Forbidden (无权编辑)

# 管理员
PUT /api/articles/123 + Bearer token (admin)
→ 200 OK (管理员可以编辑任何文章)
```

### 场景3: 删除文章
```bash
# 作者本人
DELETE /api/articles/123 + Bearer token
→ 200 OK

# 其他用户
DELETE /api/articles/123 + Bearer token
→ 403 Forbidden (无权删除)

# 版主
DELETE /api/articles/123 + Bearer token (moderator)
→ 200 OK (版主可以删除任何文章)
```

## 🔒 安全特性

### 1. Token 验证
```typescript
// 从 Header 提取 Token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// 验证 Token
const currentUser = getCurrentUser(request);
// 返回: { id, username, email, role }
```

### 2. 双重身份验证
```typescript
// 同时检查 author 和 author_id
const isAuthor = 
  article.author === currentUser.username ||  // 兼容旧数据
  article.author_id === currentUser.id;       // 新数据（更安全）
```

### 3. 操作日志
```typescript
// 发布
console.log(`✅ 文章发布成功: ${title} by ${username} (ID: ${id})`);

// 编辑
console.log(`文章已更新: ${id} by ${username}`);

// 删除
console.log(`文章已删除: ${title} (ID: ${id}) by ${username}`);
```

## 📊 错误响应

### 401 Unauthorized（未登录）
```json
{
  "success": false,
  "error": "请先登录"
}
```

### 403 Forbidden（无权限）
```json
{
  "success": false,
  "error": "无权编辑此文章"
}
```

```json
{
  "success": false,
  "error": "无权删除此文章"
}
```

### 404 Not Found（文章不存在）
```json
{
  "success": false,
  "error": "文章不存在"
}
```

## 🎯 前后端通信流程

### 发布文章流程
```
前端                          后端
│                            │
│ 1. 获取 token              │
│    localStorage.getItem()  │
│                            │
│ 2. POST /api/articles ────→│
│    Authorization: Bearer   │
│                            │
│                            │ 3. getCurrentUser(request)
│                            │    → 解析 token
│                            │    → 验证用户
│                            │
│                            │ 4. 自动设置:
│                            │    author = user.username
│                            │    author_id = user.id
│                            │
│                            │ 5. INSERT INTO articles
│                            │
│ 6. ←──────────────────────│ { success: true }
│    文章发布成功             │
│                            │
```

### 编辑文章流程
```
前端                          后端
│                            │
│ 1. PUT /api/articles/123 ─→│ + Bearer token
│                            │
│                            │ 2. getCurrentUser(request)
│                            │
│                            │ 3. SELECT author FROM articles
│                            │
│                            │ 4. 权限检查:
│                            │    - 是作者？
│                            │    - 是管理员？
│                            │    - 是版主？
│                            │
│                            │ YES → 5. UPDATE articles
│                            │ NO  → 403 Forbidden
│                            │
│ 6. ←──────────────────────│ { success: true }
│    或 { error: "无权编辑" }  │
```

## 🚀 下一步建议

### 推荐实现
1. **评论系统权限**
   - 发表评论需要登录
   - 删除评论（作者/管理员/版主）

2. **文章草稿功能**
   - 保存草稿不需要完整验证
   - 草稿只能作者查看

3. **文章审核流程**（可选）
   - 版主审核新发布的文章
   - 审核通过才显示

### 可选增强
1. **操作审计日志**
   - 记录所有增删改操作
   - 管理员查看日志

2. **API 速率限制**
   - 防止恶意频繁请求
   - 限制每分钟请求次数

3. **文章锁定**
   - 正在编辑时锁定
   - 防止并发编辑冲突

## ✨ 总结

### ✅ 完成的功能
- 后端：发布、编辑、删除 API 权限验证
- 前端：所有请求携带 Token
- 权限：作者、管理员、版主三级权限
- 安全：Token 验证 + 身份验证 + 权限验证

### 🎉 系统现状
- ✅ 前端权限控制（隐藏按钮）
- ✅ 后端权限验证（真正安全）
- ✅ 用户身份管理（JWT Token）
- ✅ 完整的日志记录

**现在你的系统已经有完整的前后端权限控制了！** 🚀

---

## 💡 关于 Next.js 的文件结构

你问的"后端没一个专门的文件吗？那我和前端写一个文件里吗"：

**答案是：分开的！**

- `app/api/*/route.ts` = 后端代码（服务器端，Node.js）
- `app/*/page.tsx` = 前端代码（浏览器端，React）

它们是**不同的文件**，运行在**不同的环境**：
- 后端运行在服务器（可以访问数据库）
- 前端运行在浏览器（通过 API 请求后端）

这就是 Next.js App Router 的设计！✨

