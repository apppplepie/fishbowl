'use client';

import React from 'react';
import type { Card, MasonryProps } from '@/app/types/card';
import ImageCard from './ImageCard';
import ArticleCard from './ArticleCard';
import DiaryCard from './DiaryCard';
import QuoteCard from './QuoteCard';
import VideoCard from './VideoCard';
import LinkCard from './LinkCard';
import BookCard from './BookCard';

interface CardRendererProps {
  card: Card;
  onClick?: (card: Card) => void;
  onMouseEnter?: () => void;
  className?: string;
}

/**
 * 统一的卡片渲染器
 * 根据卡片类型渲染对应的组件；可透传 masonry 语义（masonry / span / dynamic）
 */
export default function CardRenderer({
  card,
  onClick,
  onMouseEnter,
  className = '',
  masonry,
  span,
  dynamic: dynamicProp,
}: CardRendererProps & MasonryProps) {
  const handleClick = () => {
    onClick?.(card);
  };

  const masonryProps: MasonryProps = { masonry, span, dynamic: dynamicProp };

  switch (card.type) {
    case 'image':
      return <ImageCard card={card} onClick={handleClick} onMouseEnter={onMouseEnter} className={className} {...masonryProps} />;

    case 'article':
      return <ArticleCard card={card} onClick={handleClick} onMouseEnter={onMouseEnter} className={className} {...masonryProps} />;

    case 'diary':
      return <DiaryCard card={card} onClick={handleClick} onMouseEnter={onMouseEnter} className={className} {...masonryProps} />;

    case 'quote':
      return <QuoteCard card={card} onClick={handleClick} className={className} />;

    case 'video':
      return <VideoCard card={card} onClick={handleClick} className={className} />;

    case 'link':
      return <LinkCard card={card} onClick={handleClick} className={className} />;

    case 'book':
      return <BookCard card={card} onClick={handleClick} onMouseEnter={onMouseEnter} className={className} {...masonryProps} />;

    default:
      return null;
  }
}

