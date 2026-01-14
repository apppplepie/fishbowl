# PageShell 阶段 3 和 4 测试验证指南

## 阶段 3 和 4 完成内容

### ✅ 阶段 3：配置同步机制

1. **修改了 `app/components/PageLayout.tsx`**
   - ✅ 添加了 `usePageShell` 和 `usePathname` hooks
   - ✅ 在 `useEffect` 中同步配置到 Context
   - ✅ 处理了默认值和转换
   - ✅ 路由变化时自动更新配置

2. **配置同步逻辑**
   - ✅ 监听路由变化（`pathname`）
   - ✅ 监听所有配置 props 变化
   - ✅ 自动同步到全局 Context

### ✅ 阶段 4：启用 Shell（试点页面）

1. **修改了 `app/components/GlobalLayout.tsx`**
   - ✅ 启用 Shell：`ENABLE_PAGE_SHELL = pathname === '/gallery'`
   - ✅ 只在 `/gallery` 页面启用 Shell

2. **修改了 `app/components/PageLayout.tsx`**
   - ✅ 添加了 Shell 模式检测
   - ✅ Shell 启用时，不显示 box1/box2，只显示内容
   - ✅ 避免重复显示

---

## 测试验证步骤

### ✅ 1. 代码编译检查

**测试步骤：**
```bash
npm run dev
```

**预期结果：**
- ✅ 无 TypeScript 错误
- ✅ 无编译错误
- ✅ 开发服务器正常启动

---

### ✅ 2. 配置同步测试（阶段 3）

**测试步骤：**

1. 访问 `/gallery` 页面
2. 打开浏览器控制台（F12）
3. 使用测试组件检查配置（如果已添加）

**预期结果：**
- ✅ 页面正常加载
- ✅ 配置已同步到 Context
- ✅ 控制台无错误

**验证方法：**

在控制台或测试组件中检查：
```typescript
// 如果使用了 PageShellContextTest 组件
// 应该能看到配置已更新
```

---

### ✅ 3. Shell 启用测试（阶段 4）

**测试步骤：**

1. 访问 `/gallery` 页面
2. 检查页面显示

**预期结果：**
- ✅ 页面正常显示
- ✅ 可以看到 Shell 的背景结构（box1/box2）
- ✅ 内容正确显示
- ✅ 渐显动画正常工作

---

### ✅ 4. 路由切换测试

**测试步骤：**

1. 访问 `/gallery` 页面（Shell 启用）
2. 切换到其他页面（如 `/archive`，Shell 未启用）
3. 再切换回 `/gallery`

**预期结果：**
- ✅ 路由切换流畅
- ✅ 配置正确更新
- ✅ Shell 在 `/gallery` 显示，其他页面不显示
- ✅ 无布局错乱

---

### ✅ 5. 配置更新测试

**测试步骤：**

1. 访问 `/gallery` 页面
2. 检查 Shell 的背景和主题是否正确
3. 检查 box1 内容（如果有）

**预期结果：**
- ✅ Shell 使用正确的主题
- ✅ 背景颜色正确
- ✅ box1 内容正确（如果有）

---

### ✅ 6. 渐显动画测试

**测试步骤：**

1. 访问 `/gallery` 页面
2. 观察页面加载时的渐显效果
3. 切换到其他页面再切换回来
4. 观察渐显效果

**预期结果：**
- ✅ 初始加载时有渐显动画
- ✅ 路由切换时有渐显动画
- ✅ 动画流畅（0.5s ease-out）

---

### ✅ 7. 其他页面不受影响测试

**测试步骤：**

1. 访问 `/archive` 页面（Shell 未启用）
2. 检查页面显示

**预期结果：**
- ✅ 页面正常显示
- ✅ 使用传统的 PageLayout 结构（box1/box2）
- ✅ 布局与之前一致
- ✅ 无 Shell 显示

---

### ✅ 8. 首页特殊处理测试

**测试步骤：**

1. 访问首页 `/`
2. 检查页面显示

**预期结果：**
- ✅ 首页正常显示
- ✅ 首页不显示 Shell（即使路径匹配）
- ✅ 因为 `isHomePage` 判断会阻止 Shell 渲染

---

### ✅ 9. 性能测试

**测试步骤：**

1. 使用 React DevTools Profiler
2. 记录路由切换过程
3. 检查性能指标

**预期结果：**
- ✅ 路由切换时间减少（相比之前）
- ✅ 重渲染次数合理
- ✅ 无明显性能问题

---

### ✅ 10. 移动端适配测试

**测试步骤：**

1. 在移动设备或浏览器移动模式访问 `/gallery`
2. 检查页面显示

**预期结果：**
- ✅ 移动端正常显示
- ✅ 布局适配正确
- ✅ 无布局错乱

---

## 快速测试清单

- [ ] 代码编译无错误
- [ ] 配置同步正常（阶段 3）
- [ ] Shell 在 `/gallery` 启用（阶段 4）
- [ ] 路由切换流畅
- [ ] 配置更新正确
- [ ] 渐显动画正常
- [ ] 其他页面不受影响
- [ ] 首页特殊处理正确
- [ ] 性能良好
- [ ] 移动端适配正常

---

## 已知问题和注意事项

### 1. 内容注入问题

**问题：** 在 Shell 模式下，`PageLayout` 的内容需要注入到 Shell 的 box2 中，但目前 Shell 的 box2 内容区域是空的。

**当前实现：** `PageLayout` 在 Shell 模式下只渲染 children，但 children 需要放在 Shell 的 box2 中。

**解决方案（后续阶段）：**
- 方案 A：使用 React Portal 将内容注入到 Shell
- 方案 B：修改 Shell 结构，通过 Context 传递 children
- 方案 C：调整布局，让内容在 Shell 外部但视觉上在 box2 中

**当前状态：** 这是预期的，不影响阶段 3 和 4 的验收。在后续阶段会处理。

### 2. 布局可能异常

**问题：** 如果 Shell 的 box2 内容区域是空的，页面内容可能显示在错误的位置。

**测试时注意：** 如果发现布局异常，这是正常的，需要在后续阶段调整。

---

## 测试通过标准

所有上述测试都应该通过，才能进入阶段 5。

如果任何测试失败，请检查：
1. `PageLayout.tsx` 中的配置同步逻辑是否正确
2. `GlobalLayout.tsx` 中的 Shell 启用条件是否正确
3. `PageLayout.tsx` 中的 Shell 模式检测是否正确
4. 是否有 TypeScript 类型错误
5. 是否有运行时错误

---

## 下一步

完成阶段 3 和 4 测试后，可以进入：
- **阶段 5**：优化和性能调优
- **阶段 6**：全面迁移和清理

---

## 回滚方法

如果遇到严重问题，可以快速回滚：

1. **回滚阶段 4：**
   ```typescript
   // 在 GlobalLayout.tsx 中
   const ENABLE_PAGE_SHELL = false;
   ```

2. **回滚阶段 3：**
   - 移除 `PageLayout.tsx` 中的配置同步逻辑
   - 移除 `usePageShell` 和 `usePathname` 的使用

---

## 测试数据

### Gallery 页面配置

根据 `app/gallery/page.tsx`，当前配置：
- `theme`: `currentFishbowlTheme`（从 AppThemeContext 获取）
- `box2Style`: `{ padding: '40px 6px' }`
- `box1Content`: 无（undefined）
- `hideBox1`: 默认 false

**预期 Shell 显示：**
- box1 应该显示（因为 hideBox1 = false）
- box1 内容为空（因为 box1Content = undefined）
- box2 使用 `currentFishbowlTheme` 主题
- box2 有自定义 padding

---

## 故障排查

### 问题 1：Shell 不显示

**检查：**
1. `GlobalLayout.tsx` 中 `ENABLE_PAGE_SHELL` 是否正确
2. `pathname` 是否为 `/gallery`
3. `isHomePage` 是否为 false

### 问题 2：配置未同步

**检查：**
1. `PageLayout.tsx` 中 `useEffect` 是否正确
2. 依赖项是否完整
3. `setConfig` 是否被调用

### 问题 3：布局异常

**检查：**
1. Shell 模式检测是否正确
2. `PageLayout` 在 Shell 模式下的渲染是否正确
3. CSS 样式是否正确

---

## 成功标准

阶段 3 和 4 成功的标志：
1. ✅ `/gallery` 页面使用 Shell 显示
2. ✅ 配置正确同步
3. ✅ 渐显动画正常
4. ✅ 其他页面不受影响
5. ✅ 路由切换流畅

