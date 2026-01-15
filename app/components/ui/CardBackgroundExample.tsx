/**
 * 卡片背景颜色使用示例
 * 
 * 这个文件展示了如何在不同类型的卡片中使用渐变背景系统
 */

import React from 'react';
import { useCardBackground, getCardBackgroundStyle } from './useCardBackground';

// ============ 示例 1: 使用 Hook 的简单卡片 ============
export function SimpleCard({ id, title, content }: { id: string; title: string; content: string }) {
  const colors = useCardBackground(id);

  return (
    <div
      style={{
        background: colors.background,
        color: colors.textColor,
        border: `1px solid ${colors.borderColor}`,
        boxShadow: `0 4px 12px ${colors.shadowColor}`,
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <h3>{title}</h3>
      <p style={{ opacity: 0.8 }}>{content}</p>
    </div>
  );
}

// ============ 示例 2: 使用辅助函数的卡片 ============
export function QuickCard({ id, title }: { id: string; title: string }) {
  return (
    <div
      style={{
        ...getCardBackgroundStyle(id, {
          withBorder: true,
          withShadow: true,
          shadowIntensity: 'medium',
        }),
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <h4>{title}</h4>
    </div>
  );
}

// ============ 示例 3: 带内嵌元素的复杂卡片 ============
export function ComplexCard({
  id,
  title,
  description,
  tags,
}: {
  id: string;
  title: string;
  description: string;
  tags: string[];
}) {
  const colors = useCardBackground(id);

  return (
    <div
      style={{
        background: colors.background,
        color: colors.textColor,
        border: `1px solid ${colors.borderColor}`,
        boxShadow: `0 8px 24px ${colors.shadowColor}`,
        borderRadius: '16px',
        padding: '24px',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* 标题 */}
      <h2 style={{ margin: '0 0 12px 0', fontWeight: 600 }}>{title}</h2>

      {/* 描述 */}
      <p style={{ margin: '0 0 16px 0', opacity: 0.85, lineHeight: 1.6 }}>{description}</p>

      {/* 标签 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tags.map((tag, index) => (
          <span
            key={index}
            style={{
              background: colors.pillBg,
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 分隔线 */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${colors.borderColor}`,
          fontSize: '14px',
          opacity: 0.6,
        }}
      >
        Card ID: {id.substring(0, 8)}...
      </div>
    </div>
  );
}

// ============ 示例 4: 书籍卡片应用 ============
export function BookCard({
  id,
  title,
  author,
  rating,
}: {
  id: string;
  title: string;
  author: string;
  rating: number;
}) {
  const colors = useCardBackground(id);

  return (
    <div
      style={{
        background: colors.background,
        color: colors.textColor,
        border: `1px solid ${colors.borderColor}`,
        boxShadow: `0 6px 20px ${colors.shadowColor}`,
        borderRadius: '12px',
        padding: '20px',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: '0 0 auto', opacity: 0.75, fontSize: '14px' }}>by {author}</p>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.borderColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', opacity: 0.6 }}>Rating</span>
        <span style={{ fontWeight: 600 }}>{'⭐'.repeat(rating)}</span>
      </div>
    </div>
  );
}

// ============ 示例 5: 产品卡片应用 ============
export function ProductCard({
  id,
  name,
  price,
  discount,
}: {
  id: string;
  name: string;
  price: number;
  discount?: number;
}) {
  const colors = useCardBackground(id);

  return (
    <div
      style={{
        background: colors.background,
        color: colors.textColor,
        border: `1px solid ${colors.borderColor}`,
        boxShadow: `0 4px 16px ${colors.shadowColor}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
      }}
    >
      {discount && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          -{discount}%
        </div>
      )}

      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{name}</h3>

      <div style={{ fontSize: '24px', fontWeight: 700 }}>
        ${discount ? (price * (1 - discount / 100)).toFixed(2) : price.toFixed(2)}
      </div>

      {discount && (
        <div style={{ fontSize: '14px', opacity: 0.5, textDecoration: 'line-through' }}>
          ${price.toFixed(2)}
        </div>
      )}
    </div>
  );
}

/**
 * 使用指南：
 * 
 * 1. 导入 Hook：
 *    import { useCardBackground } from '@/app/components/ui/useCardBackground';
 * 
 * 2. 在组件中使用：
 *    const colors = useCardBackground(uniqueId);
 * 
 * 3. 应用颜色：
 *    - colors.background: 渐变背景
 *    - colors.textColor: 主文本颜色
 *    - colors.borderColor: 边框颜色
 *    - colors.shadowColor: 阴影颜色
 *    - colors.pillBg: 标签/徽章背景色
 * 
 * 4. 快速应用（使用辅助函数）：
 *    import { getCardBackgroundStyle } from '@/app/components/ui/useCardBackground';
 *    <div style={getCardBackgroundStyle(id, { shadowIntensity: 'heavy' })} />
 */

