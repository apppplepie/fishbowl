'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space } from 'antd';
import { DeleteOutlined, MenuOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { TextBlock as TextBlockType } from '@/app/types/block';

const { TextArea } = Input;

interface TextBlockProps {
  block: TextBlockType;
  onChange: (block: TextBlockType) => void;
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

export default function TextBlock({
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
}: TextBlockProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textAreaRef = useRef<any>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...block,
      content: e.target.value,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果内容为空且按下删除键，删除整个块（但要检查是否可以删除）
    if (e.key === 'Backspace' && block.content === '' && canDelete) {
      e.preventDefault();
      onDelete();
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      style={{
        position: 'relative',
        padding: '12px',
        border: isFocused ? '2px solid #1890ff' : '2px solid transparent',
        borderRadius: '8px',
        backgroundColor: isFocused ? '#fafafa' : 'transparent',
        transition: 'all 0.2s',
        marginBottom: '8px',
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
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
          opacity: isFocused ? 1 : 0.4,
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
      {isFocused && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '12px',
            backgroundColor: '#1890ff',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          文字块
        </div>
      )}

      {/* 文本编辑区 */}
      <TextArea
        ref={textAreaRef}
        value={block.content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        placeholder="输入文字内容，或按删除键移除此块..."
        autoSize={{ minRows: 3, maxRows: 20 }}
        style={{
          fontSize: '16px',
          lineHeight: '1.8',
          border: 'none',
          boxShadow: 'none',
          padding: '8px 0',
        }}
        onFocus={() => setIsFocused(true)}
      />

      {/* 空块提示 */}
      {block.content === '' && isFocused && canDelete && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            fontSize: '12px',
            color: '#999',
          }}
        >
          按 Backspace 删除此块
        </div>
      )}
    </div>
  );
}

