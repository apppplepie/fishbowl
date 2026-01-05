# 🔧 修复 AuthContext 中 401 不触发刷新的问题

## ❌ **问题描述**

用户反馈：
```json
{"success":false,"error":"未登录或token已过期"}
```

- ❌ **收到 401 错误，但没有触发 token 刷新**
- ❌ **账号也没有退出**（停留在中间状态）

---

## 🔍 **问题根源**

### **AuthContext 直接使用 `fetch` 而不是 `apiClient`**

**问题代码** (`app/contexts/AuthContext.tsx`):

```typescript
// ❌ 直接使用 fetch，不会触发自动刷新机制
const response = await fetch('/api/auth/me', {
  credentials: 'include',
});
```

**后果**：
1. `/api/auth/me` 返回 401 时，不会自动调用 `refreshAccessToken()`
2. 直接进入错误处理，清除登录状态
3. 用户看到 401 错误，但没有尝试刷新 token

---

## ✅ **解决方案**

### **1. AuthContext 使用 `apiGet` 代替 `fetch`**

**修改文件**: `app/contexts/AuthContext.tsx`

#### **修改前** ❌
```typescript
const response = await fetch('/api/auth/me', {
  credentials: 'include',
});
```

#### **修改后** ✅
```typescript
import { apiGet } from '@/lib/apiClient';

// 使用 apiGet，自动处理 401 和 token 刷新
const response = await apiGet('/api/auth/me');
```

**效果**：
- ✅ 收到 401 时，自动调用 `refreshAccessToken()`
- ✅ 刷新成功后，自动重试 `/api/auth/me` 请求
- ✅ 最终返回正确的用户信息

---

### **2. 优化刷新成功的事件逻辑**

**修改文件**: `lib/apiClient.ts`

#### **修改前** ❌
```typescript
if (data.success) {
  console.log('✅ Token 刷新成功');
  // 触发事件，导致 AuthContext 再次调用 /api/auth/me
  window.dispatchEvent(new Event('loginStatusChanged'));
  return true;
}
```

**问题**：
- 刷新成功后触发 `loginStatusChanged` 事件
- AuthContext 监听到事件，再次调用 `checkLoginStatus()`
- 再次请求 `/api/auth/me`（不必要的重复请求）

#### **修改后** ✅
```typescript
if (data.success) {
  console.log('✅ Token 刷新成功');
  // 不触发事件，后续请求会自动使用新 token
  return true;
}
```

**效果**：
- ✅ 刷新成功后，新 token 已存入 cookie
- ✅ 当前请求会自动重试，使用新 token
- ✅ 不会触发不必要的重复请求

---

## 📊 **修复后的完整流程**

### **场景 1: Access Token 过期，Refresh Token 有效**

```
用户请求 → apiGet('/api/auth/me') → 401 错误
  ↓
🔄 自动调用 refreshAccessToken()
  ↓
📡 POST /api/auth/refresh → 200 OK
  ↓
✅ 新的 access-token 和 refresh-token 写入 cookie
  ↓
🔄 自动重试原始请求 → apiGet('/api/auth/me')
  ↓
✅ 200 OK，返回用户信息
  ↓
✅ 更新 AuthContext 状态
  ↓
✅ 用户无感知，页面正常显示
```

### **场景 2: Refresh Token 也过期**

```
用户请求 → apiGet('/api/auth/me') → 401 错误
  ↓
🔄 自动调用 refreshAccessToken()
  ↓
📡 POST /api/auth/refresh → 401 Unauthorized
  ↓
⚠️ refresh token 也过期了
  ↓
🚨 触发 authRefreshFailed 事件
  ↓
🚪 AuthContext 清除登录状态
  ↓
📢 显示提示: "登录已过期，请重新登录"
  ↓
🔓 自动打开登录弹窗
  ↓
✅ 用户重新登录
```

---

## 🎯 **关键改进**

### **1. 统一使用 apiClient**
- ✅ 所有 API 请求都使用 `apiGet`/`apiPost` 等封装函数
- ✅ 自动处理 401 和 token 刷新
- ✅ 不需要在每个地方重复写刷新逻辑

### **2. 事件系统优化**
- `loginStatusChanged`: **只在登录/登出时触发**（用户主动操作）
- `authRefreshFailed`: **只在刷新失败时触发**（需要用户重新登录）
- 刷新成功时：**不触发任何事件**（静默处理）

### **3. 避免重复请求**
- 刷新成功后，当前请求自动重试
- 不需要再次主动调用 API 验证
- 减少不必要的网络请求

---

## 🧪 **测试验证**

### **测试步骤**

1. **清除浏览器 cookies**（模拟 token 过期）
2. **打开开发者工具 → Network 面板**
3. **刷新页面或访问需要登录的页面**

### **预期结果**

**控制台输出**：
```
🔄 收到 401，尝试刷新 token...
✅ Token 刷新成功
✅ Token 刷新成功，重试原始请求
```

**Network 面板**：
```
GET  /api/auth/me       → 401 Unauthorized
POST /api/auth/refresh  → 200 OK
GET  /api/auth/me       → 200 OK (重试，成功)
```

**页面效果**：
- ✅ 页面正常显示，用户信息正确
- ✅ 没有看到任何错误提示
- ✅ 用户无感知

### **如果 Refresh Token 也过期**

**控制台输出**：
```
🔄 收到 401，尝试刷新 token...
⚠️ Token 刷新失败，refresh token 可能已过期
❌ Token 刷新失败，请求终止
🚪 Refresh token 已过期，清除登录状态
```

**页面效果**：
- ✅ 显示提示: "登录已过期，请重新登录"
- ✅ 自动打开登录弹窗
- ✅ 用户可以重新登录

---

## 📝 **代码变更总结**

### **修改的文件**

1. ✅ `app/contexts/AuthContext.tsx`
   - 导入 `apiGet` 
   - 将 `fetch` 改为 `apiGet`
   - 清理错误处理逻辑

2. ✅ `lib/apiClient.ts`
   - 移除刷新成功后的 `loginStatusChanged` 事件
   - 保留刷新失败的 `authRefreshFailed` 事件

### **不需要修改的文件**

- ✅ 其他使用 `useAuth` 的组件（完全兼容）
- ✅ 其他使用 `apiClient` 的代码（继续正常工作）

---

## ✅ **总结**

### **问题**
- AuthContext 直接用 `fetch`，401 不触发刷新
- 刷新成功后触发不必要的事件，导致重复请求

### **修复**
- AuthContext 改用 `apiGet`，自动处理 401 和刷新
- 优化事件逻辑，避免重复请求

### **效果**
- ✅ 401 自动触发刷新，用户无感知
- ✅ 减少不必要的网络请求
- ✅ 刷新失败时有友好提示
- ✅ 逻辑清晰，易于维护

---

**修复完成！** 🎉

