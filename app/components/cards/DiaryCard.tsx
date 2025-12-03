'use client';

import React from 'react';
import { Card } from 'antd';
import type { DiaryCard as DiaryCardType } from '@/app/types/card';
import { formatRelativeTime } from '@/app/utils/timeFormat';

interface DiaryCardProps {
  card: DiaryCardType | any; // 支持数据库返回的格式
  onClick?: () => void;
}

/**
 * C. 日志卡片
 * 简短文字记录，适合每日感想、随笔
 */
export default function DiaryCard({ card, onClick }: DiaryCardProps) {
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

  // 根据状态/随机生成渐变背景色
  const getCardGradient = () => {
    // 状态对应的颜色（合并了心情和天气）
    const statusColors: { [key: string]: string } = {
      // 心情
      '😊': 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)', // 开心 - 黄色
      '😢': 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)', // 难过 - 蓝紫色
      '😍': 'linear-gradient(135deg, #fbc2eb 0%, #f093fb 100%)', // 幸福 - 粉紫色
      '😤': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // 生气 - 红橙色
      '😴': 'linear-gradient(135deg, #c1dfc4 0%, #deecdd 100%)', // 困倦 - 淡绿色
      '🤔': 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', // 思考 - 紫黄色
      '💪': 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', // 充满动力 - 红粉色
      '😌': 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // 平静 - 淡紫蓝色
      // 天气
      '☀️': 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)', // 晴天 - 金黄色
      '⛅': 'linear-gradient(135deg, #fbc8d4 0%, #9795f0 100%)', // 多云 - 粉蓝色
      '☁️': 'linear-gradient(135deg, #d7dde8 0%, #b8c6db 100%)', // 阴天 - 灰蓝色
      '🌧️': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // 雨天 - 蓝色
      '⛈️': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 雷雨 - 深紫色
      '🌨️': 'linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%)', // 雪天 - 白色
      '🌙': 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)', // 夜晚 - 深蓝色
    };

    // 随机颜色库
    const randomColors = [
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
      'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)',
      'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
    ];

    // 优先使用状态颜色
    if (status && statusColors[status]) {
      return statusColors[status];
    }
    
    // 使用卡片 ID 或标题生成一个稳定的随机索引（避免每次渲染颜色都变）
    const seed = card.id || card.title || '';
    const hashCode = seed.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const index = hashCode % randomColors.length;
    
    return randomColors[index];
  };

  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        background: getCardGradient(),
        border: 'none',
      }}
      styles={{ body: { padding: '20px' } }}
      onClick={onClick}
    >
      {/* 标题（日期） */}
      {card.title && (
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#333',
        }}>
          {card.title}
        </h4>
      )}

      {/* 日期和状态 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '12px',
        color: '#666',
      }}>
        <span>📝 {formatRelativeTime(card.last_modified || card.publish_date || card.createdAt)}</span>
        {status && <span>{status}</span>}
      </div>

      {/* 日志内容 */}
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '15px',
        lineHeight: '1.8',
        color: '#333',
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
          color: '#999',
          paddingTop: '12px',
          borderTop: '1px solid rgba(0,0,0,0.1)',
        }}>
          <span>📍 {location}</span>
        </div>
      )}
    </Card>
  );
}

