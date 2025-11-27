# PageLayout 页面框架使用指南

## 简介

`PageLayout` 是一个可复用的页面框架组件，提供统一的页面布局结构。

## 布局结构

```
┌──────────────────────────────────┐
│  黑色边框 (上45px, 左右下6px)      │
│  ┌────────────────────────────┐  │
│  │ 盒模型1 (60px高)           │  │
│  │ - 紧贴大盒子边框           │  │
│  │ - 可自定义背景色           │  │
│  │ - 可添加内容               │  │
│  ├────────────────────────────┤  │
│  │ 盒模型2: 内容区域          │  │
│  │ - 紧贴盒模型1              │  │
│  │ - 自适应高度               │  │
│  │ - 可自定义背景色           │  │
│  │                            │  │
│  └────────────────────────────┘  │
│  ↕ 整体可滚动                     │
└──────────────────────────────────┘
```

**重要特性**：盒模型1和盒模型2装在大黑框里，整体可以一起滚动。

## 基础使用

### 1. 最简单的使用方式

```tsx
import PageLayout from '@/app/components/PageLayout';

export default function MyPage() {
  return (
    <PageLayout>
      <div style={{ padding: '20px' }}>
        <h1>页面内容</h1>
        <p>这里是你的页面内容（在盒模型2中）</p>
      </div>
    </PageLayout>
  );
}
```

### 2. 自定义颜色

```tsx
<PageLayout
  box1BgColor="#3498db"
  box2BgColor="#ffffff"
>
  {/* 你的内容（盒模型2） */}
</PageLayout>
```

### 3. 盒1添加内容

```tsx
<PageLayout
  box1BgColor="#667eea"
  box1Content={
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 20px',
      height: '100%',
      color: 'white' 
    }}>
      页面标题
    </div>
  }
>
  {/* 你的内容（盒模型2） */}
</PageLayout>
```

### 4. 自定义样式

```tsx
<PageLayout
  box1Style={{ 
    display: 'flex', 
    alignItems: 'center',
    padding: '0 20px'
  }}
  box2Style={{ 
    padding: '20px',
    background: 'linear-gradient(180deg, #fff 0%, #f5f5f5 100%)'
  }}
>
  {/* 你的内容（盒模型2） */}
</PageLayout>
```

## Props 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `ReactNode` | 必填 | 盒模型2的主内容 |
| `box1BgColor` | `string` | `'#4CAF50'` | 盒模型1的背景色 |
| `box2BgColor` | `string` | `'#f5f5f5'` | 盒模型2的背景色 |
| `box1Content` | `ReactNode` | `undefined` | 盒模型1的内容（可选） |
| `box1Style` | `CSSProperties` | `{}` | 自定义盒模型1样式 |
| `box2Style` | `CSSProperties` | `{}` | 自定义盒模型2样式 |

## 完整示例

查看 `app/components/PageLayout.example.tsx` 文件获取更多使用示例。

## 特性

- ✅ 统一的黑色边框样式（大盒子）
- ✅ 盒模型1：60px高，紧贴大盒子边框
- ✅ 盒模型2：自适应高度，紧贴盒模型1
- ✅ 整体可滚动（盒1和盒2一起滚动）
- ✅ 灵活的自定义选项
- ✅ 响应式设计
- ✅ TypeScript 支持

## 在现有页面中使用

### 替换 About 页面示例

```tsx
// 原来的代码
export default function AboutPage() {
  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh' }}>
        {/* 内容 */}
      </div>
    </>
  );
}

// 使用 PageLayout 后
import PageLayout from '@/app/components/PageLayout';
import Header from '../components/Header';

export default function AboutPage() {
  return (
    <PageLayout
      box1Content={<Header />}
      box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      box2BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    >
      <div style={{ padding: '20px' }}>
        {/* 原来的内容 */}
      </div>
    </PageLayout>
  );
}
```

## 注意事项

1. **全屏布局**：组件使用 `100vh` 和 `100vw`，占据整个视口
2. **滚动行为**：整个页面可以滚动（盒模型1和盒模型2一起滚动）
3. **边框尺寸**：已包含在盒模型中（`boxSizing: 'border-box'`）
4. **响应式**：自动适配不同屏幕尺寸，包括手机端
5. **渐变背景**：支持 CSS 渐变色，如 `linear-gradient(...)`
6. **盒1紧贴边框**：盒模型1无内边距，直接贴着大盒子的边框

## 文件位置

- 组件文件：`app/components/PageLayout.tsx`
- 示例文件：`app/components/PageLayout.example.tsx`（使用后可删除）
- 使用说明：`PAGE_LAYOUT_README.md`

