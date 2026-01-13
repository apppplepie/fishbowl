# 个人资料页面设计说明

## 📐 整体风格选择

**选择风格：个人博客风格（Personal Blog Style）**

### 为什么选择这个风格？

1. **信息展示清晰**：个人资料页面需要清晰展示用户信息，个人博客风格有良好的信息层级和阅读体验
2. **专业且友好**：既保持专业性，又不会过于严肃，适合个人主页场景
3. **视觉舒适**：使用柔和的色彩和合理的间距，长时间浏览不会疲劳
4. **响应式友好**：卡片式布局在移动端和桌面端都能良好适配

## 🎨 设计系统

### 颜色体系（明媚色彩）

```typescript
colors: {
  primary: '#4A90E2',        // 主色：温和蓝色 - 用于主要元素
  primaryLight: '#6BA3E8',   // 主色浅色 - 用于悬停状态
  primaryDark: '#357ABD',    // 主色深色 - 用于渐变
  accent: '#FFB74D',         // 强调色：温暖橙色 - 用于特殊标识
  success: '#66BB6A',        // 成功色：清新绿色 - 用于状态指示
  
  text: {
    primary: '#2C3E50',      // 主文本：深蓝灰 - 标题和重要文本
    secondary: '#5A6C7D',    // 次要文本：中灰 - 描述性文本
    tertiary: '#95A5A6',     // 辅助文本：浅灰 - 标签和提示
  },
  
  background: {
    card: '#FFFFFF',         // 卡片背景：纯白
    section: '#F8F9FA',      // 区块背景：浅灰 - 页面背景
  },
  
  border: {
    light: '#E1E8ED',        // 浅边框 - 卡片边框
  },
}
```

### 字体层级系统

| 层级 | 字体大小 | 字重 | 行高 | 用途 |
|------|---------|------|------|------|
| H1 | 32px (移动端24px) | 700 | 1.2 | 页面主标题 |
| H2 | 24px (移动端20px) | 600 | 1.3 | 区块标题 |
| H3 | 20px (移动端18px) | 600 | 1.4 | 卡片标题 |
| Body | 16px (移动端15px) | 400 | 1.6 | 正文内容 |
| Body Small | 14px | 400 | 1.5 | 次要文本 |
| Caption | 12px | 400 | 1.4 | 标签和提示 |

### 间距比例系统（8px基础单位）

```
xs: 4px   → 极小间距（图标与文字之间）
sm: 8px   → 小间距（相关元素之间）
md: 16px  → 中等间距（卡片内元素间距）
lg: 24px  → 大间距（卡片之间）
xl: 32px  → 超大间距（区块之间）
xxl: 48px → 极大间距（大区块之间）
```

### 圆角系统

```
sm: 8px   → 小圆角（标签、徽章）
md: 12px  → 中等圆角（按钮）
lg: 16px  → 大圆角（卡片）
xl: 24px  → 超大圆角（特殊卡片）
full: 9999px → 完全圆形（头像、徽章）
```

### 阴影系统

```
sm: 0 1px 3px rgba(0, 0, 0, 0.08)   → 轻微阴影（卡片）
md: 0 4px 12px rgba(0, 0, 0, 0.1)   → 中等阴影（主要卡片）
lg: 0 8px 24px rgba(0, 0, 0, 0.12)  → 大阴影（特殊卡片）
```

## 📱 响应式策略

### 桌面端（≥768px）
- **布局**：横向布局，头像和信息并排显示
- **网格**：2列网格布局（基本信息 + 账户状态）
- **间距**：使用较大的间距值（xl, xxl）
- **字体**：使用完整的字体大小

### 移动端（<768px）
- **布局**：纵向布局，头像和信息垂直堆叠
- **网格**：单列布局，卡片垂直排列
- **间距**：使用较小的间距值（lg, xl）
- **字体**：使用缩小的字体大小（减少20-25%）
- **按钮**：全宽按钮，便于点击

## 🏗️ 页面结构

### 1. 顶部头像卡片（Hero Card）
- **功能**：展示用户头像、姓名、邮箱等核心信息
- **设计**：大卡片，突出头像，带角色徽章
- **响应式**：移动端垂直布局，桌面端横向布局

### 2. 信息卡片网格（Info Grid）
- **基本信息卡片**：用户名、显示名称、邮箱、角色
- **账户状态卡片**：账户状态、注册时间
- **设计**：2列网格（桌面端）或单列（移动端）

### 3. 管理员功能区（Admin Section）
- **功能**：管理员专属区域，快速进入管理面板
- **设计**：渐变背景，突出显示，带图标和说明

## 💻 关键代码示例

### 1. 设计系统定义

```typescript
const designSystem = {
  colors: { /* 颜色定义 */ },
  spacing: { /* 间距定义 */ },
  typography: { /* 字体定义 */ },
  borderRadius: { /* 圆角定义 */ },
  shadow: { /* 阴影定义 */ },
};
```

### 2. 响应式样式函数

```typescript
const getResponsiveStyle = (desktop: any, mobile: any) => {
  return isMobile ? { ...desktop, ...mobile } : desktop;
};
```

### 3. 头像卡片样式

```typescript
<div style={{
  background: designSystem.colors.background.card,
  borderRadius: designSystem.borderRadius.lg,
  padding: isMobile ? designSystem.spacing.xl : designSystem.spacing.xxl,
  boxShadow: designSystem.shadow.md,
  border: `1px solid ${designSystem.colors.border.light}`,
}}>
  {/* 内容 */}
</div>
```

### 4. 信息项组件

```typescript
function InfoItem({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: designSystem.spacing.xs,
      paddingBottom: designSystem.spacing.md,
      borderBottom: `1px solid ${designSystem.colors.border.light}`,
    }}>
      <Text style={{
        color: designSystem.colors.text.tertiary,
        ...designSystem.typography.caption,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </Text>
      <div style={{
        color: designSystem.colors.text.primary,
        ...designSystem.typography.body,
        fontWeight: 500,
      }}>
        {value}
      </div>
    </div>
  );
}
```

### 5. 网格布局

```typescript
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
  gap: isMobile ? designSystem.spacing.lg : designSystem.spacing.lg,
}}>
  {/* 卡片 */}
</div>
```

## 🎯 设计亮点

1. **清晰的视觉层级**：通过字体大小、颜色、间距建立清晰的信息层级
2. **统一的间距系统**：使用8px基础单位，保持视觉一致性
3. **柔和的色彩**：使用温和的蓝色和温暖的橙色，营造友好氛围
4. **卡片式设计**：每个信息区块独立成卡片，便于扫描和理解
5. **响应式优先**：移动端和桌面端都有优化的布局和交互
6. **细节优化**：角色徽章、状态指示器、悬停效果等细节提升体验

## 📊 视觉层级关系

```
页面背景 (#F8F9FA)
  └── 卡片背景 (#FFFFFF)
      ├── 标题 (H1/H2/H3, #2C3E50)
      ├── 正文 (Body, #2C3E50)
      ├── 次要文本 (Body Small, #5A6C7D)
      └── 标签 (Caption, #95A5A6)
```

## 🔄 后续优化建议

1. **添加动画**：卡片悬停时的轻微上浮效果
2. **数据可视化**：添加用户统计图表（文章数、评论数等）
3. **个性化设置**：允许用户自定义主题色
4. **社交链接**：添加社交媒体链接区域
5. **活动时间线**：展示用户最近的活动记录

