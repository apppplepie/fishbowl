# JWT 认证系统迁移完成

## ✅ 已更新的文件

### 1. **核心认证 Hook**
- `app/hooks/useAuth.ts` ⭐
  - 从 localStorage 读取 `token` 和 `user`
  - 返回完整的 User 对象（包含 id, username, email, role 等）
  - 新增 `isAdmin()` 和 `canModerate()` 方法
  - 新增 `getToken()` 方法用于 API 请求
  - 兼容旧版本（保留 username 属性）

### 2. **受保护的路由**
- `app/(protected)/layout.tsx`
  - 启用路由守卫
  - 使用新的 `useAuth()` hook
  - 未登录自动跳转到首页

- `app/(protected)/dashboard/page.tsx`
  - 使用新的 `useAuth()` hook
  - 显示完整的用户信息（display_name, role）
  - 使用 `logout()` 方法退出登录

### 3. **文章详情页**
- `app/article/[id]/page.tsx`
  - 权限控制：只有作者、管理员、版主可见编辑按钮
  - 使用 `user.username` 比对作者
  - 使用 `user.role` 检查权限
  - 修复 `avatar_url` 字段名称

### 4. **其他页面（已确认兼容）**
- `app/components/Header.tsx` ✅
- `app/components/NavigationDrawer.tsx` ✅
- `app/components/UserMenu.tsx` ✅
- `app/components/LoginModal.tsx` ✅
- `app/publish-article/page.tsx` ✅
- `app/components/GalleryPublishFloat.tsx` ✅
- `app/components/CommentSection.tsx` ✅

## 🔄 迁移对比

### 旧系统（已废弃）
```typescript
// ❌ 旧方式
localStorage.getItem('isLoggedIn');
localStorage.getItem('username');
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('username', 'zhangsan');
```

### 新系统（当前使用）
```typescript
// ✅ 新方式
const { isLoggedIn, user, token, getToken } = useAuth();

// user 对象结构
{
  id: 'uuid',
  username: 'zhangsan',
  email: 'zhangsan@example.com',
  display_name: '张三',
  avatar_url: 'https://...',
  role: 'user' | 'admin' | 'moderator'
}

// localStorage 存储
localStorage.getItem('token');     // JWT Token
localStorage.getItem('user');      // JSON 字符串
```

## 📊 权限系统

### 角色定义
- **admin**: 管理员（全部权限）
- **moderator**: 版主（管理内容）
- **user**: 普通用户（管理自己的内容）

### 权限检查
```typescript
// 检查是否是管理员
const { isAdmin } = useAuth();
if (isAdmin()) {
  // 管理员功能
}

// 检查是否有管理权限
const { canModerate } = useAuth();
if (canModerate()) {
  // 管理员或版主功能
}

// 检查是否是作者本人
if (article.author === user?.username) {
  // 作者功能
}

// 组合权限检查
if (article.author === user?.username || 
    user?.role === 'admin' || 
    user?.role === 'moderator') {
  // 作者、管理员或版主可执行
}
```

## 🔐 安全改进

### 前端（已实现）
1. ✅ 基于 JWT Token 的认证
2. ✅ Token 自动过期（7天）
3. ✅ 完整的用户信息管理
4. ✅ 基于角色的权限控制
5. ✅ 路由守卫（受保护的页面）

### 后端（需要实现）
1. ⚠️ API 端点的 Token 验证
2. ⚠️ 权限检查（作者、角色）
3. ⚠️ 敏感操作的二次验证

## 🎯 使用指南

### 获取当前用户信息
```typescript
import { useAuth } from '@/app/hooks/useAuth';

function MyComponent() {
  const { isLoggedIn, user } = useAuth();
  
  if (!isLoggedIn) {
    return <div>请先登录</div>;
  }
  
  return (
    <div>
      <p>用户名: {user?.username}</p>
      <p>昵称: {user?.display_name}</p>
      <p>角色: {user?.role}</p>
    </div>
  );
}
```

### 发送认证请求
```typescript
import { useAuth } from '@/app/hooks/useAuth';

function MyComponent() {
  const { getToken } = useAuth();
  
  const publishArticle = async (data) => {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    
    return response.json();
  };
}
```

### 退出登录
```typescript
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';

function MyComponent() {
  const { logout } = useAuth();
  const router = useRouter();
  
  const handleLogout = () => {
    logout();
    router.push('/');
  };
}
```

## 📝 注意事项

### 1. 兼容性
- ✅ 新的 `useAuth` hook 保留了 `username` 属性用于向后兼容
- ✅ 所有组件都已更新，不再使用旧的 localStorage 方式
- ✅ 登出时会清除新旧两套 localStorage 数据

### 2. Token 管理
- Token 存储在 `localStorage.getItem('token')`
- 用户信息存储在 `localStorage.getItem('user')`（JSON 字符串）
- Token 过期时间：7天
- 过期后需要重新登录

### 3. 路由保护
- `app/(protected)/` 目录下的所有页面都需要登录
- 未登录会自动跳转到首页
- 已启用路由守卫

### 4. 权限控制
- 前端权限控制用于用户体验（隐藏按钮）
- **重要**：后端必须实现真正的权限验证
- 不要仅依赖前端权限控制

## 🚀 下一步

### 推荐实现
1. **后端权限验证**
   - 文章编辑/删除 API 添加权限检查
   - 评论发布 API 验证用户身份
   - 敏感操作的权限控制

2. **Token 刷新机制**
   - Refresh Token 实现
   - 自动刷新过期 Token
   - 无感知续期

3. **安全增强**
   - API 速率限制
   - CSRF 保护
   - XSS 防护

### 可选扩展
1. 用户头像上传
2. 个人资料编辑
3. 密码修改功能
4. 邮箱验证
5. 找回密码
6. 第三方登录（OAuth）

## 📚 相关文档

- `AUTH_SYSTEM_README.md` - 认证系统完整文档
- `USER_TABLE_DESIGN.md` - 用户表设计
- `COMMENTS_SYSTEM_DESIGN.md` - 评论系统设计

## ✨ 迁移完成清单

- ✅ useAuth Hook 更新完成
- ✅ 受保护的路由更新完成
- ✅ Dashboard 页面更新完成
- ✅ 文章详情页权限控制完成
- ✅ 所有旧的 localStorage 逻辑已清理
- ✅ Linter 错误已修复
- ✅ 向后兼容性已确保

🎉 **迁移完成！系统现在使用基于 JWT 的现代化认证系统！**

