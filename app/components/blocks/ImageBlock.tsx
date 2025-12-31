'use client';

import React, { useState } from 'react';
import { Button, Input, Image as AntImage, Segmented, Space, Modal } from 'antd';
import { DeleteOutlined, MenuOutlined, ArrowUpOutlined, ArrowDownOutlined, EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import ImageCardModal from '../ImageCardModal';
import type { ImageBlock as ImageBlockType } from '@/app/types/block';
import { ACCESS_LEVELS } from '@/app/types/block';
import { useResponsive } from '@/app/hooks/useResponsive';

const { confirm } = Modal;

interface ImageBlockProps {
  block: ImageBlockType & { parsedContent?: any };
  mode: 'view' | 'edit'; // 浏览模式或编辑模式
  onChange?: (block: ImageBlockType) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canDelete?: boolean;
  isDragging?: boolean;
  sortableHandleProps?: any;
}

export default function ImageBlock({
  block,
  mode,
  onChange = () => {},
  onDelete = () => {},
  onMoveUp = () => {},
  onMoveDown = () => {},
  canMoveUp = false,
  canMoveDown = false,
  canDelete = false,
  isDragging = false,
  sortableHandleProps,
}: ImageBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { isMobile } = useResponsive();

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...block,
      description: e.target.value,
    });
  };

  const handleAccessLevelChange = (value: string | number) => {
    const level = ACCESS_LEVELS.find(level => level.label === value || level.value === value);
    if (level) {
      onChange({
        ...block,
        access_level: level.value,
      });
    }
  };

  const handleDelete = () => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这个图片块吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        onDelete();
      },
    });
  };

  // 浏览模式渲染
  if (mode === 'view') {
    return (
      <div>
        {/* Access Level 显示 */}
        <div
          style={{
            position: 'relative',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '12px',
              backgroundColor: ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.color || '#52c41a',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 10,
            }}
          >
            {ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.label || 'P'}
          </div>
        </div>
        <div
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'transform 0.2s',
          }}
          onClick={() => setShowModal(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <AntImage
            src={(block.parsedContent as any).url}
            alt="图片"
            preview={false}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              objectFit: 'contain',
            }}
          />
          {(block.parsedContent as any).description && (
            <div style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#999',
            }}>
              {(block.parsedContent as any).description}
            </div>
          )}
        </div>
        {showModal && (
          <ImageCardModal
            visible={showModal}
            imageUrl={(block.parsedContent as any).url}
            title={(block.parsedContent as any).title || ''}
            description={(block.parsedContent as any).description || ''}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'relative',
          padding: '12px',
          border: isHovered ? '2px solid rgb(82, 196, 26)' : '2px solid transparent',
          borderRadius: '8px',
          backgroundColor: isHovered ? '#fafafa' : 'transparent',
          transition: 'all 0.2s',
          marginBottom: '8px',
          opacity: isDragging ? 0.5 : 1,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
      >
        {/* 工具栏 - 移动端放左下角，桌面端在左侧 */}
        <div
          style={{
            position: 'absolute',
            left: isMobile ? '12px' : '-40px',
            top: isMobile ? 'auto' : '12px',
            bottom: isMobile ? '-15px' : 'auto',
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: '4px',
            zIndex: 10,
            opacity: isHovered ? 1 : 0.4,
            transition: 'opacity 0.2s',
            backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
            padding: isMobile ? '2px 4px' : '0',
            borderRadius: isMobile ? '4px' : '0',
            boxShadow: isMobile ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            disabled={!canDelete}
            title={canDelete ? "删除块" : "至少需要保留一个块"}
            style={{
              width: isMobile ? '24px' : '32px',
              height: isMobile ? '24px' : '32px',
              minWidth: isMobile ? '24px' : '32px',
              padding: 0,
              color: canDelete ? '#ff4d4f' : '#999',
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
              fontSize: isMobile ? '11px' : '14px',
            }}
          />
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="上移"
            style={{
              width: isMobile ? '24px' : '32px',
              height: isMobile ? '24px' : '32px',
              minWidth: isMobile ? '24px' : '32px',
              padding: 0,
              color: '#999',
              border: 'none',
              boxShadow: 'none',
              background: 'transparent',
              fontSize: isMobile ? '11px' : '14px',
            }}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="下移"
            style={{
              width: isMobile ? '24px' : '32px',
              height: isMobile ? '24px' : '32px',
              minWidth: isMobile ? '24px' : '32px',
              padding: 0,
              color: '#999',
              border: 'none',
              boxShadow: 'none',
              background: 'transparent',
              fontSize: isMobile ? '11px' : '14px',
            }}
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
            style={{ fontSize: '14px' ,border: 'none',boxShadow: 'none'}}
          />
        </div>

        {/* 访问等级选择器 */}
        <Space.Compact
          style={{
            position: 'absolute',
            bottom: '-15px',
            right: '12px',
          }}
        >
          {ACCESS_LEVELS.map(level => (
            <Button
              key={level.value}
              size="small"
              type={(block.access_level || 1) === level.value ? 'primary' : 'default'}
              variant={(block.access_level || 1) === level.value ? 'solid' : 'filled'}
              style={{
                backgroundColor: (block.access_level || 1) === level.value ? level.color : undefined,
                borderColor: level.color,
                color: (block.access_level || 1) === level.value ? 'white' : level.color,
                fontSize: isMobile ? '11px' : '12px',
                padding: isMobile ? '0 6px' : '0 8px',
                height: isMobile ? '24px' : '28px',
              }}
              onClick={() => handleAccessLevelChange(level.label)}
            >
              {level.label}
            </Button>
          ))}
        </Space.Compact>

        {/* 提示 */}
        {/* <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center',
          }}
        >
          图片内容不可编辑，如需更换请删除后重新添加
        </div> */}
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

