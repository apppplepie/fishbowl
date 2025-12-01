'use client';

import React, { useState } from 'react';
import { Input, Button, Select } from 'antd';
import { DeleteOutlined, MenuOutlined, ArrowUpOutlined, ArrowDownOutlined, CodeOutlined, CopyOutlined } from '@ant-design/icons';
import { message } from 'antd';
import type { CodeBlock as CodeBlockType } from '@/app/types/block';

const { TextArea } = Input;

interface CodeBlockProps {
  block: CodeBlockType;
  onChange: (block: CodeBlockType) => void;
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

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plaintext', label: '纯文本' },
];

export default function CodeBlock({
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
}: CodeBlockProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...block,
      code: e.target.value,
    });
  };

  const handleLanguageChange = (value: string) => {
    onChange({
      ...block,
      language: value,
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...block,
      title: e.target.value,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果内容为空且按下删除键，删除整个块（但要检查是否可以删除）
    if (e.key === 'Backspace' && block.code === '' && canDelete) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code);
    message.success('代码已复制到剪贴板');
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
        border: isFocused ? '2px solid #722ed1' : '2px solid transparent',
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
            backgroundColor: '#722ed1',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <CodeOutlined /> 代码块
        </div>
      )}

      {/* 代码块头部 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
        <Input
          placeholder="代码块标题（可选）"
          value={block.title}
          onChange={handleTitleChange}
          style={{ flex: 1, fontSize: '14px' }}
        />
        <Select
          value={block.language}
          onChange={handleLanguageChange}
          options={LANGUAGES}
          style={{ width: 150 }}
          placeholder="选择语言"
        />
        {block.code && (
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            title="复制代码"
          >
            复制
          </Button>
        )}
      </div>

      {/* 代码编辑区 */}
      <TextArea
        value={block.code}
        onChange={handleCodeChange}
        onKeyDown={handleKeyDown}
        placeholder="输入代码，或按删除键移除此块..."
        autoSize={{ minRows: 5, maxRows: 30 }}
        style={{
          fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
          fontSize: '14px',
          lineHeight: '1.6',
          backgroundColor: '#f5f5f5',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          padding: '12px',
        }}
        onFocus={() => setIsFocused(true)}
      />

      {/* 空块提示 */}
      {block.code === '' && isFocused && canDelete && (
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

