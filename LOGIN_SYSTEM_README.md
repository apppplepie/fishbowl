# 登录系统说明

## ✨ 功能概览

已完成的登录系统功能：
- 🎭 毛玻璃遮罩层登录弹窗
- 🔐 后端 API 验证（Next.js API Routes）
- 👤 用户状态管理
- 🎯 登录成功后停留在当前页面
- 📝 注册和忘记密码页面（占位）

---

## 📂 文件结构

```
app/
├── components/
│   ├── Header.tsx              ← 集成登录按钮和用户状态
│   └── LoginModal.tsx          ← 登录弹窗组件
├── api/
│   └── auth/
│       └── login/
│           └── route.ts        ← 后端登录 API
├── register/
│   └── page.tsx               ← 注册页面（占位）
└── forgot-password/
    └── page.tsx               ← 忘记密码页面（占位）
```

---

## 🔐 测试账号

### 主要测试账号
```
用户名: A
密码: 123
```

### 其他可用账号
```
用户名: admin      密码: admin123
用户名: test       密码: test123
```

账号数据存储在：`app/api/auth/login/route.ts`

---

## 🎯 使用流程

### 1. **打开登录弹窗**
- 点击右上角"登录"按钮
- 弹出毛玻璃遮罩层登录窗口

### 2. **输入账号密码**
- 输入用户名: `A`
- 输入密码: `123`
- 可选择"记住我"

### 3. **登录成功**
- 显示成功提示
- 弹窗自动关闭
- 停留在当前页面
- Header 显示用户名（不再显示登录按钮）

### 4. **查看用户菜单**
- 点击右上角头像/用户名
- 显示下拉菜单：
  - 仪表盘
  - 个人资料
  - 退出登录

### 5. **退出登录**
- 点击"退出登录"
- 用户状态清除
- Header 恢复显示"登录"按钮

---

## 🎨 特色功能

### ✅ 毛玻璃遮罩层
```typescript
styles={{
  mask: {
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
}}
```
- 背景模糊效果
- 半透明黑色遮罩
- 现代化 UI 设计

### ✅ 全栈实现
- **前端**: React + Ant Design
- **后端**: Next.js API Routes
- **验证**: 模拟数据库查询
- **状态**: localStorage + 自定义事件

### ✅ 智能跳转
- 登录成功后停留在当前页面
- 点击"注册"跳转到注册页
- 点击"忘记密码"跳转到密码重置页

### ✅ 状态同步
- 使用 `loginStatusChanged` 自定义事件
- 跨组件实时同步登录状态
- 支持跨标签页同步（storage 事件）

---

## 🔧 后端 API 说明

### **POST /api/auth/login**

**请求体：**
```json
{
  "username": "A",
  "password": "123"
}
```

**成功响应（200）：**
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "username": "A",
    "displayName": "用户A",
    "email": "userA@example.com"
  }
}
```

**失败响应（401）：**
```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

---

## 📝 开发说明

### **如何添加新用户？**

编辑 `app/api/auth/login/route.ts`：

```typescript
const MOCK_USERS = [
  // ... 现有用户
  {
    id: 4,
    username: '新用户名',
    password: '新密码',
    displayName: '显示名称',
    email: 'email@example.com',
  },
];
```

### **如何连接真实数据库？**

1. 安装数据库客户端（如 Prisma、MongoDB）
2. 在 `route.ts` 中替换 `MOCK_USERS` 为数据库查询
3. 添加密码加密（bcrypt）
4. 实现 JWT token 或 session

示例：
```typescript
// 使用 Prisma
const user = await prisma.user.findUnique({
  where: { username },
});

// 验证密码
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

### **如何实现"记住我"功能？**

1. 后端生成长期 token
2. 存储在 cookie 中（httpOnly）
3. 设置较长的过期时间

### **如何保护 API？**

1. 添加 CSRF token
2. 使用 httpOnly cookie
3. 添加请求频率限制
4. 实现 JWT 验证

---

## 🎭 UI 组件说明

### **LoginModal 组件**

**Props:**
```typescript
interface LoginModalProps {
  open: boolean;           // 是否显示弹窗
  onClose: () => void;     // 关闭回调
  onLoginSuccess: (username: string) => void;  // 登录成功回调
}
```

**使用示例:**
```tsx
<LoginModal
  open={loginModalOpen}
  onClose={() => setLoginModalOpen(false)}
  onLoginSuccess={(username) => {
    console.log('登录成功:', username);
  }}
/>
```

---

## 🐛 常见问题

### **Q: 登录后刷新页面，状态丢失？**
A: 已使用 localStorage 持久化，不会丢失。检查是否正确实现了 `checkLoginStatus`。

### **Q: 如何在其他组件中获取登录状态？**
A: 监听 `loginStatusChanged` 事件：
```typescript
useEffect(() => {
  const handleLoginChange = () => {
    // 更新状态
  };
  window.addEventListener('loginStatusChanged', handleLoginChange);
  return () => window.removeEventListener('loginStatusChanged', handleLoginChange);
}, []);
```

### **Q: API 请求失败？**
A: 检查：
1. 开发服务器是否运行
2. API 路径是否正确（`/api/auth/login`）
3. 请求格式是否正确（JSON）

---

## 🚀 下一步计划

- [ ] 连接真实数据库
- [ ] 实现 JWT token 认证
- [ ] 完善注册功能
- [ ] 完善密码重置功能
- [ ] 添加邮箱验证
- [ ] 添加第三方登录（Google、GitHub）
- [ ] 添加验证码
- [ ] 实现权限管理

---

## 📞 技术支持

如有问题，请查看：
- `app/components/LoginModal.tsx` - 前端登录组件
- `app/api/auth/login/route.ts` - 后端 API
- `app/components/Header.tsx` - 用户状态管理

祝您使用愉快！🎉

