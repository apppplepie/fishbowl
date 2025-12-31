# 用户表设计文档

## 设计理念

采用 **单表 + 角色系统** 的现代化设计，而非传统的管理员/用户分表设计。

## 为什么选择单表设计？

### 优势 ✅

1. **扩展性好**
   - 轻松添加新角色（版主、VIP、编辑等）
   - 支持角色升级/降级
   - 一个用户可以有多个角色（通过 user_roles 表）

2. **维护简单**
   - 统一的用户管理逻辑
   - 不需要同步多张表
   - 减少代码重复

3. **灵活性高**
   - 支持复杂的权限体系（RBAC）
   - 方便实现细粒度权限控制
   - 便于审计和日志记录

4. **符合现代标准**
   - 大多数现代框架和系统采用此设计
   - 便于集成第三方认证（OAuth、SAML）
   - 符合 DRY 原则

### 传统分表设计的问题 ❌

1. **扩展困难**
   - 添加新角色需要新建表
   - 角色转换需要跨表操作

2. **维护复杂**
   - 需要同步多张表的字段
   - 重复的业务逻辑

3. **灵活性差**
   - 难以实现复杂权限
   - 用户只能有一个角色

## 数据库表结构

### 1. users 表（核心表）

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,              -- UUID
  username VARCHAR(50) UNIQUE NOT NULL,    -- 用户名（唯一）
  email VARCHAR(255) UNIQUE NOT NULL,      -- 邮箱（唯一）
  password_hash VARCHAR(255) NOT NULL,     -- 密码哈希（bcrypt）
  display_name VARCHAR(100),               -- 显示名称
  avatar_url VARCHAR(500),                 -- 头像 URL
  bio TEXT,                                -- 个人简介
  role ENUM('admin', 'moderator', 'user') DEFAULT 'user',  -- 角色
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',  -- 状态
  email_verified BOOLEAN DEFAULT FALSE,    -- 邮箱是否验证
  last_login_at DATETIME,                  -- 最后登录时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 角色说明

- **admin**: 管理员
  - 全部权限
  - 管理用户、内容、系统设置
  - 删除任何内容

- **moderator**: 版主
  - 管理内容权限
  - 审核、编辑、删除内容
  - 管理评论

- **user**: 普通用户
  - 基本权限
  - 发布、编辑、删除自己的内容
  - 评论、点赞

#### 状态说明

- **active**: 正常
- **suspended**: 封禁
- **deleted**: 已删除（软删除）

### 2. user_settings 表（用户设置）

```sql
CREATE TABLE user_settings (
  user_id VARCHAR(36) PRIMARY KEY,
  theme VARCHAR(20) DEFAULT 'light',          -- 主题
  language VARCHAR(10) DEFAULT 'zh-CN',       -- 语言
  notification_enabled BOOLEAN DEFAULT TRUE,  -- 通知开关
  email_notification BOOLEAN DEFAULT TRUE,    -- 邮件通知
  settings JSON,                              -- 其他自定义设置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. user_stats 表（用户统计）

```sql
CREATE TABLE user_stats (
  user_id VARCHAR(36) PRIMARY KEY,
  article_count INT DEFAULT 0,    -- 文章数
  comment_count INT DEFAULT 0,    -- 评论数
  like_count INT DEFAULT 0,       -- 点赞数
  follower_count INT DEFAULT 0,   -- 粉丝数
  following_count INT DEFAULT 0,  -- 关注数
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. articles 表更新（关联用户）

```sql
ALTER TABLE articles
ADD COLUMN author_id VARCHAR(36),
ADD CONSTRAINT fk_author
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
```

注：保留原有的 `author` 字段（VARCHAR）用于兼容，新系统使用 `author_id`。

## 默认账号

### 管理员账号
- **用户名**: admin
- **密码**: admin123456
- **邮箱**: creepender42@outlook.com
- **角色**: admin
- ⚠️ **重要**：请在生产环境中立即修改密码！

### 测试用户
- **用户名**: testuser
- **密码**: test123456
- **邮箱**: test@fishbowl.com
- **角色**: user

## 使用方法

### 1. 运行迁移脚本

```bash
npx ts-node --project tsconfig.node.json scripts/create-users-table.ts
```

### 2. 权限检查示例

```typescript
// 检查是否是管理员
function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

// 检查是否有管理权限（管理员或版主）
function canModerate(user: User): boolean {
  return ['admin', 'moderator'].includes(user.role);
}

// 检查是否可以编辑文章
function canEditArticle(user: User, article: Article): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'moderator') return true;
  return article.author_id === user.id;
}
```

## 未来扩展

如果需要更复杂的权限系统，可以扩展为完整的 RBAC：

### roles 表（角色定义）

```sql
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSON,  -- 权限列表
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### user_roles 表（用户角色关联）

```sql
CREATE TABLE user_roles (
  user_id VARCHAR(36),
  role_id VARCHAR(36),
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  granted_by VARCHAR(36),
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

这样可以实现：
- 一个用户拥有多个角色
- 动态添加/删除角色
- 细粒度的权限控制

## 安全建议

1. **密码安全**
   - 使用 bcrypt 加密（已实现）
   - 至少 10 轮加盐
   - 定期提示用户修改密码

2. **会话管理**
   - 使用 JWT 或 Session
   - 设置合理的过期时间
   - 支持多端登录控制

3. **邮箱验证**
   - 注册后发送验证邮件
   - 未验证用户限制功能

4. **防暴力破解**
   - 登录失败次数限制
   - IP 封禁机制
   - 验证码保护

5. **操作审计**
   - 记录重要操作日志
   - 特别是管理员操作
   - 便于追踪和回溯

