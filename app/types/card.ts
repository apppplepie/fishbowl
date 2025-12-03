/**
 * 卡片类型定义
 */

export type CardType = 'image' | 'article' | 'diary' | 'quote' | 'video' | 'link';

export interface BaseCard {
  id: number;
  type: CardType;
  createdAt: string;
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
  coverImage?: string;
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

export type Card = ImageCard | ArticleCard | DiaryCard | QuoteCard | VideoCard | LinkCard;

