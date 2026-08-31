'use client';

import React, { useState } from 'react';
import './card-blocks.css';
import { UserOutlined, DeleteOutlined, ReadOutlined } from '@/app/components/ui/icons';
import type { BookCard as BookCardType, MasonryProps } from '@/app/types/card';
import DeleteBookModal from '@/app/components/modal/DeleteBookModal';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { getImageSrc } from '@/lib/imageUrl';
import { Card } from '@/app/components/ui';

interface BookCardProps {
  card: BookCardType;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onDeleteSuccess?: () => void;
  showDeleteIcon?: boolean;
  className?: string;
}

/**
 * G. 书籍卡片
 * 展示书籍信息，包含封面图、书名、作者、更新日期
 * 封面图来自该目录下 order_index 最小的文章的第一张图片
 * 点击跳转到书籍详情页 /book/[id]
 */
export default function BookCard({
  card,
  onClick,
  onMouseEnter,
  onDeleteSuccess,
  showDeleteIcon = false,
  className = '',
  masonry,
  span,
}: BookCardProps & MasonryProps) {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  
  // 使用卡片背景颜色 Hook，基于书籍 ID 生成独特的渐变色
  const colors = useCardBackground(card.id?.toString() || (card as any)._id?.toString() || '');

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
    setDeleteModalVisible(true);
  };

  // 处理 coverImage 可能是字符串或对象的情况
  const coverImageUrl = typeof card.coverImage === 'string' 
    ? card.coverImage 
    : card.coverImage?.url;
  const coverImageTitle = typeof card.coverImage === 'object' 
    ? card.coverImage?.title 
    : undefined;
  
  // 判断是否为默认封面图片
  const isDefaultCover = coverImageUrl === '/default-book-cover.jpg';

  return (
    <Card
      hoverable={!showDeleteIcon}
      id={card.id?.toString() || (card as any)._id?.toString() || ''}
      onClick={showDeleteIcon ? undefined : onClick}
      onMouseEnter={onMouseEnter}
      borderSides="x"
      style={{
        opacity: showDeleteIcon ? 0.9 : 1,
        cursor: showDeleteIcon ? 'default' : 'pointer',
        ...(span != null && { gridRow: `span ${span}` }),
      }}
      bodyStyle={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}
      className={[className, masonry && 'masonry-item'].filter(Boolean).join(' ') || undefined}
      dataMasonry={masonry || undefined}
      dataMasonrySpan={span != null ? span : undefined}
      dataCardId={card.id?.toString() || (card as any)._id?.toString() || ''}
      dataCardType="BOOK_CARD"
      cover={
        <div style={{
          position: 'relative',
          width: '100%',
          height: '280px', // 固定高度
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          {/* 占位符 - 始终渲染，避免 conditional render */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: (!coverImageUrl || imageLoadFailed) ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
            }}
          >
             {card.title}
          </div>
          {/* 图片 - 始终渲染，使用 opacity 控制显示 */}
          {coverImageUrl && (
            <img
              src={getImageSrc(coverImageUrl) ?? coverImageUrl}
              alt={coverImageTitle || card.title}
              width={400}
              height={280}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: (!imageLoadFailed) ? 1 : 0,
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onError={() => {
                setImageLoadFailed(true);
                // 只在非默认图片加载失败时记录错误
                if (!isDefaultCover) {
                  console.error('BookCard 封面图片加载失败:', coverImageUrl);
                }
              }}
            />
          )}
          {/* 删除按钮 - 删除模式下始终显示 */}
          {showDeleteIcon && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
              }}
            >
              <div
                onClick={handleDeleteClick}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 77, 79, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <DeleteOutlined style={{ color: 'white', fontSize: '16px' }} />
              </div>
            </div>
          )}

          {/* 渐变遮罩 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }} />
        </div>
      }
    >
      <div className="card-block--pad-top" aria-hidden />
      <div className="card-block-title card-block--title" style={{ margin: 0 }}>
        {/* <ReadOutlined style={{ fontSize: '20px' }} /> */}
        <h3 className="card-block-title__text" style={{ color: colors.textColor, margin: 0 }}>
          {card.title}
        </h3>
      </div>
      <div className="card-block--gap" aria-hidden />
      {card.description ? (
        <>
          <div className="card-block-excerpt-wrap card-block--excerpt-lines-2">
            <p className="card-block-excerpt card-block--excerpt-lines-2" style={{ color: colors.textColor, opacity: 0.8, whiteSpace: 'pre-wrap' }}>
              {card.description}
            </p>
          </div>
          <div className="card-block--gap" aria-hidden />
        </>
      ) : null}
      <div className="card-block-meta card-block--author" style={{ borderTop: `1px solid ${colors.borderColor}`, color: colors.textColor, opacity: 0.7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserOutlined />
          <span>{card.author}</span>
        </div>
      </div>
      <div className="card-block--pad-bottom" aria-hidden />

      {/* 删除书籍确认对话框 */}
      <DeleteBookModal
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onSuccess={() => {
          setDeleteModalVisible(false);
          onDeleteSuccess?.();
        }}
        bookId={(card as any).categoryId || String(card.id)}
        bookTitle={card.title}
      />
    </Card>
  );
}
