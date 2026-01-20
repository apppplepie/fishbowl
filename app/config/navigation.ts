/**
 * 导航配置文件
 * 集中管理所有导航菜单项，方便扩展和维护
 */

export interface NavigationItem {
  key: string;
  label: string;
  icon?: string; // 图标名称
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
    icon: 'HomeOutlined',
    path: '/',
  },
  {
    key: 'gallery',
    label: '图片墙',
    icon: 'PictureOutlined',
    path: '/gallery',
  },
  {
    key: 'archive',
    label: '文章归档',
    icon: 'FileTextOutlined',
    path: '/archive',
  },
  // {
  //   key: 'publish-article',
  //   label: '创作文章',
  //   icon: 'FormOutlined',
  //   path: '/publish-article',
  // },
  {
    key: 'bookcase',
    label: '书橱',
    icon: 'BookOutlined',
    path: '/bookcase',
  },
  {
    key: 'fishbowl',
    label: '鱼缸',
    icon: 'SunOutlined',
    path: '/fishbowl',
  },
];

/**
 * 需要登录才能访问的导航菜单
 */
export const protectedNavigationItems: NavigationItem[] = [];
