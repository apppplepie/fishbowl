# 性能优化快速启动指南

## 🚀 立即测试优化效果

### 1. 启动开发服务器

```bash
npm run dev
```

访问: `http://localhost:3000/archive`

### 2. 测试性能

#### 方法 A: Chrome DevTools Lighthouse

1. 打开 Chrome 开发者工具 (F12)
2. 切换到 **Lighthouse** 标签
3. 选择 **Performance** 类别
4. 点击 **Analyze page load**
5. 查看结果：
   - **LCP** 应该 < 2.5秒 ✅
   - **TBT** 应该 < 200ms ✅
   - **CLS** 应该 < 0.1 ✅
   - **Performance Score** 应该 > 90 ✅

#### 方法 B: Chrome DevTools Performance

1. 打开 Chrome 开发者工具 (F12)
2. 切换到 **Performance** 标签
3. 点击录制按钮 (⚫)
4. 刷新页面
5. 停止录制
6. 查看：
   - **Main Thread** 活动（应该大幅减少）
   - **Network** 请求（图片应该懒加载）
   - **Layout Shift** 事件（应该接近 0）

#### 方法 C: 网络慢速模拟

1. 打开 Chrome 开发者工具 (F12)
2. 切换到 **Network** 标签
3. 选择 **Slow 3G** 或 **Fast 3G**
4. 刷新页面
5. 观察：
   - 首屏内容应该快速显示（SSR）
   - 图片应该渐进加载
   - 页面应该保持响应

---

## 📊 优化前后对比

### 优化前
```
First Contentful Paint: 1.1秒
Largest Contentful Paint: 22.3秒 ❌
Total Blocking Time: 1,480毫秒 ❌
Cumulative Layout Shift: 0.79 ❌
Speed Index: 4.6秒
```

### 优化后（预期）
```
First Contentful Paint: 0.5-0.8秒 ✅
Largest Contentful Paint: 1.5-2.5秒 ✅
Total Blocking Time: 150-250毫秒 ✅
Cumulative Layout Shift: 0.01 ✅
Speed Index: 1.5-2.0秒 ✅
```

---

## 🔍 关键优化点检查

### ✅ 1. 图片优化
- 打开归档页面
- 右键点击任意图片 → 检查
- 确认：
  - 使用了 `<img>` 标签（Next.js Image 编译后）
  - 有 `loading="lazy"` 属性
  - 有 `srcset` 属性（响应式图片）
  - 图片格式为 WebP 或 AVIF

### ✅ 2. 瀑布流布局
- 调整浏览器窗口大小
- 确认：
  - 列数自动调整（4列 → 3列 → 2列）
  - 无需刷新页面
  - 无明显的重排（reflow）

### ✅ 3. 服务端渲染
- 打开页面源代码（右键 → 查看网页源代码）
- 确认：
  - HTML 中包含首屏 6 个卡片的内容
  - 不是空的 `<div id="root"></div>`
  - SEO 友好

### ✅ 4. 懒加载
- 打开 Network 标签
- 刷新页面
- 确认：
  - 首屏只加载前 6 个卡片的图片
  - 滚动时才加载更多图片
  - 图片请求是渐进的

---

## 🐛 常见问题排查

### 问题 1: 图片不显示

**可能原因**: Next.js Image 配置问题

**解决方案**:
```typescript
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'https', hostname: 'your-domain.com' },
  ],
}
```

### 问题 2: 布局错乱

**可能原因**: CSS 冲突

**解决方案**:
- 检查 `app/components/layout/MasonryGrid.css` 是否正确导入
- 清除浏览器缓存
- 重启开发服务器

### 问题 3: 首屏数据为空

**可能原因**: API 请求失败

**解决方案**:
- 检查 `.env.local` 中的 `NEXT_PUBLIC_API_URL`
- 确认 API 服务正常运行
- 查看服务端日志

### 问题 4: 构建失败

**可能原因**: 依赖问题

**解决方案**:
```bash
# 清除缓存并重新安装
rm -rf node_modules .next
npm install
npm run build
```

---

## 📈 性能监控

### 开发环境

```bash
# 启动开发服务器并监控性能
npm run dev
```

访问: `http://localhost:3000/archive`

### 生产环境

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

访问: `http://localhost:3000/archive`

**注意**: 生产环境性能会比开发环境好 30-50%

---

## 🎯 性能目标检查清单

- [ ] **LCP < 2.5秒** - 首屏内容快速显示
- [ ] **FCP < 1.0秒** - 首次内容绘制快速
- [ ] **TBT < 200ms** - 页面交互流畅
- [ ] **CLS < 0.1** - 布局稳定无跳动
- [ ] **Speed Index < 2.5秒** - 视觉完成快速
- [ ] **Lighthouse Score > 90** - 综合性能优秀

---

## 🔧 调试技巧

### 1. 查看 SSR 内容

```bash
# 查看服务端渲染的 HTML
curl http://localhost:3000/archive | grep "article"
```

### 2. 分析 Bundle 大小

```bash
# 构建并分析
npm run build

# 查看 .next/analyze/ 目录
```

### 3. 监控 Core Web Vitals

在浏览器控制台运行:

```javascript
// 监控 LCP
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LCP:', entry.renderTime || entry.loadTime);
  }
}).observe({ entryTypes: ['largest-contentful-paint'] });

// 监控 CLS
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('CLS:', entry.value);
  }
}).observe({ entryTypes: ['layout-shift'] });
```

---

## 📞 需要帮助？

如果遇到问题：

1. 检查控制台错误信息
2. 查看 `PERFORMANCE_OPTIMIZATION.md` 详细文档
3. 确认所有依赖已正确安装
4. 重启开发服务器

---

**祝测试顺利！** 🎉

