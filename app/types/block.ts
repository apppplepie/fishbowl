/**
 * 块编辑器类型定义
 */

export type BlockType = 'text' | 'image' | 'code' | 'placeholder' | 'quote';

// 访问等级定义
export const ACCESS_LEVELS = [
  { value: 1, label: 'P', color: '#52c41a' },   // 绿色 - 公开Public
  { value: 2, label: 'G', color: '#1890ff' }, // 蓝色 - 一般General
  { value: 3, label: 'M', color: '#faad14' },  // 橙色 - 会员Member
  { value: 4, label: 'A', color: '#f5222d' },   // 红色 - 成人Adult
  { value: 5, label: 'R', color: '#722ed1' },    // 紫色 - 管理员Root
] as const;

export type AccessLevel = typeof ACCESS_LEVELS[number]['value'];

export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
  access_level?: number; // 内容访问等级：1-10，默认为1
}

// 文字块
export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

// 图片块（media_id 供列表/瀑布流封面比例 JOIN media 用，保存时必须保留）
export interface ImageBlock extends BaseBlock {
  type: 'image';
  imageUrl: string;
  title?: string;
  description?: string;
  author?: string;
  /** 媒体表 id，用于封面比例等；保存时勿丢 */
  media_id?: string | null;
  mediaId?: string | null;
}

// 代码块
export interface CodeBlock extends BaseBlock {
  type: 'code';
  code: string;
  language: string;
  title?: string;
}

// 占位块（权限不足时显示）
export interface PlaceholderBlock extends BaseBlock {
  type: 'placeholder';
  original_type: BlockType;
  required_access_level: number;
  user_access_level: number;
  message: string;
}

// 引用块
export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  title?: string;
  description?: string;
}

export type Block = TextBlock | ImageBlock | CodeBlock | PlaceholderBlock | QuoteBlock;

// 文章数据结构
export interface Article {
  id?: string;
  title: string;
  author: string;
  coverImage?: string;
  tags?: string[];
  category_id?: string | null;
  blocks: Block[];
  createdAt?: string;
  updatedAt?: string;
}

