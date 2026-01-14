# PageShell 迁移指南

## 📋 概述

本指南说明如何将现有页面迁移到新的 PageShell 架构。新架构的核心特性：

- ✅ **全局主题自动应用** - 不需要每个页面传递主题
- ✅ **侧边栏自动偏移** - PageShell 自动处理侧边栏展开/收起
- ✅ **Box1 组件库** - 封装常见场景（面包屑、搜索栏等）
- ✅ **直接内容渲染** - 无闭包问题，状态实时更新

---

## 🎯 迁移前后对比

### ❌ 旧架构（PageLayout）

```typescript
function ArticlePage() {
  const { currentFishbowlTheme } = useAppTheme(); // 需要手动获取主题
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  return (
    <>
      <UnifiedNavigator ... />
      
      {/* 需要手动处理偏移 */}
      <div style={{ marginLeft: sidebarExpanded ? '280px' : '0' }}>
        <PageLayout
          theme={currentFishbowlTheme}  // 需要手动传递主题
          box1Content={
            <div style={{ padding: '16px 24px' }}>
              {/* 复杂的面包屑代码... */}
              <Breadcrumb items={[...]} />
            </div>
          }
        >
          {/* 内容 */}
        </PageLayout>
      </div>
    </>
  );
}
```

### ✅ 新架构（PageShell）

```typescript
import { BreadcrumbBox1 } from '@/app/components/box1';

function ArticlePage() {
  const { setConfig } = usePageShell();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [categoryPath, setCategoryPath] = useState([]);
  
  // 配置 PageShell
  useEffect(() => {
    setConfig({
      box1Content: (
        <BreadcrumbBox1 
          type="article" 
          articleId={params.id}
          categoryPath={categoryPath}
        />
      ),
      sidebarWidth: 280,
      sidebarExpanded,
    });
  }, [params.id, categoryPath, sidebarExpanded]);
  
  return (
    <>
      <UnifiedNavigator 
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />
      
      {/* 内容直接渲染，PageShell 自动处理偏移 */}
      <div>文章内容</div>
    </>
  );
}
```

---

## 📦 Box1 组件库使用

### 1. BreadcrumbBox1 - 面包屑导航

#### 文章页面示例

```typescript
import { BreadcrumbBox1 } from '@/app/components/box1';

useEffect(() => {
  setConfig({
    box1Content: (
      <BreadcrumbBox1 
        type="article"
        articleId={articleId}
        categoryPath={[
          { id: 'cat_1', name: '技术' },
          { id: 'cat_2', name: 'React' },
        ]}
      />
    ),
    sidebarWidth: 280,
    sidebarExpanded,
  });
}, [articleId, categoryPath, sidebarExpanded]);
```

#### 书籍页面示例

```typescript
useEffect(() => {
  setConfig({
    box1Content: (
      <BreadcrumbBox1 
        type="book"
        categoryPath={[
          { id: 'cat_bookcase', name: '编程' },
          { id: 'book_1', name: 'React 实战' },
        ]}
      />
    ),
    sidebarWidth: 280,
    sidebarExpanded,
  });
}, [categoryPath, sidebarExpanded]);
```

#### 自定义面包屑

```typescript
useEffect(() => {
  setConfig({
    box1Content: (
      <BreadcrumbBox1 
        type="custom"
        customItems={[
          { title: '首页', onClick: () => router.push('/') },
          { title: '关于', onClick: () => router.push('/about') },
          { title: '团队' }, // 无点击，当前页面
        ]}
      />
    ),
  });
}, []);
```

### 2. SearchBox1 - 搜索栏

#### Archive 页面示例

```typescript
import { SearchBox1 } from '@/app/components/box1';

const [searchText, setSearchText] = useState('');
const [typeFilter, setTypeFilter] = useState('all');
const [sortBy, setSortBy] = useState('date');

useEffect(() => {
  setConfig({
    box1Content: (
      <SearchBox1
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索文章..."
        filters={[
          {
            label: '类型',
            value: typeFilter,
            options: [
              { label: '全部', value: 'all' },
              { label: '文章', value: 'article' },
              { label: '图片', value: 'drawing' },
            ],
            onChange: setTypeFilter,
          },
          {
            label: '排序',
            value: sortBy,
            options: [
              { label: '最新', value: 'date' },
              { label: '最热', value: 'popular' },
            ],
            onChange: setSortBy,
          },
        ]}
      />
    ),
    sidebarWidth: 280,
    sidebarExpanded,
  });
}, [searchText, typeFilter, sortBy, sidebarExpanded]);
```

#### 带自定义操作的搜索栏

```typescript
useEffect(() => {
  setConfig({
    box1Content: (
      <SearchBox1
        searchValue={searchText}
        onSearchChange={setSearchText}
        filters={[...]}
        actions={
          <Button 
            type="primary"
            onClick={() => handleExport()}
          >
            导出
          </Button>
        }
      />
    ),
  });
}, [searchText]);
```

### 3. TitleBox1 - 简单标题

```typescript
import { TitleBox1 } from '@/app/components/box1';

useEffect(() => {
  setConfig({
    box1Content: (
      <TitleBox1 
        title="我的花园"
        subtitle="种植你的数字植物"
      />
    ),
  });
}, []);
```

### 4. EmptyBox1 - 空占位

```typescript
import { EmptyBox1 } from '@/app/components/box1';

useEffect(() => {
  setConfig({
    box1Content: <EmptyBox1 />,
    hideBox1: false, // Box1 显示但内容为空
  });
}, []);
```

---

## 🔄 完整迁移步骤

### 步骤 1：启用 PageShell

在 `GlobalLayout.tsx` 中为目标路由启用 PageShell：

```typescript
// app/components/GlobalLayout.tsx
const ENABLE_PAGE_SHELL = pathname === '/gallery' 
  || pathname.startsWith('/article/')
  || pathname.startsWith('/book/')
  || pathname === '/archive'
  || pathname === '/bookcase';
```

### 步骤 2：移除旧的 PageLayout

删除页面中的 PageLayout 相关代码：

```typescript
// ❌ 删除这些
import PageLayout from '@/app/components/PageLayout';
const { currentFishbowlTheme } = useAppTheme();

// ❌ 删除 PageLayout 包装
<PageLayout theme={...} box1Content={...}>
  ...
</PageLayout>
```

### 步骤 3：添加 PageShell 配置

```typescript
// ✅ 添加这些
import { usePageShell } from '@/app/contexts/PageShellContext';
import { BreadcrumbBox1 } from '@/app/components/box1';

const { setConfig } = usePageShell();
const [sidebarExpanded, setSidebarExpanded] = useState(false);

useEffect(() => {
  setConfig({
    box1Content: <BreadcrumbBox1 type="article" ... />,
    sidebarWidth: 280,
    sidebarExpanded,
  });
  
  return () => {
    setConfig({ box1Content: null });
  };
}, [sidebarExpanded, ...]);
```

### 步骤 4：移除手动偏移

删除手动处理侧边栏偏移的代码：

```typescript
// ❌ 删除这个
<div style={{ marginLeft: sidebarExpanded ? '280px' : '0' }}>
  ...
</div>

// ✅ 直接渲染内容
<div>
  ...
</div>
```

### 步骤 5：更新侧边栏配置

确保侧边栏状态与 PageShell 同步：

```typescript
<UnifiedNavigator
  expanded={sidebarExpanded}
  onExpandedChange={setSidebarExpanded} // 重要：状态同步
  ...
/>
```

---

## 📝 具体页面迁移示例

### Article Page (`article/[id]/page.tsx`)

<details>
<summary>点击查看完整示例</summary>

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { BreadcrumbBox1 } from '@/app/components/box1';
import UnifiedNavigator from '@/app/components/sidebar/UnifiedNavigator';
import { useResponsive } from '@/app/hooks/useResponsive';

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { isMobile } = useResponsive();
  const { setConfig } = usePageShell();
  
  const [article, setArticle] = useState(null);
  const [categoryPath, setCategoryPath] = useState([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // 配置 PageShell
  useEffect(() => {
    if (categoryPath.length > 0) {
      setConfig({
        box1Content: (
          <BreadcrumbBox1 
            type="article"
            articleId={params.id as string}
            categoryPath={categoryPath}
          />
        ),
        sidebarWidth: 280,
        sidebarExpanded,
      });
    }
    
    return () => {
      setConfig({ box1Content: null });
    };
  }, [params.id, categoryPath, sidebarExpanded, setConfig]);
  
  // 获取文章数据...
  useEffect(() => {
    // fetchArticle...
  }, [params.id]);
  
  return (
    <>
      {/* 侧边栏 */}
      <UnifiedNavigator
        treeConfig={{
          apiEndpoint: '/api/categories/tree-with-articles',
          // ... 其他配置
        }}
        currentArticleId={params.id as string}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />
      
      {/* 主内容 - 直接渲染，PageShell 自动处理偏移 */}
      <div>
        <h1>{article?.title}</h1>
        {/* 文章内容... */}
      </div>
    </>
  );
}
```

</details>

### Archive Page (`archive/page.tsx`)

<details>
<summary>点击查看完整示例</summary>

```typescript
'use client';

import { useState, useEffect } from 'react';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { SearchBox1 } from '@/app/components/box1';
import UnifiedNavigator from '@/app/components/sidebar/UnifiedNavigator';

export default function ArchivePage() {
  const { setConfig } = usePageShell();
  
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  // 配置搜索栏
  useEffect(() => {
    setConfig({
      box1Content: (
        <SearchBox1
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="搜索文章、笔记..."
          filters={[
            {
              label: '类型',
              value: typeFilter,
              options: [
                { label: '全部', value: 'all' },
                { label: '文章', value: 'article' },
                { label: '笔记', value: 'note' },
              ],
              onChange: setTypeFilter,
            },
          ]}
        />
      ),
      sidebarWidth: 280,
      sidebarExpanded,
    });
    
    return () => {
      setConfig({ box1Content: null });
    };
  }, [searchText, typeFilter, sidebarExpanded, setConfig]);
  
  return (
    <>
      <UnifiedNavigator
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        ...
      />
      
      <div>
        {/* 文章列表... */}
      </div>
    </>
  );
}
```

</details>

---

## 🐛 常见问题

### Q1: 为什么侧边栏展开/收起没有动画？

**A:** 确保在 `setConfig` 中同步 `sidebarExpanded` 状态：

```typescript
useEffect(() => {
  setConfig({
    sidebarWidth: 280,
    sidebarExpanded, // ← 必须同步
  });
}, [sidebarExpanded]); // ← 添加依赖
```

### Q2: Box1 内容不更新？

**A:** 检查 useEffect 的依赖项，确保包含所有动态数据：

```typescript
useEffect(() => {
  setConfig({
    box1Content: <BreadcrumbBox1 categoryPath={categoryPath} />,
  });
}, [categoryPath]); // ← 添加 categoryPath 依赖
```

### Q3: 如何在没有侧边栏的页面使用 PageShell？

**A:** 不设置 `sidebarWidth` 和 `sidebarExpanded`，或设置为 0：

```typescript
useEffect(() => {
  setConfig({
    box1Content: <TitleBox1 title="我的页面" />,
    sidebarWidth: 0, // 无侧边栏
  });
}, []);
```

### Q4: 如何自定义 Box1 样式？

**A:** 使用 `box1Style` 或直接在组件中传递 `style` prop：

```typescript
setConfig({
  box1Content: (
    <BreadcrumbBox1 
      type="article"
      style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
    />
  ),
  box1Style: { minHeight: '120px' }, // 全局样式
});
```

---

## ✅ 迁移检查清单

- [ ] 在 GlobalLayout 中启用 PageShell
- [ ] 删除 PageLayout 导入和使用
- [ ] 删除手动主题传递代码
- [ ] 添加 usePageShell hook
- [ ] 使用 Box1 组件库或自定义内容
- [ ] 配置侧边栏宽度和状态
- [ ] 删除手动偏移代码
- [ ] 同步侧边栏状态到 setConfig
- [ ] 测试侧边栏展开/收起动画
- [ ] 测试主题切换
- [ ] 测试移动端响应式

---

## 📚 API 参考

### PageShellConfig

```typescript
interface PageShellConfig {
  box1Content: ReactNode | null;        // Box1 内容
  hideBox1?: boolean;                   // 是否隐藏 Box1
  box1Style?: CSSProperties;            // Box1 样式
  box2Style?: CSSProperties;            // Box2 样式
  themeOverride?: Theme;                // 主题覆盖（可选）
  sidebarWidth?: number;                // 侧边栏宽度（默认 0）
  sidebarExpanded?: boolean;            // 侧边栏是否展开
}
```

### usePageShell Hook

```typescript
const { config, setConfig, resetConfig } = usePageShell();

// setConfig - 更新配置（合并）
setConfig({ box1Content: <div>...</div> });

// resetConfig - 重置为默认配置
resetConfig();
```

---

## 🎉 完成！

迁移完成后，你的页面将自动获得：
- ✅ 全局主题自动应用
- ✅ 侧边栏流畅动画
- ✅ 简洁的代码结构
- ✅ 更好的可维护性

如有问题，请参考 `app/gallery/page.tsx` 作为参考实现。

