'use client';

import React, { useState } from 'react';
import { Button, Input, Image as AntImage } from 'antd';
import { DeleteOutlined, MenuOutlined, ArrowUpOutlined, ArrowDownOutlined, EyeOutlined } from '@ant-design/icons';
import ImageCardModal from '../ImageCardModal';
import type { ImageBlock as ImageBlockType } from '@/app/types/block';

interface ImageBlockProps {
  block: ImageBlockType;
  onChange: (block: ImageBlockType) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export default function ImageBlock({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  isDragging,
}: ImageBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...block,
      description: e.target.value,
    });
  };


  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        style={{
          position: 'relative',
          padding: '12px',
          border: isHovered ? '2px solid #1890ff' : '2px solid transparent',
          borderRadius: '8px',
          backgroundColor: isHovered ? '#fafafa' : 'transparent',
          transition: 'all 0.2s',
          marginBottom: '8px',
          opacity: isDragging ? 0.5 : 1,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 工具栏 - 固定显示 */}
        <div
          style={{
            position: 'absolute',
            left: '-40px',
            top: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 10,
            opacity: isHovered ? 1 : 0.4,
            transition: 'opacity 0.2s',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              cursor: 'grab',
              color: '#999',
              fontSize: '16px',
            }}
            title="按住拖动排序"
          >
            <MenuOutlined />
          </div>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="上移"
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="下移"
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? "删除块" : "至少需要保留一个块"}
          />
        </div>

        {/* 块类型标签 */}
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              left: '12px',
              backgroundColor: '#52c41a',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 10,
            }}
          >
            图片块
          </div>
        )}

        {/* 图片预览 */}
        <div
          style={{
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={() => setShowModal(true)}
        >
          {block.imageUrl ? (
            <AntImage
              src={block.imageUrl}
              alt="图片"
              preview={false}
              style={{
                width: '100%',
                borderRadius: '8px',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px',
              }}
            >
              图片URL为空
            </div>
          )}
          {isHovered && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <EyeOutlined />
              点击查看大图
            </div>
          )}
        </div>

        {/* 图片信息编辑 */}
        <div style={{ marginTop: '12px' }}>
          <Input
            placeholder="图片描述（可选）"
            value={block.description}
            onChange={handleDescriptionChange}
            style={{ fontSize: '14px' }}
          />
        </div>

        {/* 提示 */}
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center',
          }}
        >
          图片内容不可编辑，如需更换请删除后重新添加
        </div>
      </div>

      {/* 图片查看弹窗 */}
      <ImageCardModal
        visible={showModal}
        imageUrl={block.imageUrl}
        title="图片预览"
        description={block.description || ''}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

