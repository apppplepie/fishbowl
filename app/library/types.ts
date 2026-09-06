import type { ComponentType } from 'react';
import type { GenericIndexTreeConfig } from '@/app/components/sidebar/GenericTree';

/** 书房的三个视角：文（散篇）/ 书（成册）/ 画（图） */
export type LibraryViewKey = 'doc' | 'book' | 'art';

export interface FeedFetchArgs {
  offset: number;
  limit: number;
  categoryId: string | null;
  keyword: string;
  signal: AbortSignal;
}

export interface FeedPage {
  cards: any[];
  hasMore: boolean;
  nextOffset: number;
  /** 后端已按关键词筛过；为 false 时前端再兜一次关键词过滤 */
  searchedOnServer: boolean;
}

/** 视角自己的卡片渲染区拿到的东西 */
export interface LibraryCardsProps {
  cards: any[];
  containerWidth: number;
  columns: number;
  columnWidth: number;
  categoryId: string | null;
  /** 删除模式（目前只有「书」用得上） */
  deleteMode: boolean;
  /** 数据变了（删除、发布）后重新拉当前列表 */
  reload: () => void;
}

/** 视角自己的悬浮按钮拿到的东西 */
export interface LibraryFloatProps {
  categoryId: string | null;
  deleteMode: boolean;
  setDeleteMode: (enabled: boolean) => void;
  reload: () => void;
  /** 强制重建左侧目录树 */
  refreshTree: () => void;
}

export interface LibraryView {
  key: LibraryViewKey;
  /** tab 上的字 */
  label: string;
  /** 每页条数 */
  pageSize: number;
  /** box1 是否显示搜索框 + 标签筛选 */
  filters: boolean;
  /** 左侧目录树配置；不给表示该视角没有目录 */
  tree?: GenericIndexTreeConfig;
  /** 传给 PageShell 的吸附位置；不给则用 window 滚动到 15vh */
  scrollSnapVh?: number;
  fetchPage: (args: FeedFetchArgs) => Promise<FeedPage>;
  Cards: ComponentType<LibraryCardsProps>;
  Float?: ComponentType<LibraryFloatProps>;
}
