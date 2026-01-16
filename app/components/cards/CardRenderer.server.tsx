import React from 'react';
import type { Card } from '@/app/types/card';
import ImageCardServer from './ImageCard.server';
import ArticleCardServer from './ArticleCard.server';

interface CardRendererServerProps {
  card: Card;
  priority?: boolean;
}

/**
 * Server Component 版本的卡片渲染器
 * 用于首屏 SSR，无客户端交互
 */
export default function CardRendererServer({ card, priority = false }: CardRendererServerProps) {
  switch (card.type) {
    case 'image':
      return <ImageCardServer card={card} priority={priority} />;

    case 'article':
      return <ArticleCardServer card={card} priority={priority} />;

    // 其他类型暂时用 ArticleCard 兜底
    default:
      return <ArticleCardServer card={card} priority={priority} />;
  }
}

