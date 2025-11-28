/**
 * 导航配置文件
 * 集中管理所有导航菜单项，方便扩展和维护
 */

export interface NavigationItem {
  key: string;
  label: string;
  icon?: string; // emoji 或者可以改成 React 组件
  path: string;
  requireAuth?: boolean; // 是否需要登录
  children?: NavigationItem[]; // 支持多级菜单
}

/**
 * 公共导航菜单（所有用户可见）
 */
export const publicNavigationItems: NavigationItem[] = [
  {
    key: 'home',
    label: '首页',
    path: '/',
  },
  {
    key: 'about',
    label: '关于我们',
    path: '/about',
  },
  {
    key: 'services',
    label: '服务项目',
    path: '/services',
  },
  {
    key: 'gallery',
    label: '图片墙',
    icon: '📸',
    path: '/gallery',
  },
  {
    key: 'articles',
    label: '文章归档',
    icon: '📝',
    path: '/articles',
  },
  {
    key: 'publish',
    label: '发布内容',
    icon: '✨',
    path: '/publish',
  },
  {
    key: 'contact',
    label: '联系方式',
    path: '/contact',
  },
];

/**
 * 需要登录才能访问的导航菜单
 */
export const protectedNavigationItems: NavigationItem[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    icon: '🎯',
    path: '/dashboard',
    requireAuth: true,
  },
  {
    key: 'profile',
    label: '个人资料',
    icon: '👤',
    path: '/profile',
    requireAuth: true,
  },
];

/**
 * 用户下拉菜单配置
 */
export const userMenuItems = [
  {
    key: 'dashboard',
    label: '仪表盘',
    path: '/dashboard',
  },
  {
    key: 'profile',
    label: '个人资料',
    path: '/profile',
  },
];

