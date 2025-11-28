'use client';

import React from 'react';
import type { Card } from '@/app/types/card';
import ImageCard from './ImageCard';
import ArticleCard from './ArticleCard';
import DiaryCard from './DiaryCard';
import QuoteCard from './QuoteCard';
import VideoCard from './VideoCard';
import LinkCard from './LinkCard';

interface CardRendererProps {
  card: Card;
  onClick?: (card: Card) => void;
}

/**
 * 统一的卡片渲染器
 * 根据卡片类型渲染对应的组件
 */
export default function CardRenderer({ card, onClick }: CardRendererProps) {
  const handleClick = () => {
    onClick?.(card);
  };

  switch (card.type) {
    case 'image':
      return <ImageCard card={card} onClick={handleClick} />;
    
    case 'article':
      return <ArticleCard card={card} onClick={handleClick} />;
    
    case 'diary':
      return <DiaryCard card={card} onClick={handleClick} />;
    
    case 'quote':
      return <QuoteCard card={card} onClick={handleClick} />;
    
    case 'video':
      return <VideoCard card={card} onClick={handleClick} />;
    
    case 'link':
      return <LinkCard card={card} onClick={handleClick} />;
    
    default:
      return null;
  }
}

