'use client';

import React from 'react';
import './card-blocks.css';
import type { DiaryCard as DiaryCardType, MasonryProps } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Card } from '@/app/components/ui';
import { InsertRowAboveOutlined } from '@/app/components/ui/icons';

export interface DiaryCardProps {
  card: DiaryCardType | any;
  onClick?: () => void;
  onMouseEnter?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * C. 日志卡片（块状样式见 card-blocks.css）
 */
export default function DiaryCard({
  card,
  onClick,
  onMouseEnter,
  priority = false,
  className = '',
  masonry,
  span,
  layout,
}: DiaryCardProps & MasonryProps) {
  const excerptLines = Math.min(4, Math.max(1, layout?.excerptLines ?? 4));
  const hasEmoji = (layout?.emojiWeatherSpan ?? 0) > 0;
  const titleLines = Math.max(1, layout?.titleLines ?? 1);
  // 从 excerpt 或 content 中提取日志内容和元信息
  const extractDiaryData = () => {
    const rawContent = card.content || card.excerpt || '';
    
    // 解析元信息（新格式：状态：😊 | 地点：北京\n\n正文内容）
    // 也兼容旧格式（心情：😊 | 天气：☀️ | 地点：北京）
    const lines = rawContent.split('\n');
    let status = card.status || card.mood || card.weather || '';
    let location = card.location || '';
    let content = rawContent;
    
    // 检查第一行是否包含元信息
    if (lines.length > 0 && lines[0].includes('：')) {
      const metaLine = lines[0];
      const parts = metaLine.split('|').map((p: string) => p.trim());
      
      parts.forEach((part: string) => {
        // 新格式
        if (part.startsWith('状态：')) {
          status = part.replace('状态：', '').trim();
        } 
        // 兼容旧格式
        else if (part.startsWith('心情：')) {
          status = part.replace('心情：', '').trim();
        } else if (part.startsWith('天气：')) {
          status = part.replace('天气：', '').trim();
        } 
        // 地点
        else if (part.startsWith('地点：')) {
          location = part.replace('地点：', '').trim();
        }
      });
      
      // 移除第一行元信息和空行，保留正文
      content = lines.slice(1).join('\n').trim();
      
      // 如果第二行是空行，从第三行开始
      if (content.startsWith('\n')) {
        content = content.substring(1).trim();
      }
    }
    
    return { status, location, content };
  };

  const { location, content } = extractDiaryData();

  // 使用卡片背景颜色 Hook，基于日记 ID 生成独特的渐变色
  const colors = useCardBackground(card.id?.toString() || card._id?.toString() || '');

  // 地点：type 上的 location 或 content 里解析出的 location；3 span 块只装地点，没有就不显示该块
  const locationText = (card.location ?? location ?? '').trim();
  const hasLocation = !!locationText;

  // 格式化日期：从月份开始显示到分钟 (MM-DD HH:mm)
  const formatDateFromMonth = (dateString: string | Date | undefined | null): string => {
    if (!dateString) {
      return '未知日期';
    }

    const date = new Date(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString);
      return '未知日期';
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month}-${day} ${hours}:${minutes}`;
  };

  // 获取发布日期
  const publishDate = card.updatedAt || card.publishedAt || card.createdAt;
  const formattedDate = formatDateFromMonth(publishDate);

  // 有地点且 layout 分配了 3 span 时才渲染地点块
  const showLocationBlock = hasEmoji && hasLocation;

  return (
    <Card
      hoverable
      id={card.id?.toString() || card._id?.toString() || ''}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      borderSides="x"
      bodyStyle={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      style={span != null ? { gridRow: `span ${span}` } : undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={span != null ? span : undefined}
      dataCardId={card.id?.toString() || card._id?.toString() || ''}
      dataCardType="DIARY_CARD"
    >
      <div className="card-block--pad-top" aria-hidden />
      <div className="card-block-title card-block--title" style={{ ['--title-lines' as any]: titleLines }}>
        {/* <InsertRowAboveOutlined style={{ fontSize: '20px' }} /> */}
        <h3 className="card-block-title__text" style={{ color: colors.textColor }}>
          {formattedDate}
        </h3>
      </div>
      <div className="card-block--gap" aria-hidden />
      {showLocationBlock && (
        <>
          <div className="card-block-emoji card-block--emoji-weather" title="地点">
            <span style={{ opacity: 0.9 }}>📍 {locationText}</span>
          </div>
          <div className="card-block--gap" aria-hidden />
        </>
      )}
      <div className={`card-block-excerpt-wrap card-block--excerpt-lines-${excerptLines}`}>
        <p
          className={`card-block-excerpt card-block--excerpt-lines-${excerptLines}`}
          style={{ fontSize: '15px', lineHeight: '24px', color: colors.textColor, opacity: 0.9 }}
        >
          {content.replace(/\n/g, ' ')}
          {hasLocation && !showLocationBlock && (
            <span style={{ opacity: 0.8, marginLeft: '0.5em' }}>📍 {locationText}</span>
          )}
        </p>
      </div>
      {/* 尾部留白：与 card-blocks.css 的 .card-block--pad-bottom 一致，使用全局变量 --pad-bottom-span */}
      <div className="card-block--pad-bottom" aria-hidden />
    </Card>
  );
}

