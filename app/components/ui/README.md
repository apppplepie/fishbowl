# UI 组件库

自制的轻量级 UI 组件库，用于替换 Ant Design。

## 已实现的组件

- ✅ Button - 按钮组件
- ✅ Input - 输入框组件（支持 Password、TextArea）
- ✅ Modal - 对话框组件
- ✅ Tag - 标签组件
- ✅ Divider - 分割线组件
- ✅ Skeleton - 骨架屏组件
- ✅ Breadcrumb - 面包屑组件

## 使用方式

### 导入组件

```typescript
import { Button, Input, Modal, Tag, Divider, Skeleton, Breadcrumb } from '@/app/components/ui';
```

### Button

```tsx
<Button type="primary" size="large" loading={isLoading} onClick={handleClick}>
  点击我
</Button>

<Button type="default" icon={<Icon />}>带图标</Button>
<Button type="dashed">虚线按钮</Button>
<Button type="text">文本按钮</Button>
<Button type="link">链接按钮</Button>
<Button danger>危险按钮</Button>
<Button block>块级按钮</Button>
```

**Props:**
- `type`: 'primary' | 'default' | 'dashed' | 'text' | 'link'
- `size`: 'small' | 'middle' | 'large'
- `loading`: boolean
- `disabled`: boolean
- `icon`: ReactNode
- `block`: boolean
- `danger`: boolean
- `htmlType`: 'button' | 'submit' | 'reset'

### Input

```tsx
<Input placeholder="请输入" size="large" />
<Input prefix={<Icon />} suffix={<Icon />} />
<Input allowClear onClear={handleClear} />

<Input.Password placeholder="密码" />
<Input.TextArea rows={4} placeholder="多行文本" />
```

**Props:**
- `size`: 'small' | 'middle' | 'large'
- `prefix`: ReactNode
- `suffix`: ReactNode
- `allowClear`: boolean
- `onClear`: () => void

### Modal

```tsx
<Modal
  open={isOpen}
  title="标题"
  onCancel={handleCancel}
  onOk={handleOk}
  footer={null} // 或自定义 footer
>
  内容
</Modal>

// Modal.confirm (简化版，需要手动管理状态)
const confirm = Modal.confirm({
  title: '确认',
  content: '确定要删除吗？',
  onOk: async () => {
    // 处理确认
  },
  onCancel: () => {
    // 处理取消
  },
});
```

**Props:**
- `open`: boolean
- `title`: ReactNode
- `children`: ReactNode
- `footer`: ReactNode | null
- `onCancel`: () => void
- `onOk`: () => void
- `centered`: boolean
- `width`: number | string
- `maskClosable`: boolean
- `closable`: boolean

### Tag

```tsx
<Tag>标签</Tag>
<Tag color="blue">蓝色标签</Tag>
<Tag closable onClose={handleClose}>可关闭</Tag>
```

**Props:**
- `color`: string (预设颜色或自定义颜色值)
- `closable`: boolean
- `onClose`: (e?: MouseEvent) => void

### Divider

```tsx
<Divider />
<Divider type="vertical" />
<Divider dashed>分割线</Divider>
<Divider orientation="left">左侧文字</Divider>
```

**Props:**
- `type`: 'horizontal' | 'vertical'
- `orientation`: 'left' | 'right' | 'center'
- `dashed`: boolean
- `plain`: boolean

### Skeleton

```tsx
<Skeleton active loading={isLoading}>
  <div>实际内容</div>
</Skeleton>

<Skeleton active title={{ width: '60%' }} paragraph={{ rows: 4 }} />

<Skeleton.Button active size="small" />
```

**Props:**
- `active`: boolean
- `loading`: boolean
- `title`: boolean | { width?: number | string }
- `paragraph`: boolean | { rows?: number; width?: number | string | Array }
- `avatar`: boolean | { size?: 'large' | 'small' | 'default'; shape?: 'circle' | 'square' }

### Breadcrumb

```tsx
<Breadcrumb
  items={[
    { title: '首页', href: '/' },
    { title: '文章', href: '/articles' },
    { title: '详情' },
  ]}
/>

<Breadcrumb separator=">">
  <Breadcrumb.Item href="/">首页</Breadcrumb.Item>
  <Breadcrumb.Item href="/articles">文章</Breadcrumb.Item>
  <Breadcrumb.Item>详情</Breadcrumb.Item>
</Breadcrumb>
```

**Props:**
- `items`: Array<{ title: ReactNode; href?: string; onClick?: (e) => void }>
- `separator`: ReactNode
- `children`: ReactNode

## 样式系统

所有组件使用 CSS 变量系统，定义在 `variables.css` 中。可以通过修改 CSS 变量来定制主题。

## 注意事项

1. **Modal.confirm**: 当前实现是简化版，实际使用时需要手动管理 Modal 的显示/隐藏状态。完整实现需要更复杂的渲染逻辑。

2. **兼容性**: 这些组件尽量保持与 Ant Design 类似的 API，但某些高级功能可能未实现。

3. **样式**: 所有样式都使用 CSS 变量，可以通过修改 `variables.css` 来定制主题。

4. **图标**: 组件内部使用 SVG 图标，如需替换图标，可以修改组件内的 SVG 代码或使用外部图标库。

## 后续计划

- [ ] 完善 Modal.confirm 的实现
- [ ] 添加更多组件（Select, Form, Table 等）
- [ ] 添加暗色主题支持
- [ ] 添加动画效果优化
- [ ] 添加无障碍访问支持

