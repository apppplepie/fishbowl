# 🔧 修复 401 错误后直接退出登录的问题

## ❌ **问题描述**

用户点进文章页面 (`app/article/[id]/page.tsx`) 后：
1. ❌ 收到 401 错误
2. ❌ **没有触发 token 刷新**（看起来）
3. ❌ **直接被退出登录**

用户体验极差：没有任何提示，直接被踢下线。

---

## 🔍 **问题根源**

### **1. Access Token 过期时间太短**
- **之前**: 30 秒过期 ❌
- **现在**: 15 分钟过期 ✅

### **2. 刷新逻辑存在问题**

**旧的执行流程**:
```
用户请求 → 401 错误
  ↓
尝试刷新 token
  ↓
如果 refresh token 也过期 (7天)
  ↓
❌ refreshAccessToken() 清除数据 + 触发 loginStatusChanged
  ↓
❌ apiRequest() 又触发一次 loginStatusChanged
  ↓
❌ AuthContext 监听到事件 → 再次调用 /api/auth/me → 401
  ↓
❌ 清除状态，用户直接退出，没有任何提示
```

**问题点**：
1. **重复触发事件**（2 次 `loginStatusChanged`）
2. **逻辑混乱**：`apiClient` 和 `AuthContext` 都在清除数据
3. **没有提示**：用户不知道为什么被退出

---

## ✅ **解决方案**

### **1. 修正 Access Token 过期时间**

**文件**: `lib/auth.ts`

```typescript
// ✅ 已修复：从 30s 改为 15m
const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
  expiresIn: '15m', // 15分钟过期
});
```

---

### **2. 优化刷新失败的处理逻辑**

**文件**: `lib/apiClient.ts`

#### **修改前** ❌
```typescript
// 刷新失败，立即清除本地用户数据
if (typeof window !== 'undefined') {
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('username');
  window.dispatchEvent(new Event('loginStatusChanged')); // 第1次
}

// ... 在 apiRequest 中又触发一次
window.dispatchEvent(new Event('loginStatusChanged')); // 第2次（重复！）
```

#### **修改后** ✅
```typescript
// ✅ 不在这里清除数据，只发出专用事件
if (typeof window !== 'undefined') {
  window.dispatchEvent(new Event('authRefreshFailed')); // 专用事件
}
```

**关键改进**：
- ✅ 不再重复触发事件
- ✅ 使用专用事件 `authRefreshFailed`
- ✅ 清除数据的职责交给 `AuthContext` 统一处理
- ✅ 添加调试日志

---

### **3. AuthContext 统一处理刷新失败**

**文件**: `app/contexts/AuthContext.tsx`

```typescript
// 处理刷新失败（refresh token 过期）
const handleAuthRefreshFailed = () => {
  console.warn('🚪 Refresh token 已过期，清除登录状态');
  clearAuthData();
  
  // 触发全局提示
  const event = new CustomEvent('showLoginPrompt', {
    detail: { message: '登录已过期，请重新登录' }
  });
  window.dispatchEvent(event);
};

// 监听刷新失败事件
window.addEventListener('authRefreshFailed', handleAuthRefreshFailed);
```

**职责明确**：
- ✅ 统一在一个地方清除数据
- ✅ 触发用户友好的提示
- ✅ 避免重复处理

---

### **4. 添加用户友好提示**

**文件**: `app/components/Header.tsx`

```typescript
// 监听登录过期提示
useEffect(() => {
  const handleLoginPrompt = (e: Event) => {
    const customEvent = e as CustomEvent<{ message: string }>;
    message.warning(customEvent.detail?.message || '登录已过期，请重新登录', 4);
    
    // 自动打开登录弹窗
    setTimeout(() => {
      setLoginModalOpen(true);
    }, 500);
  };

  window.addEventListener('showLoginPrompt', handleLoginPrompt);
  return () => window.removeEventListener('showLoginPrompt', handleLoginPrompt);
}, []);
```

**用户体验提升**：
- ✅ 显示友好的提示消息
- ✅ 自动打开登录弹窗
- ✅ 用户知道发生了什么

---

## 📊 **修复后的流程**

### **正常情况（Access Token 过期，Refresh Token 有效）**
```
用户请求 → 401 错误
  ↓
🔄 尝试刷新 token
  ↓
✅ 刷新成功（refresh token 有效）
  ↓
✅ 自动重试原始请求
  ↓
✅ 用户无感知，继续使用
```

### **异常情况（两个 Token 都过期）**
```
用户请求 → 401 错误
  ↓
🔄 尝试刷新 token
  ↓
❌ 刷新失败（refresh token 也过期了）
  ↓
🚪 触发 authRefreshFailed 事件
  ↓
📢 AuthContext 清除数据
  ↓
📢 显示提示: "登录已过期，请重新登录"
  ↓
📢 自动打开登录弹窗
  ↓
✅ 用户知道原因，可以重新登录
```

---

## 🎯 **关键改进**

### **1. 职责分离**
- **apiClient**: 只负责发送请求和刷新 token
- **AuthContext**: 统一管理认证状态和清除逻辑
- **Header**: 负责显示用户提示

### **2. 事件系统优化**
- `loginStatusChanged`: 登录状态正常变化（登录/刷新成功）
- `authRefreshFailed`: 刷新失败专用事件（token 过期）
- `showLoginPrompt`: 显示提示专用事件

### **3. 用户体验提升**
- ✅ 清晰的日志输出（便于调试）
- ✅ 友好的错误提示
- ✅ 自动打开登录弹窗
- ✅ 避免突然退出的糟糕体验

---

## 🧪 **测试验证**

### **测试场景 1: Access Token 过期，Refresh Token 有效**
1. 等待 15 分钟（access token 过期）
2. 点击文章页面
3. **预期结果**: 
   - ✅ 控制台显示 "🔄 收到 401，尝试刷新 token..."
   - ✅ 控制台显示 "✅ Token 刷新成功"
   - ✅ 页面正常加载，用户无感知

### **测试场景 2: 两个 Token 都过期**
1. 清除 cookies 或等待 7 天（refresh token 过期）
2. 点击文章页面
3. **预期结果**:
   - ✅ 控制台显示 "⚠️ Token 刷新失败"
   - ✅ 控制台显示 "🚪 Refresh token 已过期"
   - ✅ 页面显示提示: "登录已过期，请重新登录"
   - ✅ 自动打开登录弹窗
   - ✅ 用户状态已清除

### **测试场景 3: 网络错误**
1. 断网或后端不可用
2. 点击文章页面
3. **预期结果**:
   - ✅ 控制台显示 "❌ Token refresh 请求失败"
   - ✅ 触发刷新失败处理流程

---

## 📝 **调试日志**

现在可以在控制台看到清晰的调试信息：

```
🔄 收到 401，尝试刷新 token...
✅ Token 刷新成功，重试原始请求
```

或者：

```
🔄 收到 401，尝试刷新 token...
⚠️ Token 刷新失败，refresh token 可能已过期
❌ Token 刷新失败，请求终止
🚪 Refresh token 已过期，清除登录状态
```

---

## ✅ **总结**

### **已修复问题**
1. ✅ Access token 过期时间从 30秒 → 15分钟
2. ✅ 避免重复触发事件和重复清除数据
3. ✅ 职责分离，逻辑更清晰
4. ✅ 添加用户友好提示
5. ✅ 自动打开登录弹窗
6. ✅ 添加详细的调试日志

### **用户体验提升**
- ✅ 不再突然退出登录
- ✅ 知道为什么被退出
- ✅ 方便快速重新登录
- ✅ 开发者可以通过日志快速定位问题

### **代码质量提升**
- ✅ 单一职责原则
- ✅ 事件系统清晰
- ✅ 易于维护和调试
- ✅ 避免副作用

