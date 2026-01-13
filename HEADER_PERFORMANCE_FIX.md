# Header 组件无限循环修复说明

## 问题根源

"Maximum update depth exceeded" 错误是由以下原因导致的：

### 1. **selectedKeys 每次都是新数组**
```tsx
// ❌ 错误：每次渲染都创建新数组
<Menu selectedKeys={[pathname]} />
```
每次渲染时，`[pathname]` 都会创建一个新的数组引用，即使 `pathname` 值相同，React 也会认为 props 发生了变化，触发重新渲染。

### 2. **每个 menuItem 都有独立的 onClick 闭包**
```tsx
// ❌ 错误：每个 item 都创建新的函数
items={items.map(item => ({
  key: item.path,
  onClick: () => router.push(item.path), // 每次都是新函数
}))}
```
每个菜单项都有自己的 `onClick` 函数，每次渲染都会创建新的函数引用，导致 Menu 组件认为所有 props 都变了。

### 3. **menuItems 数组每次都是新引用**
即使内容相同，`buildMenuItems()` 每次调用都返回新数组，导致 Menu 的 `items` prop 引用变化。

### 4. **style 对象每次都是新引用**
```tsx
// ❌ 错误：每次渲染都创建新对象
<div style={{ padding: '0 24px' }} />
```

### 5. **Context value 每次都是新对象**
```tsx
// ❌ 错误：每次渲染都创建新对象
<HeaderContext.Provider value={{ leftContent, setLeftContent }}>
```
这会导致所有使用 `useHeader()` 的组件每次都收到新的 context 值。

## 修复方案

### 1. **使用 useMemo 固定 selectedKeys**
```tsx
// ✅ 正确：只在 pathname 变化时创建新数组
const selectedKeys = useMemo(() => [pathname], [pathname]);
<Menu selectedKeys={selectedKeys} />
```

### 2. **统一使用 Menu 的 onClick**
```tsx
// ✅ 正确：只有一个稳定的回调函数
const handleMenuClick = useCallback((info: { key: string }) => {
  const key = info?.key;
  if (key && key !== pathname) {
    router.push(key);
  }
}, [router, pathname]);

<Menu onClick={handleMenuClick} items={menuItems} />
```

### 3. **使用 useMemo 缓存 menuItems**
```tsx
// ✅ 正确：只在依赖变化时重新计算
const menuItems = useMemo(() => {
  // ... 构建逻辑
}, [isMobile, windowWidth, pathname, isLoggedIn, getIcon]);
```

### 4. **使用 useMemo 固定 style 对象**
```tsx
// ✅ 正确：只在依赖变化时创建新对象
const headerStyle = useMemo(() => ({
  padding: isMobile ? '0 12px' : '0 24px',
  // ...
}), [isMobile]);
```

### 5. **使用 useMemo 固定 Context value**
```tsx
// ✅ 正确：只在 leftContent 变化时创建新对象
const contextValue = useMemo(
  () => ({ leftContent, setLeftContent }),
  [leftContent]
);
<HeaderContext.Provider value={contextValue}>
```

## 为什么这些修复能立即生效？

### React 的引用相等性检查
React 使用 `Object.is()` 来比较 props。即使两个对象的内容完全相同，如果引用不同，React 也会认为 props 发生了变化：

```tsx
const obj1 = { a: 1 };
const obj2 = { a: 1 };
Object.is(obj1, obj2); // false - 引用不同

// 但在 useMemo 中：
const obj3 = useMemo(() => ({ a: 1 }), []);
const obj4 = useMemo(() => ({ a: 1 }), []);
// obj3 和 obj4 在依赖不变时是同一个引用
```

### React.memo 的工作原理
`React.memo` 会对 props 进行浅比较（shallow comparison）：

```tsx
// 如果 props 引用相同，组件不会重新渲染
React.memo(Header, (prevProps, nextProps) => {
  // 默认使用 Object.is 比较每个 prop
  return Object.is(prevProps.leftContent, nextProps.leftContent);
});
```

### 无限循环的触发链
1. Header 渲染 → 创建新的 `selectedKeys` 数组
2. Menu 检测到 props 变化 → 触发内部状态更新
3. Menu 的状态更新 → 触发父组件重新渲染
4. 回到步骤 1，形成无限循环

通过 `useMemo` 固定引用，打破了循环：
1. Header 渲染 → `selectedKeys` 引用不变（如果 pathname 没变）
2. Menu 检测到 props 相同 → 不更新
3. 循环终止 ✅

## 性能优化清单

- [x] `selectedKeys` 使用 `useMemo`
- [x] `menuItems` 使用 `useMemo`
- [x] 所有 `style` 对象使用 `useMemo`
- [x] 所有回调函数使用 `useCallback`
- [x] `HeaderContext` value 使用 `useMemo`
- [x] `Header` 组件使用 `React.memo`
- [x] `GlobalLayout` 组件使用 `React.memo`
- [x] `getIcon` 函数使用 `useCallback`

## 进一步优化建议

### 1. 使用 React Profiler 验证
```tsx
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log('Component:', id, 'Phase:', phase, 'Duration:', actualDuration);
}

<Profiler id="Header" onRender={onRenderCallback}>
  <Header />
</Profiler>
```

### 2. 检查其他可能的问题源
- 确保 `useAuth()` 返回的值是稳定的
- 确保 `useResponsive()` 返回的值是稳定的
- 检查是否有其他 Context 也返回新对象

### 3. 使用 React DevTools Profiler
1. 打开 React DevTools
2. 切换到 Profiler 标签
3. 点击 Record
4. 执行一些操作
5. 停止录制
6. 查看哪些组件渲染次数最多、耗时最长

## 总结

这些修复的核心思想是：**保持引用稳定**。只有当真正需要更新的数据变化时，才创建新的引用。这样可以：

1. 让 `React.memo` 发挥作用
2. 减少不必要的重新渲染
3. 提高应用性能
4. 避免无限循环

