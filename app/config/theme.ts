/**
 * 统一配色主题配置文件
 * 所有UI颜色都应该从这里引用，保持整体风格一致
 */

// ==================== 主色调 ====================
export const theme = {
  // 主背景渐变
  gradients: {
    // 主背景渐变（紫色系）- 用于layout和主要页面背景
    primary: 'linear-gradient(135deg,rgb(0, 0, 0) 0%,rgb(0, 0, 0) 100%)',
    // 次要背景渐变（粉红色系）- 用于内容区域
    secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    // 绿色背景渐变 - 用于特殊页面
    green: 'linear-gradient(180deg,rgb(0, 0, 0) 0%,rgb(0, 0, 0) 100%)',
    // 黑色渐变 - 用于菜单选中状态
    dark: 'linear-gradient(90deg, #000 0%, #333 100%)',
  },

  // ==================== 基础颜色 ====================
  colors: {
    // 纯色
    black: '#000000',
    white: '#ffffff',
    
    // 灰色系（从浅到深）
    gray: {
      50: '#fafafa',   // 最浅灰 - 用于hover背景
      100: '#f5f5f5',  // 浅灰 - 用于卡片背景、次要背景
      200: '#e6e6e6',  // 边框灰
      300: '#d9d9d9',  // 默认边框
      400: '#999999',  // 辅助文字
      500: '#666666',  // 次要文字
      600: '#333333',  // 主要文字（深色背景上）
      700: '#1a1a1a',  // 深灰文字
    },

    // ==================== 功能颜色 ====================
    // 主色（蓝色）- 用于链接、按钮、强调
    primary: '#1890ff',
    // 成功色（绿色）
    success: '#52c41a',
    // 警告色（橙色）
    warning: '#faad14',
    // 错误/危险色（红色）
    error: '#ff4d4f',
    // 信息色（紫色）
    info: '#722ed1',
  },

  // ==================== 权限等级颜色 ====================
  // 与 app/types/block.ts 中的 ACCESS_LEVELS 保持一致
  accessLevels: {
    public: '#52c41a',    // P - 公开（绿色）
    general: '#1890ff',   // G - 一般（蓝色）
    member: '#faad14',    // M - 会员（橙色）
    adult: '#f5222d',     // A - 成人（红色）
    root: '#722ed1',      // R - 管理员（紫色）
  },

  // ==================== 文本颜色 ====================
  text: {
    primary: '#333333',      // 主要文本（浅色背景上）
    primaryDark: '#ffffff',  // 主要文本（深色背景上）
    secondary: '#666666',    // 次要文本
    tertiary: '#999999',    // 辅助文本
    disabled: '#cccccc',     // 禁用文本
    link: '#1890ff',        // 链接文本
    linkHover: '#40a9ff',   // 链接悬停
  },

  // ==================== 背景颜色 ====================
  background: {
    // 基础背景
    base: '#ffffff',           // 白色背景
    baseDark: '#000000',       // 黑色背景
    gray: '#f5f5f5',           // 灰色背景
    grayLight: '#fafafa',      // 浅灰背景
    
    // 半透明背景（用于毛玻璃效果）
    overlay: 'rgba(0, 0, 0, 0.45)',        // 遮罩层
    overlayLight: 'rgba(0, 0, 0, 0.1)',    // 浅遮罩
    whiteOverlay: 'rgba(255, 255, 255, 0.9)',  // 白色遮罩（移动端）
    whiteOverlayLight: 'rgba(255, 255, 255, 0.1)', // 浅白色遮罩
    whiteOverlayMedium: 'rgba(255, 255, 255, 0.2)', // 中等白色遮罩
    
    // 状态背景
    hover: 'rgba(255, 255, 255, 0.1)',     // 悬停背景（深色背景上）
    hoverLight: '#fafafa',                  // 悬停背景（浅色背景上）
    selected: '#e6f7ff',                    // 选中背景（蓝色系）
    selectedWarning: '#fff7e6',             // 选中背景（橙色系）
  },

  // ==================== 边框颜色 ====================
  border: {
    default: '#d9d9d9',      // 默认边框
    light: '#e6e6e6',        // 浅边框
    dark: '#333333',        // 深边框
    primary: '#1890ff',     // 主色边框
    dashed: 'rgba(255, 255, 255, 0.3)', // 虚线边框（深色背景上）
  },

  // ==================== 阴影 ====================
  shadow: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',      // 小阴影
    md: '0 2px 8px rgba(0, 0, 0, 0.15)',    // 中等阴影
    lg: '0 4px 16px rgba(0, 0, 0, 0.2)',    // 大阴影
  },

  // ==================== 特殊用途颜色 ====================
  special: {
    // 代码块背景
    codeBlock: '#282c34',
    // 代码块文字
    codeText: '#abb2bf',
    // 代码块关键字
    codeKeyword: '#61dafb',
  },
} as const;

// ==================== 类型导出 ====================
export type Theme = typeof theme;

// ==================== 便捷函数 ====================
/**
 * 获取权限等级颜色
 */
export const getAccessLevelColor = (level: number): string => {
  switch (level) {
    case 1: return theme.accessLevels.public;
    case 2: return theme.accessLevels.general;
    case 3: return theme.accessLevels.member;
    case 4: return theme.accessLevels.adult;
    case 5: return theme.accessLevels.root;
    default: return theme.accessLevels.public;
  }
};

/**
 * 获取权限等级标签
 */
export const getAccessLevelLabel = (level: number): string => {
  switch (level) {
    case 1: return 'P';
    case 2: return 'G';
    case 3: return 'M';
    case 4: return 'A';
    case 5: return 'R';
    default: return 'P';
  }
};

