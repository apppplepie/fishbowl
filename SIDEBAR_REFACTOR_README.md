# 侧边栏组件重构文档

## 概述

本次重构将原有的8个高度相似的侧边栏组件抽象为**2个通用组件 + 配置化参数**，大幅减少代码重复，提升可维护性。

## 重构前的问题

原有8个组件存在以下问题：
- 大量重复代码（状态管理、菜单构建、样式等）
- 每个组件约300-400行代码
- 修改逻辑需要同步修改多个文件
- 难以维护和扩展

### 原有组件列表
1. `ArchiveCategorySidebar.tsx` - 文章分类侧边栏
2. `ArchiveCategoryDrawer.tsx` - 文章分类抽屉
3. `BookCategorySidebar.tsx` - 书籍分类侧边栏
4. `BookCategoryDrawer.tsx` - 书籍分类抽屉
5. `ArticleIndexSidebar.tsx` - 文章索引侧边栏
6. `ArticleIndexDrawer.tsx` - 文章索引抽屉
7. `ChapterIndexSidebar.tsx` - 章节索引侧边栏
8. `ChapterIndexDrawer.tsx` - 章节索引抽屉

## 重构后的架构

### 核心组件

#### 1. `GenericCategoryTree.tsx` - 通用分类树组件
**用途**：显示纯分类树结构（不包含文章）

**配置项**：
```typescript
interface GenericCategoryTreeConfig {
  apiEndpoint: string;           // API接口路径
  rootNodeId?: string;            // 根节点ID（可选）
  rootNodeName?: string;          // 根节点显示名称
  emptyText?: string;             // 空状态提示文字
  loadChildrenForTopLevel?: boolean; // 是否为顶级分类加载子分类
  forceOpenRootKeys?: boolean;    // 禁止关闭根节点
  navigationPattern?: string;     // 跳转路径模板
  stylePrefix?: string;           // CSS类名前缀
}
```

**适用场景**：
- Archive分类导航（从根分类开始）
- Book分类导航（从书橱`cat_bookcase`开始）

#### 2. `GenericIndexTree.tsx` - 通用索引树组件
**用途**：显示分类+文章的混合树结构

**配置项**：
```typescript
interface GenericIndexTreeConfig {
  apiEndpoint: string;                    // API接口路径
  startCategoryId?: string;               // 起始分类ID
  emptyText?: string;                     // 空状态提示文字
  forceOpenRootKeys?: boolean;            // 禁止关闭根节点
  categoryNavigationPattern?: string;     // 分类跳转路径模板
  articleNavigationPattern?: string;      // 文章跳转路径模板
  stylePrefix?: string;                   // CSS类名前缀
  showArticleCount?: boolean;             // 是否显示文章数量
  dataFormat?: 'tree-with-articles' | 'flat-tree'; // 数据格式
  findBookRoot?: boolean;                 // 是否查找书籍根节点
}
```

**适用场景**：
- Article索引导航（显示所有文章）
- Chapter索引导航（显示特定书籍的章节）

#### 3. `GenericTreeSidebar.tsx` - 通用侧边栏包装器
简单的容器组件，用于桌面端固定侧边栏显示。

#### 4. `GenericTreeDrawer.tsx` - 通用抽屉包装器
包含Drawer逻辑和打开按钮，用于移动端抽屉显示。

**导出**：
- `GenericTreeDrawer` - 抽屉组件
- `TreeDrawerButton` - 统一的抽屉打开按钮

## 使用示例

### 示例1：Archive分类侧边栏
```typescript
const config: GenericCategoryTreeConfig = {
  apiEndpoint: '/api/categories/tree',
  emptyText: '暂无目录',
  forceOpenRootKeys: true,
  navigationPattern: '/archive?category={categoryId}',
  stylePrefix: 'archive-category-sidebar'
};

<GenericCategoryTree
  config={config}
  selectedCategoryId={selectedCategoryId}
  onCategorySelect={onCategorySelect}
/>
```

### 示例2：Book分类抽屉
```typescript
const config: GenericCategoryTreeConfig = {
  apiEndpoint: '/api/categories?type=children&parentId=cat_bookcase',
  rootNodeId: 'cat_bookcase',
  rootNodeName: '书橱',
  emptyText: '暂无书籍',
  loadChildrenForTopLevel: true,
  forceOpenRootKeys: true,
  navigationPattern: '/bookcase?category={categoryId}',
  stylePrefix: 'book-category-drawer'
};

<GenericTreeDrawer open={visible} onClose={onClose} size={320}>
  <GenericCategoryTree
    config={config}
    selectedCategoryId={selectedCategoryId}
    onCategorySelect={handleCategorySelect}
  />
</GenericTreeDrawer>
```

### 示例3：Article索引侧边栏
```typescript
const config: GenericIndexTreeConfig = {
  apiEndpoint: '/api/categories/tree-with-articles',
  emptyText: '暂无文章',
  forceOpenRootKeys: true,
  categoryNavigationPattern: '/archive?category={categoryId}',
  articleNavigationPattern: '/article/{articleId}',
  stylePrefix: 'article-index-sidebar',
  showArticleCount: true,
  dataFormat: 'tree-with-articles'
};

<GenericIndexTree
  config={config}
  currentArticleId={currentArticleId}
  onArticleClick={onArticleClick}
  onCategoryClick={onCategoryClick}
/>
```

### 示例4：Chapter索引抽屉
```typescript
const config: GenericIndexTreeConfig = {
  apiEndpoint: '/api/categories/{id}/tree-with-articles',
  startCategoryId: bookCategoryId,
  emptyText: '暂无内容',
  forceOpenRootKeys: false,
  categoryNavigationPattern: '/bookcase?category={categoryId}',
  articleNavigationPattern: '/book/{articleId}',
  stylePrefix: 'chapter-index-drawer',
  showArticleCount: false,
  dataFormat: 'flat-tree',
  findBookRoot: true
};

<GenericTreeDrawer open={open} onClose={onClose} size={280}>
  <GenericIndexTree
    config={config}
    currentArticleId={currentArticleId}
    onArticleClick={handleArticleClick}
    onCategoryClick={handleCategoryClick}
  />
</GenericTreeDrawer>
```

## 重构成果

### 代码量对比
| 组件类型 | 重构前 | 重构后 | 减少 |
|---------|--------|--------|------|
| ArchiveCategorySidebar | 265行 | 25行 | 90.6% ↓ |
| ArchiveCategoryDrawer | 279行 | 35行 | 87.5% ↓ |
| BookCategorySidebar | 307行 | 25行 | 91.9% ↓ |
| BookCategoryDrawer | 376行 | 40行 | 89.4% ↓ |
| ArticleIndexSidebar | 341行 | 30行 | 91.2% ↓ |
| ArticleIndexDrawer | 66行 | 40行 | 39.4% ↓ |
| ChapterIndexSidebar | 379行 | 35行 | 90.8% ↓ |
| ChapterIndexDrawer | 68行 | 45行 | 33.8% ↓ |
| **总计** | **2081行** | **~675行** | **67.6% ↓** |

### 优势
✅ **减少重复代码**：从2081行减少到约675行，减少67.6%  
✅ **提升可维护性**：修改核心逻辑只需修改通用组件  
✅ **增强扩展性**：新增类似组件只需配置，无需重写  
✅ **统一样式和行为**：所有组件使用相同的样式和交互逻辑  
✅ **类型安全**：完整的TypeScript类型定义  

## 组件分类逻辑

### 第一组：Category类型（纯分类树）
- ArchiveCategorySidebar + ArchiveCategoryDrawer
- BookCategorySidebar + BookCategoryDrawer

**特征**：
- 只显示分类树，不包含文章
- 用于分类筛选
- 使用 `GenericCategoryTree`

**差异点**：
- Archive从根分类开始
- Book从`cat_bookcase`（书橱）开始，需要加载子分类

### 第二组：Index类型（分类+文章混合）
- ArticleIndexSidebar + ArticleIndexDrawer
- ChapterIndexSidebar + ChapterIndexDrawer

**特征**：
- 显示分类+文章的树形结构
- 既能点击分类也能点击文章
- 使用 `GenericIndexTree`

**差异点**：
- ArticleIndex从根分类开始，加载所有文章
- ChapterIndex从特定书籍开始，需要查找书籍根节点

## 注意事项

1. **API格式兼容性**：
   - `tree-with-articles`格式：传统格式，返回 `{ data: Category[] }`
   - `flat-tree`格式：新格式，返回 `{ data: { flat: TreeNode[], tree: TreeNode[] } }`

2. **样式隔离**：
   - 每个组件通过`stylePrefix`配置独立的CSS类名前缀
   - 避免样式冲突

3. **导航模式**：
   - 使用`{categoryId}`和`{articleId}`作为占位符
   - 支持自定义跳转路径

4. **回调优先**：
   - 如果提供了`onCategorySelect`或`onArticleClick`回调，优先使用回调
   - 否则使用配置的`navigationPattern`进行路由跳转

## 未来扩展

如果需要新增类似的侧边栏组件，只需：
1. 确定是Category类型还是Index类型
2. 创建配置对象
3. 使用对应的通用组件
4. 10-40行代码即可完成

无需再编写300+行重复代码！

