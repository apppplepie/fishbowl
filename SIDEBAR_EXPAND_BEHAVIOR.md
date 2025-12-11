# 侧边栏展开行为优化

## 📅 更新日期
2025-12-10

## 🎯 功能说明

优化了所有目录侧边栏和抽屉的展开行为，现在支持**只展开当前文章的完整路径**，其他分类保持折叠状态，让界面更加简洁清晰。

## ✨ 新功能特性

### 1. 智能展开当前文章路径

当打开某篇文章时：
- ✅ 自动展开该文章所在的所有父级分类
- ✅ 其他不相关的分类保持折叠状态
- ✅ 用户可以手动展开/折叠其他分类

### 2. 灵活的配置选项

新增 `defaultOpenMode` 配置，支持三种展开模式：

#### `'current-article-path'` （推荐，已设为默认）
- 只展开当前文章的路径
- 其他分类保持折叠
- 界面更清爽，易于导航

#### `'all'`
- 展开所有分类
- 适合需要浏览整个目录结构的场景

#### `'none'`
- 全部折叠
- 最简洁的展示方式

## 📝 使用方式

### 配置示例

```typescript
const config: GenericIndexTreeConfig = {
  apiEndpoint: '/api/categories/{id}/tree-with-articles',
  startCategoryId: bookCategoryId,
  // ... 其他配置 ...
  defaultOpenMode: 'current-article-path', // 新增配置
};
```

### 应用场景

#### 1. 章节索引侧边栏/抽屉（书籍阅读）
```typescript
// ChapterIndexSidebar.tsx
defaultOpenMode: 'current-article-path'
```
**效果**：只显示当前章节的路径，便于专注阅读

#### 2. 文章目录侧边栏/抽屉（文章浏览）
```typescript
// ArticleIndexSidebar.tsx
defaultOpenMode: 'current-article-path'
```
**效果**：只显示当前文章的分类路径

#### 3. 如果需要展开所有
```typescript
defaultOpenMode: 'all'
```
**效果**：展开整个目录树，便于浏览

## 🔄 动态展开行为

### 初次加载
根据 `defaultOpenMode` 和 `currentArticleId` 决定展开哪些分类

### 切换文章
当用户切换到另一篇文章时：
- 自动展开新文章的路径
- 保留用户手动展开的其他分类
- 不会强制折叠用户已展开的分类

## 🎨 实现细节

### 核心函数

#### `findArticleAncestorKeys()`
查找文章的所有祖先分类keys

```typescript
/**
 * 查找文章的所有祖先分类keys（用于只展开当前文章的路径）
 */
const findArticleAncestorKeys = (data: any[], articleId: string): string[]
```

**工作原理**：
1. 在数据中找到指定的文章节点
2. 向上追溯所有父级分类
3. 返回这些分类的 keys 数组

**支持两种数据格式**：
- `flat-tree`: 通过 `parent_id` 向上追溯
- `tree-with-articles`: 递归查找

### 展开逻辑优先级

```
1. defaultOpenMode === 'current-article-path' && currentArticleId 存在
   → 只展开文章路径

2. defaultOpenMode === 'all'
   → 展开所有分类

3. defaultOpenMode === 'none'
   → 全部折叠

4. forceOpenRootKeys === true（向后兼容）
   → 只展开根节点

5. 默认行为
   → 如果有当前文章就展开文章路径，否则根据 defaultOpenMode
```

## 📊 效果对比

### 之前（展开所有）
```
📚 第二本
  ├─ 📁 test2chapter         ← 展开
  │   ├─ 📁 测试节1          ← 展开
  │   │   ├─ 📄 文章1
  │   │   └─ 📄 文章2
  │   └─ 📄 章节文章
  ├─ 📁 另一个章节            ← 展开（即使不相关）
  │   ├─ 📄 文章3
  │   └─ 📄 文章4
  └─ 📄 简介
```

### 现在（只展开当前路径）
假设当前在"文章1"

```
📚 第二本
  ├─ 📁 test2chapter         ← 展开（路径上）
  │   ├─ 📁 测试节1          ← 展开（路径上）
  │   │   ├─ 📄 文章1       ← ✅ 当前文章
  │   │   └─ 📄 文章2
  │   └─ 📄 章节文章
  ├─ 📁 另一个章节            ← 折叠（不相关）
  └─ 📄 简介
```

## 🎯 用户体验提升

### 优势

1. **界面更清爽**
   - 减少视觉干扰
   - 只显示相关内容

2. **导航更方便**
   - 一眼看到当前位置
   - 路径清晰可见

3. **性能更好**
   - 减少渲染的DOM节点
   - 特别是对于大型目录结构

4. **灵活性高**
   - 用户可以手动展开需要的分类
   - 系统记住用户的操作

## 🔧 向后兼容

- 保留了 `forceOpenRootKeys` 配置
- 如果不设置 `defaultOpenMode`，默认使用 `'current-article-path'`
- 现有代码无需修改即可使用新行为

## 📚 相关组件

所有目录组件均已更新：
- ✅ `ChapterIndexSidebar` - 章节索引侧边栏
- ✅ `ChapterIndexDrawer` - 章节索引抽屉
- ✅ `ArticleIndexSidebar` - 文章索引侧边栏
- ✅ `ArticleIndexDrawer` - 文章索引抽屉
- ✅ `GenericIndexTree` - 通用索引树组件（核心）

## 🚀 使用建议

### 推荐配置

- **书籍阅读场景**：`'current-article-path'` ⭐
- **文章浏览场景**：`'current-article-path'` ⭐
- **目录管理场景**：`'all'`
- **极简展示场景**：`'none'`

### 最佳实践

1. 对于深层次的目录结构（>3层），使用 `'current-article-path'`
2. 对于扁平的目录结构（≤2层），可以使用 `'all'`
3. 移动端优先使用 `'current-article-path'` 以节省屏幕空间

## 👨‍💻 技术细节

### 数据结构支持

#### Flat-Tree 格式
```typescript
interface TreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  node_type: 'category' | 'article';
  // ...
}
```

通过 `parent_id` 字段向上追溯

#### Tree-With-Articles 格式
```typescript
interface Category {
  id: string;
  name: string;
  children?: Category[];
  articles?: Article[];
  // ...
}
```

通过递归遍历查找

## 📖 相关文档

- [侧边栏重构文档](./SIDEBAR_REFACTOR_README.md)
- [通用索引树组件](./app/components/sidebar/GenericIndexTree.tsx)

---

**维护者**：AI Assistant  
**最后更新**：2025-12-10

