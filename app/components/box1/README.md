# Box1 组件库

封装常见的 Box1 场景，简化 PageShell 使用。

## 📦 组件列表

### BreadcrumbBox1
面包屑导航组件，支持文章、书籍、自定义等多种类型。

```typescript
import { BreadcrumbBox1 } from '@/app/components/box1';

<BreadcrumbBox1 
  type="article"
  articleId={articleId}
  categoryPath={[
    { id: 'cat_1', name: '技术' },
    { id: 'cat_2', name: 'React' },
  ]}
/>
```

### SearchBox1
搜索栏组件，支持搜索框 + 多个筛选器 + 自定义操作。

```typescript
import { SearchBox1 } from '@/app/components/box1';

<SearchBox1
  searchValue={searchText}
  onSearchChange={setSearchText}
  filters={[
    {
      label: '类型',
      value: typeFilter,
      options: [{ label: '全部', value: 'all' }],
      onChange: setTypeFilter,
    },
  ]}
/>
```

### TitleBox1
简单标题组件。

```typescript
import { TitleBox1 } from '@/app/components/box1';

<TitleBox1 title="我的页面" subtitle="描述文字" />
```

### EmptyBox1
空占位组件，用于不需要显示内容的场景。

```typescript
import { EmptyBox1 } from '@/app/components/box1';

<EmptyBox1 />
```

## 📚 详细文档

查看 [PAGESHELL_MIGRATION_GUIDE.md](../../../PAGESHELL_MIGRATION_GUIDE.md) 了解完整使用方法。

