# 认证系统使用文档

## 📚 系统概览

基于 JWT (JSON Web Token) 的用户认证系统，支持注册、登录、Token验证。

## 🔑 已创建的组件

### 1. 后端 API

#### 注册接口
**POST** `/api/auth/register`

请求体：
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "123456",
  "display_name": "张三"  // 可选
}
```

响应：
```json
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "display_name": "张三",
    "role": "user"
  }
}
```

#### 登录接口
**POST** `/api/auth/login`

请求体：
```json
{
  "username": "zhangsan",  // 或邮箱
  "password": "123456"
}
```

响应：同注册接口

#### 获取当前用户
**GET** `/api/auth/me`

请求头：
```
Authorization: Bearer <token>
```

响应：
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "display_name": "张三",
    "avatar_url": null,
    "bio": null,
    "role": "user",
    "email_verified": false,
    "created_at": "2024-12-02T10:00:00Z"
  }
}
```

### 2. 前端组件

- **LoginModal** (`app/components/LoginModal.tsx`) - 登录弹窗
- **RegisterPage** (`app/register/page.tsx`) - 注册页面

### 3. 工具函数

`lib/auth.ts` 提供以下工具：

```typescript
// 生成 Token
generateToken(payload: JWTPayload): string

// 验证 Token
verifyToken(token: string): JWTPayload | null

// 从请求中提取 Token
extractToken(req: NextRequest): string | null

// 获取当前用户
getCurrentUser(req: NextRequest): JWTPayload | null

// 权限检查
hasRole(user, ['admin', 'moderator']): boolean
isAdmin(user): boolean
canModerate(user): boolean
```

## 🚀 使用指南

### 前端：发送需要认证的请求

```typescript
// 1. 从 localStorage 获取 token
const token = localStorage.getItem('token');

// 2. 在请求头中携带 token
const response = await fetch('/api/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: '我的文章',
    content: '...'
  }),
});
```

### 后端：验证用户身份

```typescript
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // 1. 获取当前用户
  const currentUser = getCurrentUser(req);
  
  // 2. 检查是否登录
  if (!currentUser) {
    return NextResponse.json(
      { error: '请先登录' },
      { status: 401 }
    );
  }
  
  // 3. 检查权限（可选）
  if (currentUser.role !== 'admin') {
    return NextResponse.json(
      { error: '权限不足' },
      { status: 403 }
    );
  }
  
  // 4. 执行业务逻辑
  // 现在你知道是 currentUser.id 这个用户在操作
  const body = await req.json();
  
  // 创建文章，作者是当前用户
  await createArticle({
    ...body,
    author_id: currentUser.id,
  });
  
  return NextResponse.json({ success: true });
}
```

## 🔐 安全注意事项

### 1. JWT Secret

当前使用默认密钥，**生产环境必须修改**：

创建 `.env.local` 文件：
```bash
JWT_SECRET=your-super-secret-key-change-me
```

生成强随机密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. HTTPS

- 生产环境必须使用 HTTPS
- 前端发送明文密码是安全的（HTTPS 加密传输）

### 3. Token 过期

当前设置为 7 天：
```typescript
jwt.sign(payload, secret, { expiresIn: '7d' })
```

可根据需求调整：
- `'15m'` - 15分钟
- `'1h'` - 1小时
- `'7d'` - 7天
- `'30d'` - 30天

### 4. 密码强度

注册时已验证：
- 最少 6 个字符
- 建议：至少 8 个字符，包含字母、数字、特殊字符

## 📝 数据流程

### 注册流程

```
用户填写表单
    ↓
前端: POST /api/auth/register
    ↓
后端: 
  1. 验证数据（唯一性、格式等）
  2. bcrypt.hash(password) → 密码哈希
  3. 存入数据库（users表）
  4. generateToken() → JWT Token
    ↓
前端:
  1. localStorage.setItem('token', token)
  2. localStorage.setItem('user', user)
  3. 跳转到首页
```

### 登录流程

```
用户输入账号密码
    ↓
前端: POST /api/auth/login
    ↓
后端:
  1. 查询用户（by username or email）
  2. bcrypt.compare(输入密码, 数据库哈希)
  3. 验证通过 → generateToken()
  4. 更新 last_login_at
    ↓
前端:
  1. localStorage.setItem('token', token)
  2. localStorage.setItem('user', user)
  3. 刷新页面
```

### 认证流程

```
用户操作（发布文章等）
    ↓
前端: 
  token = localStorage.getItem('token')
  POST /api/articles
  Headers: { Authorization: `Bearer ${token}` }
    ↓
后端:
  1. extractToken(req) → token
  2. verifyToken(token) → user info
  3. 验证通过 → 执行操作
  4. 验证失败 → 返回 401
```

## 🛠️ 常见问题

### Q: Token 存在哪里？
A: `localStorage`，键名为 `'token'` 和 `'user'`

### Q: Token 什么时候失效？
A: 7天后自动失效，或用户手动登出（清除 localStorage）

### Q: 如何登出？
```typescript
localStorage.removeItem('token');
localStorage.removeItem('user');
window.location.reload();
```

### Q: 如何检查是否登录？
```typescript
const isLoggedIn = !!localStorage.getItem('token');
```

### Q: 如何获取当前用户信息？
```typescript
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
```

### Q: 如何刷新Token？
当前未实现自动刷新，Token过期后需重新登录。

未来可实现 Refresh Token 机制。

## 📊 测试账号

系统已创建两个测试账号：

1. **管理员**
   - 用户名: `admin`
   - 密码: `admin123456`
   - 角色: admin

2. **普通用户**
   - 用户名: `testuser`
   - 密码: `test123456`
   - 角色: user

## 🎯 下一步

### 推荐实现

1. **退出登录功能**
   - 清除 localStorage
   - 刷新页面

2. **受保护的路由**
   - 使用中间件保护特定页面
   - 未登录自动跳转登录

3. **更新 useAuth Hook**
   - 统一管理登录状态
   - 自动读取 localStorage

4. **文章 API 集成**
   - 发布文章时传入 token
   - 服务器验证并获取 author_id

5. **评论系统集成**
   - 评论时传入 token
   - 服务器获取 user_id

### 可选扩展

1. **Refresh Token**
   - 长期刷新token
   - 短期访问token

2. **邮箱验证**
   - 发送验证邮件
   - 激活账号

3. **忘记密码**
   - 邮件重置密码

4. **第三方登录**
   - OAuth（GitHub、Google等）

5. **Session管理**
   - 查看所有登录设备
   - 远程登出

## 🔗 相关文件

- `USER_TABLE_DESIGN.md` - 用户表设计
- `COMMENTS_SYSTEM_DESIGN.md` - 评论系统设计
- `lib/auth.ts` - 认证工具函数
- `app/api/auth/` - 认证API
- `app/components/LoginModal.tsx` - 登录弹窗
- `app/register/page.tsx` - 注册页面

