'use client';

import React from 'react';
import type { DiaryCard as DiaryCardType, MasonryProps } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Card } from '@/app/components/ui';
import { InsertRowAboveOutlined } from '@ant-design/icons';

export interface DiaryCardProps {
  card: DiaryCardType | any;
  onClick?: () => void;
  onMouseEnter?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * C. 日志卡片
 * 简短文字记录，适合每日感想、随笔
 */
export default function DiaryCard({
  card,
  onClick,
  onMouseEnter,
  priority = false,
  className = '',
  masonry,
  span,
}: DiaryCardProps & MasonryProps) {
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

  const { status, location, content } = extractDiaryData();

  // 使用卡片背景颜色 Hook，基于日记 ID 生成独特的渐变色
  const colors = useCardBackground(card.id?.toString() || card._id?.toString() || '');

  // 判断是否为表情符号（简单的emoji检测）
  const isEmoji = (str: string): boolean => {
    if (!str || str.trim() === '') return false;
    // 过滤掉常见的非表情文本
    const nonEmojiTexts = ['published', 'draft', 'archived', 'deleted'];
    if (nonEmojiTexts.includes(str.toLowerCase())) return false;
    // 简单的emoji检测：检查是否包含emoji字符（Unicode范围）
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
    return emojiRegex.test(str);
  };

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

  return (
    <Card
      hoverable
      id={card.id?.toString() || card._id?.toString() || ''}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      bodyStyle={{ padding: '20px' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      style={span != null ? { gridRow: `span ${span}` } : undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={span != null ? span : undefined}
      dataCardId={card.id?.toString() || card._id?.toString() || ''}
      dataCardType="DIARY_CARD"
    >
      {/* 标题（日期） */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <InsertRowAboveOutlined style={{ fontSize: '20px'}} />
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: colors.textColor,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {formattedDate}
        </h3>
      </div>

      {/* 日期和状态 */}
      {status && isEmoji(status) && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: '12px',
          fontSize: '16px',
        }}>
          <span>{status}</span>
        </div>
      )}

      {/* 日志内容 */}
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '15px',
        lineHeight: '1.8',
        color: colors.textColor,
        opacity: 0.9,
        whiteSpace: 'pre-wrap',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {content}
      </p>

      {/* 底部信息 */}
      {location && (
        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: '12px',
          color: colors.textColor,
          opacity: 0.6,
          paddingTop: '12px',
          borderTop: `1px solid ${colors.borderColor}`,
        }}>
          <span>📍 {location}</span>
        </div>
      )}
    </Card>
  );
}

