# PageShellContext 测试验证指南

## 阶段 1 验收标准

### ✅ 1. 代码编译检查

**测试步骤：**
```bash
# 运行 TypeScript 类型检查
npm run type-check
# 或
npx tsc --noEmit
```

**预期结果：**
- ✅ 无 TypeScript 错误
- ✅ 无编译错误

---

### ✅ 2. Context 创建验证

**测试步骤：**
1. 打开任意页面（如 `/gallery` 或 `/archive`）
2. 打开浏览器开发者工具（F12）
3. 在 Console 中输入：
```javascript
// 检查 Context 是否已注册
console.log('检查 React DevTools 中的 Context Providers')
```

**预期结果：**
- ✅ 页面正常加载
- ✅ 无控制台错误
- ✅ 在 React DevTools 中可以看到 `PageShellProvider`

---

### ✅ 3. Hook 访问测试

**方法一：使用测试组件（推荐）**

1. 在任意页面中导入测试组件：
```tsx
// app/gallery/page.tsx 或任意页面
import PageShellContextTest from '@/app/components/PageShellContext.test';

export default function GalleryPage() {
  return (
    <>
      <PageShellContextTest />
      {/* 原有内容 */}
    </>
  );
}
```

2. 访问该页面，查看：
   - ✅ 页面右上角显示测试面板
   - ✅ 控制台输出测试信息
   - ✅ 无错误信息

**方法二：手动测试**

在任意组件中测试：

```tsx
'use client';

import { usePageShell } from '@/app/contexts/PageShellContext';

export default function TestComponent() {
  const { config, setConfig, resetConfig } = usePageShell();
  
  console.log('当前配置:', config);
  
  // 测试更新
  const handleTest = () => {
    setConfig({
      box1Content: <div>测试</div>,
      hideBox1: true,
    });
  };
  
  return (
    <button onClick={handleTest}>
      测试更新配置
    </button>
  );
}
```

**预期结果：**
- ✅ Hook 可以正常调用
- ✅ 可以访问 config
- ✅ 可以调用 setConfig
- ✅ 可以调用 resetConfig
- ✅ 无 "usePageShell must be used within a PageShellProvider" 错误

---

### ✅ 4. Provider 顺序验证

**测试步骤：**

1. 打开 `app/providers.tsx`
2. 检查 Provider 顺序：
   ```
   AppThemeProvider
     └─ AuthProvider
         └─ HeaderProvider
             └─ PageShellProvider  ← 应该在 HeaderProvider 之后
                 └─ ChapterLabelProvider
   ```

2. 使用 React DevTools：
   - 打开 React DevTools
   - 查看组件树
   - 确认 `PageShellProvider` 在 `HeaderProvider` 之后

**预期结果：**
- ✅ Provider 顺序正确
- ✅ PageShellProvider 在 HeaderProvider 之后
- ✅ PageShellProvider 在 ChapterLabelProvider 之前

---

### ✅ 5. 默认配置验证

**测试步骤：**

在控制台或测试组件中检查：

```typescript
const { config } = usePageShell();

// 验证默认值
console.assert(config.box1Content === null, 'box1Content 应该是 null');
console.assert(config.hideBox1 === false, 'hideBox1 应该是 false');
console.assert(config.box1BgColor === '#4CAF50', 'box1BgColor 应该是 #4CAF50');
console.assert(config.box2BgColor === '#f5f5f5', 'box2BgColor 应该是 #f5f5f5');
console.assert(config.theme === undefined, 'theme 应该是 undefined');
```

**预期结果：**
- ✅ 所有默认值正确
- ✅ 无断言错误

---

### ✅ 6. 配置更新测试

**测试步骤：**

```typescript
const { config, setConfig } = usePageShell();

// 测试部分更新
setConfig({
  box1Content: <div>新内容</div>,
  hideBox1: true,
});

// 验证更新
console.assert(config.box1Content !== null, 'box1Content 应该已更新');
console.assert(config.hideBox1 === true, 'hideBox1 应该是 true');
```

**预期结果：**
- ✅ 配置可以部分更新
- ✅ 未更新的字段保持原值
- ✅ 更新后立即生效

---

### ✅ 7. 重置配置测试

**测试步骤：**

```typescript
const { config, setConfig, resetConfig } = usePageShell();

// 先更新配置
setConfig({
  box1Content: <div>测试</div>,
  hideBox1: true,
});

// 重置配置
resetConfig();

// 验证重置
console.assert(config.box1Content === null, 'box1Content 应该重置为 null');
console.assert(config.hideBox1 === false, 'hideBox1 应该重置为 false');
```

**预期结果：**
- ✅ resetConfig 可以正常调用
- ✅ 配置重置为默认值

---

### ✅ 8. 性能优化验证

**测试步骤：**

1. 使用 React DevTools Profiler
2. 记录一次渲染
3. 检查 `PageShellProvider` 的重渲染次数
4. 更新配置，再次记录

**预期结果：**
- ✅ contextValue 使用 useMemo 优化
- ✅ 配置未变化时，Provider 不重渲染
- ✅ 只有配置变化时才触发更新

---

### ✅ 9. 错误处理测试

**测试步骤：**

在 `PageShellProvider` 外部使用 hook：

```tsx
// 在 providers.tsx 外部创建一个组件
function TestError() {
  // 这应该抛出错误
  const { config } = usePageShell();
  return <div>{config}</div>;
}
```

**预期结果：**
- ✅ 抛出明确的错误信息
- ✅ 错误信息包含 "usePageShell must be used within a PageShellProvider"

---

### ✅ 10. 多组件共享状态测试

**测试步骤：**

创建两个组件，都使用 `usePageShell`：

```tsx
function ComponentA() {
  const { config, setConfig } = usePageShell();
  return <button onClick={() => setConfig({ hideBox1: true })}>A</button>;
}

function ComponentB() {
  const { config } = usePageShell();
  return <div>{config.hideBox1 ? '隐藏' : '显示'}</div>;
}
```

**预期结果：**
- ✅ 两个组件共享同一个配置状态
- ✅ ComponentA 更新配置后，ComponentB 立即看到变化

---

## 快速测试清单

- [ ] 代码编译无错误
- [ ] Context 可以正常访问
- [ ] Hook 可以正常使用
- [ ] Provider 顺序正确
- [ ] 默认配置正确
- [ ] 配置可以更新
- [ ] 配置可以重置
- [ ] 性能优化生效
- [ ] 错误处理正确
- [ ] 多组件共享状态正常

---

## 测试通过标准

所有上述测试都应该通过，才能进入阶段 2。

如果任何测试失败，请检查：
1. `PageShellContext.tsx` 代码是否正确
2. `providers.tsx` 中 Provider 是否已注册
3. 是否有 TypeScript 类型错误
4. 是否有运行时错误

---

## 下一步

完成阶段 1 测试后，可以进入：
- **阶段 2**：创建 Shell 组件结构（不启用）

