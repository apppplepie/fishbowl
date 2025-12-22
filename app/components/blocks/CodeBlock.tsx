'use client';

import React, { useState } from 'react';
import { Input, Button, Select, Segmented, Space, Modal } from 'antd';
import { DeleteOutlined, MenuOutlined, ArrowUpOutlined, ArrowDownOutlined, CodeOutlined, CopyOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { message } from 'antd';
import type { CodeBlock as CodeBlockType } from '@/app/types/block';
import { ACCESS_LEVELS } from '@/app/types/block';
import { useResponsive } from '@/app/hooks/useResponsive';

const { confirm } = Modal;

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
  isDragging?: boolean;
  sortableHandleProps?: any;
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
  isDragging,
  sortableHandleProps,
}: CodeBlockProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { isMobile } = useResponsive();

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

  const handleAccessLevelChange = (value: string | number) => {
    const level = ACCESS_LEVELS.find(level => level.label === value || level.value === value);
    if (level) {
      onChange({
        ...block,
        access_level: level.value,
      });
    }
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

  const handleDelete = () => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这个代码块吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        onDelete();
      },
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        padding: '12px',
        border: isFocused ? '2px solid #722ed1' : '2px solid transparent',
        borderRadius: '8px',
        backgroundColor: isFocused ? '#fafafa' : 'transparent',
        transition: 'all 0.2s',
        marginBottom: '8px',
        opacity: isDragging ? 0.5 : 1,
      }}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      onTouchStart={() => setIsFocused(true)}
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
          opacity: isFocused ? 1 : 0.4,
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
            boxShadow: 'none',
            background: 'transparent',
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
          </Button>
        )}
      </div>

      {/* 代码编辑区 */}
      <TextArea
        value={block.code}
        onChange={handleCodeChange}
        // onKeyDown={handleKeyDown}
        placeholder="输入代码..."
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

      {/* 空块提示 */}
      {/* {block.code === '' && isFocused && canDelete && (
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
      )} */}
    </div>
  );
}

