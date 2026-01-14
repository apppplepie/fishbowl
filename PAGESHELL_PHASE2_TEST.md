# PageShell 阶段 2 测试验证指南

## 阶段 2 完成内容

### ✅ 已完成的工作

1. **创建了 `app/components/PageShell.tsx`**
   - ✅ 从 `PageLayout` 提取了 box1/box2 结构
   - ✅ 使用 `usePageShell` 读取配置
   - ✅ 实现了渐显动画（opacity transition）
   - ✅ 使用 `React.memo` 优化性能

2. **修改了 `app/components/GlobalLayout.tsx`**
   - ✅ 导入了 `PageShell` 组件
   - ✅ 添加了条件渲染（默认 `ENABLE_PAGE_SHELL = false`）
   - ✅ 确保首页不显示 Shell

---

## 测试验证步骤

### ✅ 1. 代码编译检查

**测试步骤：**
```bash
# 运行 TypeScript 类型检查
npm run type-check
# 或
npx tsc --noEmit

# 运行开发服务器
npm run dev
```

**预期结果：**
- ✅ 无 TypeScript 错误
- ✅ 无编译错误
- ✅ 开发服务器正常启动

---

### ✅ 2. 页面正常加载（Shell 未启用）

**测试步骤：**
1. 启动开发服务器
2. 访问任意页面（如 `/gallery`、`/archive`）
3. 检查页面是否正常显示

**预期结果：**
- ✅ 页面正常加载
- ✅ 无白屏
- ✅ 无控制台错误
- ✅ 页面布局与之前一致（因为 Shell 未启用）

---

### ✅ 3. Shell 组件创建验证

**测试步骤：**

1. 打开 `app/components/PageShell.tsx`
2. 检查组件结构：
   - ✅ 导入了 `usePageShell` hook
   - ✅ 导入了 `SkySection`、`WaterSection`、`WaveSeparator`
   - ✅ 有 `processBg` 函数
   - ✅ 有 `defaultTheme` 创建逻辑
   - ✅ 有渐显动画逻辑（`isVisible` 状态）
   - ✅ 使用 `React.memo` 包装

**预期结果：**
- ✅ 所有必要的导入都存在
- ✅ 组件结构完整
- ✅ 代码无语法错误

---

### ✅ 4. GlobalLayout 修改验证

**测试步骤：**

1. 打开 `app/components/GlobalLayout.tsx`
2. 检查：
   - ✅ 导入了 `PageShell`
   - ✅ 有 `ENABLE_PAGE_SHELL` 常量（值为 `false`）
   - ✅ 有条件渲染：`{!isHomePage && ENABLE_PAGE_SHELL && <PageShell />}`

**预期结果：**
- ✅ 导入正确
- ✅ 条件渲染逻辑正确
- ✅ Shell 默认不显示（因为 `ENABLE_PAGE_SHELL = false`）

---

### ✅ 5. 功能开关测试

**测试步骤：**

1. 在 `GlobalLayout.tsx` 中，临时将 `ENABLE_PAGE_SHELL` 改为 `true`
2. 访问非首页页面（如 `/gallery`）
3. 检查页面显示

**预期结果：**
- ✅ 页面可以加载（虽然可能布局异常，因为配置未同步）
- ✅ 可以看到 Shell 结构（box1/box2 背景）
- ✅ 控制台可能有警告，但不应该有错误

**注意：** 测试完成后，记得将 `ENABLE_PAGE_SHELL` 改回 `false`

---

### ✅ 6. 首页特殊处理验证

**测试步骤：**

1. 访问首页 `/`
2. 检查页面显示

**预期结果：**
- ✅ 首页正常显示
- ✅ 首页不显示 Shell（即使 `ENABLE_PAGE_SHELL = true`）
- ✅ 因为 `isHomePage` 判断会阻止 Shell 渲染

---

### ✅ 7. Context 集成验证

**测试步骤：**

1. 在 `PageShell.tsx` 中，检查是否使用了 `usePageShell`
2. 检查是否从 Context 读取配置：
   - `config.box1Content`
   - `config.theme`
   - `config.hideBox1`
   - `config.box1Style`
   - `config.box2Style`
   - `config.box1BgColor`
   - `config.box2BgColor`

**预期结果：**
- ✅ 正确使用 `usePageShell` hook
- ✅ 所有配置都从 Context 读取
- ✅ 无直接使用 props 的情况

---

### ✅ 8. 渐显动画逻辑验证

**测试步骤：**

1. 检查 `PageShell.tsx` 中的渐显动画逻辑：
   - ✅ 有 `isVisible` 状态
   - ✅ 有 `useEffect` 监听配置变化
   - ✅ 有 `opacity` 和 `transition` 样式

**预期结果：**
- ✅ 渐显动画逻辑完整
- ✅ 配置更新时会触发渐显
- ✅ 初始加载时也会触发渐显

---

### ✅ 9. 性能优化验证

**测试步骤：**

1. 检查 `PageShell.tsx`：
   - ✅ 使用 `React.memo` 包装组件
   - ✅ 使用 `useMemo` 缓存 `defaultTheme`

**预期结果：**
- ✅ 组件已使用 `React.memo` 优化
- ✅ `defaultTheme` 使用 `useMemo` 缓存
- ✅ 避免不必要的重新计算

---

### ✅ 10. 代码结构验证

**测试步骤：**

1. 对比 `PageShell.tsx` 和 `PageLayout.tsx`：
   - ✅ box1/box2 结构已提取
   - ✅ `processBg` 函数已提取
   - ✅ `defaultTheme` 创建逻辑已提取

**预期结果：**
- ✅ 结构提取完整
- ✅ 逻辑保持一致
- ✅ 代码可读性好

---

## 快速测试清单

- [ ] 代码编译无错误
- [ ] 页面正常加载（Shell 未启用）
- [ ] Shell 组件创建成功
- [ ] GlobalLayout 修改正确
- [ ] 功能开关正常工作（默认 false）
- [ ] 首页特殊处理正确
- [ ] Context 集成正确
- [ ] 渐显动画逻辑完整
- [ ] 性能优化已应用
- [ ] 代码结构正确

---

## 测试通过标准

所有上述测试都应该通过，才能进入阶段 3。

如果任何测试失败，请检查：
1. `PageShell.tsx` 代码是否正确
2. `GlobalLayout.tsx` 中导入和条件渲染是否正确
3. 是否有 TypeScript 类型错误
4. 是否有运行时错误

---

## 注意事项

1. **Shell 默认不启用**：`ENABLE_PAGE_SHELL = false`，所以页面显示应该与之前完全一致
2. **首页特殊处理**：首页不会显示 Shell，即使启用
3. **配置未同步**：在阶段 2，`PageLayout` 还没有同步配置到 Context，所以即使启用 Shell，内容也不会显示（这是正常的）

---

## 下一步

完成阶段 2 测试后，可以进入：
- **阶段 3**：实现配置同步机制（让 PageLayout 同步配置到 Context）

---

## 已知问题（阶段 2 不处理）

1. **children 内容未处理**：Shell 中的 box2 内容区域是空的，因为页面内容还没有注入机制（将在后续阶段处理）
2. **配置未同步**：`PageLayout` 还没有将配置同步到 Context（将在阶段 3 处理）

这些是预期的，不影响阶段 2 的验收。

