# 路由守卫说明

## 📌 当前状态：已禁用

路由守卫功能已被暂时禁用，但所有文件都已保留，随时可以重新启用。

---

## 🔐 路由守卫文件位置

### 1. **Middleware 守卫**（服务器端）
- 文件：`middleware.ts.disabled`
- 状态：已禁用（重命名为 .disabled）
- 作用：服务器端拦截请求，重定向未登录用户

### 2. **Layout 守卫**（客户端）
- 文件：`app/(protected)/layout.tsx`
- 状态：已禁用（代码已注释）
- 作用：客户端检查登录状态，控制页面渲染

### 3. **受保护的页面**
- `app/(protected)/dashboard/page.tsx` - 仪表盘
- `app/(protected)/profile/page.tsx` - 个人资料
- 当前可以直接访问，无需登录

### 4. **登录页面**
- 文件：`app/login/page.tsx`
- 状态：正常可用
- 功能：模拟登录（localStorage）

---

## 🚀 如何重新启用路由守卫

### **方案一：启用 Middleware 守卫（推荐生产环境）**

1. **重命名文件**
   ```bash
   move middleware.ts.disabled middleware.ts
   ```

2. **重启开发服务器**
   ```bash
   npm run dev
   ```

3. **效果**
   - 访问 `/dashboard` 或 `/profile` 会自动重定向到 `/login`
   - 服务器端拦截，最安全

---

### **方案二：启用 Layout 守卫（适合开发调试）**

1. **编辑 `app/(protected)/layout.tsx`**
   
   取消注释以下部分：

   ```typescript
   // 取消注释顶部的导入
   import { useEffect } from 'react';
   import { useRouter } from 'next/navigation';
   import { Spin } from 'antd';

   // 取消注释 useAuth 函数
   function useAuth() {
     const isLoggedIn = typeof window !== 'undefined' 
       ? localStorage.getItem('isLoggedIn') === 'true'
       : false;
     
     const isLoading = false;
     
     return { isLoggedIn, isLoading };
   }
   ```

   然后在 `ProtectedLayout` 函数中取消注释守卫逻辑。

2. **保存文件**（开发服务器会自动刷新）

3. **效果**
   - 访问 `/dashboard` 或 `/profile` 会显示加载动画后重定向到 `/login`
   - 客户端拦截，可以使用 React Hooks

---

## 📝 两种方案对比

| 特性 | Middleware 守卫 | Layout 守卫 |
|------|----------------|-------------|
| **执行环境** | 服务器端 | 客户端 |
| **安全性** | ⭐⭐⭐⭐⭐ 最高 | ⭐⭐⭐ 中等 |
| **性能** | ⭐⭐⭐⭐⭐ 最好 | ⭐⭐⭐⭐ 较好 |
| **用户体验** | 无闪烁，直接重定向 | 可能有短暂加载 |
| **灵活性** | 不能使用 Hooks | 可以使用 Hooks |
| **适用场景** | 生产环境 | 开发调试 |

---

## 🎯 推荐使用方式

### **开发阶段**
- 使用 Layout 守卫（方案二）
- 方便调试，可以快速禁用/启用

### **生产环境**
- 使用 Middleware 守卫（方案一）
- 配合真实的 JWT token 或 cookie
- 后端 API 验证

---

## 🔧 如何测试路由守卫

1. **确保已退出登录**
   ```javascript
   localStorage.removeItem('isLoggedIn');
   ```

2. **访问受保护页面**
   ```
   http://localhost:3000/dashboard
   http://localhost:3000/profile
   ```

3. **预期行为**
   - 如果守卫启用：重定向到 `/login?redirect=/dashboard`
   - 如果守卫禁用：直接显示页面内容

4. **登录后测试**
   - 访问 `/login`
   - 输入任意用户名密码
   - 登录成功后会跳转回原页面

---

## 📚 相关文件

```
fishbowl/
├── middleware.ts.disabled      ← Middleware 守卫（已禁用）
├── app/
│   ├── (protected)/           ← 受保护的路由组
│   │   ├── layout.tsx         ← Layout 守卫（已禁用）
│   │   ├── dashboard/
│   │   │   └── page.tsx       ← 仪表盘页面
│   │   └── profile/
│   │       └── page.tsx       ← 个人资料页面
│   ├── login/
│   │   └── page.tsx           ← 登录页面
│   └── components/
│       └── Header.tsx         ← Header 组件（支持登录状态）
└── ROUTE_GUARD_README.md      ← 本说明文件
```

---

## 💡 提示

- 路由守卫文件都已保留，随时可以重新启用
- 当前所有页面（包括 dashboard 和 profile）都可以直接访问
- 登录功能仍然可用，只是不会强制要求登录

---

## ❓ 需要帮助？

如果需要重新启用路由守卫或有任何问题，请参考本文档或咨询开发人员。

