# 配色主题系统使用指南

## 概述

为了统一整个应用的UI风格，我们创建了统一的配色主题系统：

1. **通用UI主题** (`app/config/theme.ts`) - 应用级别的颜色、渐变、阴影等
2. **鱼缸背景主题** (`app/data/themes.ts`) - 专门的背景动画主题系统

所有UI颜色都应该从相应主题文件引用，而不是在组件中硬编码颜色值。

## 全局主题管理系统

### AppThemeProvider

我们提供了一个全局主题提供者 `AppThemeProvider`，它整合了所有主题系统：

```typescript
import { AppThemeProvider, useAppTheme } from '@/app/contexts/AppThemeContext';

// 在应用根部包装
<AppThemeProvider>
  <App />
</AppThemeProvider>

// 在组件中使用
const { uiTheme, currentFishbowlTheme, activeFishbowlThemeId } = useAppTheme();
```

## 使用方法

### 1. 导入主题配置

```typescript
import { theme } from '@/app/config/theme';
```

### 2. 使用颜色

#### 渐变背景
```typescript
// 主背景渐变（紫色系）
style={{ background: theme.gradients.primary }}

// 次要背景渐变（粉红色系）
style={{ background: theme.gradients.secondary }}

// 绿色背景渐变
style={{ background: theme.gradients.green }}
```

#### 基础颜色
```typescript
// 纯色
style={{ color: theme.colors.black }}
style={{ backgroundColor: theme.colors.white }}

// 灰色系
style={{ color: theme.colors.gray[500] }}  // #666666
style={{ backgroundColor: theme.colors.gray[100] }}  // #f5f5f5
```

#### 功能颜色
```typescript
// 主色（蓝色）
style={{ color: theme.colors.primary }}  // #1890ff

// 成功色（绿色）
style={{ color: theme.colors.success }}  // #52c41a

// 警告色（橙色）
style={{ color: theme.colors.warning }}  // #faad14

// 错误色（红色）
style={{ color: theme.colors.error }}  // #ff4d4f

// 信息色（紫色）
style={{ color: theme.colors.info }}  // #722ed1
```

#### 权限等级颜色
```typescript
import { getAccessLevelColor, getAccessLevelLabel } from '@/app/config/theme';

// 获取权限等级颜色
const color = getAccessLevelColor(2);  // 返回 '#1890ff'

// 获取权限等级标签
const label = getAccessLevelLabel(2);  // 返回 'G'

// 或直接使用
style={{ backgroundColor: theme.accessLevels.general }}  // #1890ff
```

#### 文本颜色
```typescript
// 主要文本（浅色背景上）
style={{ color: theme.text.primary }}  // #333333

// 主要文本（深色背景上）
style={{ color: theme.text.primaryDark }}  // #ffffff

// 次要文本
style={{ color: theme.text.secondary }}  // #666666

// 辅助文本
style={{ color: theme.text.tertiary }}  // #999999

// 链接文本
style={{ color: theme.text.link }}  // #1890ff
```

#### 背景颜色
```typescript
// 基础背景
style={{ backgroundColor: theme.background.base }}  // #ffffff
style={{ backgroundColor: theme.background.gray }}  // #f5f5f5

// 半透明背景
style={{ backgroundColor: theme.background.whiteOverlayLight }}  // rgba(255, 255, 255, 0.1)
style={{ backgroundColor: theme.background.hover }}  // rgba(255, 255, 255, 0.1)
```

#### 边框颜色
```typescript
style={{ borderColor: theme.border.default }}  // #d9d9d9
style={{ borderColor: theme.border.primary }}  // #1890ff
```

## 鱼缸背景主题系统

### 概述

鱼缸背景主题系统 (`app/data/themes.ts`) 提供了丰富的动态背景效果，包含天空、水面、波浪等动画元素。系统包含10个预设主题 + 自定义模式。

### 使用方法

```typescript
import { useAppTheme } from '@/app/contexts/AppThemeContext';

// 获取鱼缸主题
const {
  currentFishbowlTheme,    // 当前激活的主题
  activeFishbowlThemeId,   // 当前主题ID
  setActiveFishbowlThemeId, // 切换主题
  fishbowlThemes          // 所有可用主题
} = useAppTheme();

// 使用主题样式
<div className={currentFishbowlTheme.pageBg}>
  {/* 页面背景 */}
</div>
```

### 主题结构

每个鱼缸主题包含以下属性：

```typescript
interface Theme {
  id: string;                    // 主题唯一标识
  name: string;                  // 显示名称
  pageBg: string;                // 页面整体背景 (tailwind类)
  skyGradient: string;           // 天空渐变
  waterGradient: string;         // 水面渐变
  orbColors: {                   // 光球颜色
    sun: string;                 // 太阳光颜色
    atmosphere: string;          // 大气层颜色
    waterLight: string;          // 水面高光
    waterDeep: string;           // 水面深层
  };
  waveColors: string[];          // 波浪颜色 (4层)
  pageLayout: {                  // 页面布局样式
    box1Bg: string;              // box1背景 (天空区域)
    box2Bg: string;              // box2背景 (水面区域)
    containerPaddingTop: string; // 容器顶部间距
  };
}
```

### 预设主题列表

| 主题ID | 名称 | 特点 |
|--------|------|------|
| `morning` | Morning Mist | 橙色调，清晨薄雾效果 |
| `sakura` | Sakura Breeze | 粉色调，樱花季氛围 |
| `coral` | Coral Reef | 橙色调，珊瑚礁风格 |
| `azure` | Azure Day | 蓝色调，晴朗天空 |
| `emerald` | Emerald Springs | 绿色调，翠绿湖水 |
| `midnight` | Deep Ocean | 深蓝色，深海效果 |
| `deep-ocean` | Deep Sea Abyss” (深海之渊) 的配色方案。 |
| `sunset` | Golden Hour | 金色调，日落余晖 |
| `noir` | Monochrome Noir | 黑白调，经典风格 |
| `glacial` | Glacial Melt | 冰蓝色，冰川融化 |

### 自定义模式

除了预设主题，还支持自定义模式：

```typescript
// 激活自定义模式
setActiveFishbowlThemeId('custom');

// 调整参数 (0-360 HSL色相值)
setSkyHue(45);    // 天空色相
setWaterHue(200); // 水面色相
```

### PageLayout 集成

PageLayout 组件已集成鱼缸主题系统：

```typescript
// PageLayout 会自动使用主题的布局样式
<PageLayout theme={currentFishbowlTheme}>
  {/* 内容 */}
</PageLayout>

// 内部会自动应用:
// - box1 背景 = theme.pageLayout.box1Bg
// - box2 背景 = theme.pageLayout.box2Bg
// - 容器间距 = theme.pageLayout.containerPaddingTop
```

## 颜色分类说明

### 渐变背景 (gradients)
- `primary`: 主背景渐变（紫色系）- 用于layout和主要页面背景
- `secondary`: 次要背景渐变（粉红色系）- 用于内容区域
- `green`: 绿色背景渐变 - 用于特殊页面
- `dark`: 黑色渐变 - 用于菜单选中状态

### 基础颜色 (colors)
- `black`, `white`: 纯色
- `gray`: 灰色系（50-700，从浅到深）

### 功能颜色 (colors)
- `primary`: 主色（蓝色）- 用于链接、按钮、强调
- `success`: 成功色（绿色）
- `warning`: 警告色（橙色）
- `error`: 错误/危险色（红色）
- `info`: 信息色（紫色）

### 权限等级颜色 (accessLevels)
- `public`: P - 公开（绿色 #52c41a）
- `general`: G - 一般（蓝色 #1890ff）
- `member`: M - 会员（橙色 #faad14）
- `adult`: A - 成人（红色 #f5222d）
- `root`: R - 管理员（紫色 #722ed1）

### 文本颜色 (text)
- `primary`: 主要文本（浅色背景上）
- `primaryDark`: 主要文本（深色背景上）
- `secondary`: 次要文本
- `tertiary`: 辅助文本
- `disabled`: 禁用文本
- `link`: 链接文本
- `linkHover`: 链接悬停

### 背景颜色 (background)
- `base`, `baseDark`: 基础背景
- `gray`, `grayLight`: 灰色背景
- `overlay`, `overlayLight`: 遮罩层
- `whiteOverlay`, `whiteOverlayLight`, `whiteOverlayMedium`: 白色遮罩
- `hover`, `hoverLight`: 悬停背景
- `selected`, `selectedWarning`: 选中背景

### 边框颜色 (border)
- `default`: 默认边框
- `light`: 浅边框
- `dark`: 深边框
- `primary`: 主色边框
- `dashed`: 虚线边框（深色背景上）

## 迁移指南

如果发现组件中还有硬编码的颜色，请按以下步骤迁移：

1. 找到硬编码的颜色值（如 `#1890ff`, `#666`, `rgba(255,255,255,0.1)` 等）
2. 在 `theme.ts` 中找到对应的颜色定义
3. 将硬编码替换为 `theme.xxx.xxx` 的引用
4. 确保导入 `theme`：`import { theme } from '@/app/config/theme'`

## 注意事项

1. **不要硬编码颜色**：所有颜色都应该从 `theme.ts` 引用
2. **保持一致性**：使用语义化的颜色名称（如 `primary`, `success`），而不是直接使用颜色值
3. **CSS文件**：`globals.css` 中的颜色可以保持硬编码，但应确保与 `theme.ts` 中的定义保持一致
4. **权限等级**：权限等级颜色已在 `theme.ts` 中定义，与 `app/types/block.ts` 中的 `ACCESS_LEVELS` 保持一致

## 示例

### 之前（硬编码）
```typescript
<div style={{ 
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  border: '1px solid #d9d9d9'
}}>
```

### 之后（使用主题）
```typescript
import { theme } from '@/app/config/theme';

<div style={{ 
  background: theme.gradients.primary,
  color: theme.text.primaryDark,
  border: `1px solid ${theme.border.default}`
}}>
```

