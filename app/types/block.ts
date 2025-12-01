/**
 * 块编辑器类型定义
 */

export type BlockType = 'text' | 'image' | 'code';

export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
}

// 文字块
export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

// 图片块
export interface ImageBlock extends BaseBlock {
  type: 'image';
  imageUrl: string;
  title?: string;
  description?: string;
  author?: string;
}

// 代码块
export interface CodeBlock extends BaseBlock {
  type: 'code';
  code: string;
  language: string;
  title?: string;
}

export type Block = TextBlock | ImageBlock | CodeBlock;

// 文章数据结构
export interface Article {
  id?: string;
  title: string;
  author: string;
  coverImage?: string;
  tags?: string[];
  blocks: Block[];
  createdAt?: string;
  updatedAt?: string;
}

