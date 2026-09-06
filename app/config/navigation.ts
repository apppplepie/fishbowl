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
 *
 * 「书房」的三个视角（文章 / 书籍 / 画作）在导航里长得跟别的入口一模一样，
 * 但它们指向同一个 /library 路由、只差一个 ?view=，
 * 所以点它们是页面内换视角，不会真的换页。
 */
export const publicNavigationItems: NavigationItem[] = [
  {
    key: 'home',
    label: '首页',
    icon: 'HomeOutlined',
    path: '/',
  },
  {
    key: 'library-doc',
    label: '文章',
    icon: 'FileTextOutlined',
    path: '/library?view=doc',
  },
  {
    key: 'library-book',
    label: '书籍',
    icon: 'BookOutlined',
    path: '/library?view=book',
  },
  {
    key: 'library-art',
    label: '画作',
    icon: 'PictureOutlined',
    path: '/library?view=art',
  },
  {
    key: 'fishbowl',
    label: '鱼缸',
    icon: 'IoFishOutline',
    path: '/fishbowl',
  },
];

/**
 * 需要登录才能访问的导航菜单
 */
export const protectedNavigationItems: NavigationItem[] = [];
