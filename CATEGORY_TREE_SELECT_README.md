# 分类树选择器功能说明

## 功能概述

为发布页面和绘画发布浮窗添加了分类树选择器，支持：
- ✅ 选择文章所属分类
- ✅ 在任意分类下新建子分类（点击 ➕ 按钮）
- ✅ 限定显示范围（可指定根分类）
- ✅ 搜索过滤分类

## 新增组件

### CategoryTreeSelect（分类树选择器）

**文件位置：** `app/components/CategoryTreeSelect.tsx`

**功能特性：**
- 📁 显示树形分类结构
- ➕ 每个分类节点后有加号按钮，点击可新建子分类
- 🔍 支持搜索过滤
- 🎯 可限定显示范围（通过 `rootCategoryId`）
- 🚫 暂不支持删除（需要管理员权限，待实现）

**使用示例：**

```tsx
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';

// 普通使用（显示所有分类）
<CategoryTreeSelect 
  value={categoryId}
  onChange={setCategoryId}
  placeholder="选择分类"
/>

// 限定范围（只显示绘画作品分类下的子分类）
<CategoryTreeSelect 
  value={categoryId}
  onChange={setCategoryId}
  placeholder="选择分类"
  rootCategoryId="cat_drawing"
/>
```

**Props：**

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| value | string | 否 | - | 当前选中的分类ID |
| onChange | (value: string) => void | 否 | - | 选择变化回调 |
| rootCategoryId | string | 否 | - | 限定显示的根分类ID |
| placeholder | string | 否 | '请选择分类' | 占位文本 |
| allowClear | boolean | 否 | true | 是否显示清除按钮 |
| style | React.CSSProperties | 否 | - | 自定义样式 |

## 应用场景

### 1. 发布页面（所有类型）

**文件位置：** `app/publish/page.tsx`

**说明：**
- 为6种内容类型（图片、文章、日志、引言、视频、链接）都添加了分类选择
- 可以选择任意分类
- 支持在任意分类下新建子分类

**表单字段：**
```tsx
<Form.Item
  label="分类"
  name="category_id"
  tooltip="选择文章所属分类，支持新建分类"
>
  <CategoryTreeSelect placeholder="选择分类（可选）" />
</Form.Item>
```

### 2. 绘画发布浮窗

**文件位置：** `app/components/GalleryPublishFloat.tsx`

**说明：**
- 限定只显示"绘画作品"分类下的子分类
- 未选择分类时，默认发布到"绘画作品"分类（`cat_drawing`）
- 可以在绘画作品下新建子分类（如"角色设计"、"场景概念"等）

**特殊处理：**
```tsx
<CategoryTreeSelect 
  placeholder="选择分类（可选，默认：绘画作品）" 
  rootCategoryId="cat_drawing"  // 限定显示范围
/>

// 提交时
category_id: values.category_id || 'cat_drawing', // 未选择时默认
```

## 新建分类流程

### 用户操作：

1. **打开分类树选择器**
2. **找到目标父分类**
3. **点击分类名称后面的 ➕ 按钮**
4. **在弹窗中输入新分类名称**
5. **点击"创建"按钮**
6. **新分类立即出现在树中**

### 技术实现：

```tsx
// 点击加号按钮
handleAddCategory(parentId, parentName)
  ↓
// 打开新建分类弹窗
setNewCategoryModal(true)
  ↓
// 用户输入分类名称并确认
handleCreateCategory()
  ↓
// 调用 POST /api/categories
{
  id: `cat_${Date.now()}`,
  name: newCategoryName,
  parent_id: parentCategoryId,
  order_index: orderIndex + 1
}
  ↓
// 重新加载分类树
loadCategories()
```

## 分类树结构示例

### 普通发布页面（显示所有分类）

```
📁 未分类
📁 🎨 绘画作品
  ├─ 角色设计 ➕
  ├─ 场景概念 ➕
  └─ 写实练习 ➕
📁 📝 技术博客
  ├─ 前端开发 ➕
  └─ 后端开发 ➕
📁 📖 生活随笔 ➕
```

### 绘画发布浮窗（只显示绘画作品下的子分类）

```
📁 角色设计 ➕
📁 场景概念 ➕
📁 写实练习 ➕
```

## API 集成

### 获取分类树

```typescript
const response = await fetch('/api/categories?format=tree');
const data = await response.json();
// data.categories: Category[]
```

### 创建新分类

```typescript
const response = await fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'cat_xxx',
    name: '新分类',
    parent_id: 'parent_id',
    order_index: 1
  })
});
```

## 数据流

```
用户选择分类
    ↓
Form 收集 category_id
    ↓
提交到 POST /api/articles
    ↓
{
  title: "...",
  author: "...",
  category_id: "cat_drawing_character",  // 分类ID
  order_index: 0,                   // 分类内排序
  ...
}
    ↓
文章保存到数据库
```

## 注意事项

### 1. 默认行为

- **普通发布**：不选择分类时，`category_id` 为空
- **绘画发布**：不选择分类时，`category_id` 默认为 `cat_drawing`

### 2. 权限控制

- ✅ 任何用户都可以新建分类
- ❌ 删除分类需要管理员权限（暂未实现）

### 3. 分类限制

- 不限制分类层级深度
- 不限制分类下的文章数量
- 分类名称必填，不能为空

### 4. 用户体验

- 分类树默认全部展开
- 支持搜索过滤（按分类名称）
- 鼠标悬停在加号按钮上会高亮
- 新建分类后自动刷新树结构

## 未来扩展

### 可能的功能增强：

1. **分类管理页面**
   - 批量管理分类
   - 拖拽调整分类顺序和层级
   - 分类重命名
   - 分类删除（需权限）

2. **分类统计**
   - 显示每个分类下的文章数量
   - 显示分类的最后更新时间

3. **分类图标/颜色**
   - 为每个分类设置自定义图标
   - 设置分类主题色

4. **权限控制**
   - 不同用户组有不同的分类操作权限
   - 某些分类只允许特定用户发布

5. **智能推荐**
   - 根据文章内容自动推荐合适的分类
   - 常用分类快捷选择

## 测试清单

### 普通发布页面

- [ ] 打开发布页面，选择任意内容类型
- [ ] 点击分类选择器，查看完整分类树
- [ ] 选择一个分类
- [ ] 点击分类后的 ➕ 按钮
- [ ] 输入新分类名称并创建
- [ ] 验证新分类出现在树中
- [ ] 选择新创建的分类并提交表单

### 绘画发布浮窗

- [ ] 打开画廊页面
- [ ] 点击右下角发布按钮
- [ ] 点击分类选择器
- [ ] 验证只显示绘画作品下的子分类
- [ ] 在"角色设计"下新建一个子分类
- [ ] 选择新分类
- [ ] 上传图片并提交
- [ ] 验证文章发布到正确的分类

### 分类树功能

- [ ] 搜索分类名称
- [ ] 清除已选择的分类
- [ ] 展开/折叠分类节点
- [ ] 在多层级分类下新建子分类

## 相关文件

### 组件
- `app/components/CategoryTreeSelect.tsx` - 分类树选择器

### 页面
- `app/publish/page.tsx` - 发布页面（6种类型）
- `app/components/GalleryPublishFloat.tsx` - 绘画发布浮窗

### API
- `app/api/categories/route.ts` - 分类列表API
- `app/api/categories/[id]/route.ts` - 单个分类API

### 数据库
- `scripts/add-categories.ts` - 分类表迁移脚本
- `CATEGORY_SYSTEM_README.md` - 分类系统完整文档

## 总结

✅ 完成了通用分类树选择器组件
✅ 为所有发布页面添加了分类选择
✅ 绘画发布支持限定分类范围
✅ 支持新建子分类功能
✅ 代码结构清晰，易于维护和扩展

现在用户可以方便地管理文章分类，并在发布时选择合适的分类了！🎉

