/**
 * 卡片类型定义
 */

export type CardType = 'image' | 'article' | 'diary' | 'quote' | 'video' | 'link' | 'book';

export interface BaseCard {
  id: number;
  type: CardType;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  tags?: string[];
}

// A. 图片主导卡片
export interface ImageCard extends BaseCard {
  type: 'image';
  imageUrl: string;
  title?: string;
  description?: string;
  likes?: number;
}

// B. 文章主导卡片
export interface ArticleCard extends BaseCard {
  type: 'article';
  title: string;
  excerpt: string;
  coverImage?: string | any; // 封面图 - 支持字符串或对象格式
  author: string;
  readTime: number; // 阅读时间（分钟）
  views?: number;
  comments?: number;
}

// C. 日志卡片
export interface DiaryCard extends BaseCard {
  type: 'diary';
  content: string;
  mood?: string; // 心情emoji
  weather?: string; // 天气emoji
  location?: string;
}

// D. 引言/名言卡片
export interface QuoteCard extends BaseCard {
  type: 'quote';
  quote: string;
  author: string;
  backgroundColor?: string;
}

// E. 视频卡片
export interface VideoCard extends BaseCard {
  type: 'video';
  videoUrl: string;
  thumbnail: string;
  title: string;
  duration: string; // 时长
  views?: number;
}

// F. 链接卡片
export interface LinkCard extends BaseCard {
  type: 'link';
  url: string;
  title: string;
  description: string;
  favicon?: string;
  thumbnail?: string;
}

// G. 书籍卡片
export interface BookCard extends BaseCard {
  type: 'book';
  title: string; // 书名（目录名）
  description: string; // 简介（来自 order_index 最小的文章的摘要）
  coverImage: string | any; // 封面图（来自 order_index 最小的文章的 cover_image 字段）- 支持字符串或对象格式
  author: string; // 作者
  updatedAt: string; // 更新日期
  mainArticleId: string; // 主要文章ID（order_index 最小的文章）
}

export type Card = ImageCard | ArticleCard | DiaryCard | QuoteCard | VideoCard | LinkCard | BookCard;

/** 瀑布流语义：卡片声明“我是 masonry item”，不暴露实现细节 */
export interface MasonryProps {
  masonry?: boolean;
  /** 固定行数（gridRowEnd: span N） */
  span?: number;
  /** 动态高度（由 ResizeObserver 处理） */
  dynamic?: boolean;
  /** 档位/行数提示，用于 line-clamp 与固定高度（来自 masonry-server-utils getLayoutForCard） */
  layout?: import('@/lib/masonry-server-utils').LayoutHint;
}

