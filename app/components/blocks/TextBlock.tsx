'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Dropdown, message, Modal, Segmented } from 'antd';
import type { MenuProps } from 'antd';
import {
  DeleteOutlined,
  MenuOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ToolOutlined,
  FormatPainterOutlined,
  CompressOutlined,
  ClearOutlined,
  AlignLeftOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TextBlock as TextBlockType } from '@/app/types/block';
import { ACCESS_LEVELS } from '@/app/types/block';
import { applyFormat, type FormatOption, findReplace } from '@/app/utils/textFormatter';

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
  isDragging?: boolean;
  sortableHandleProps?: any;
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
  isDragging,
  sortableHandleProps,
}: TextBlockProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [previousContent, setPreviousContent] = useState<string>(''); // 用于撤销
  const textAreaRef = useRef<any>(null);
  
  // 查找替换相关状态
  const [showFindBar, setShowFindBar] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplaceInput, setShowReplaceInput] = useState(false); // 是否显示替换输入框
  const [matches, setMatches] = useState<{ start: number; end: number }[]>([]); // 所有匹配项的位置
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1); // 当前查看的匹配项索引

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...block,
      content: e.target.value,
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

  // 应用格式化
  const handleFormat = (option: FormatOption) => {
    // 保存当前内容用于撤销
    setPreviousContent(block.content);
    
    // 应用格式化
    const formatted = applyFormat(block.content, option);
    onChange({
      ...block,
      content: formatted,
    });

    // 显示提示
    const messages: Record<FormatOption, string> = {
      indent: '已添加首行缩进',
      removeEmpty: '已去除所有空行',
      normalizeBreaks: '已统一段落间距（段落间保留单空行）',
      cleanSpaces: '已清理多余空格',
      chinese: '已应用中文排版',
      removeIndent: '已移除首行缩进',
    };
    message.success(messages[option]);
  };

  // 撤销格式化
  const handleUndo = () => {
    if (previousContent) {
      onChange({
        ...block,
        content: previousContent,
      });
      setPreviousContent('');
      message.success('已撤销');
    } else {
      message.info('没有可撤销的操作');
    }
  };

  // 执行查找，找到所有匹配项的位置
  const performFind = (searchText: string, shouldHighlight: boolean = false) => {
    if (!searchText) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const escapedFind = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFind, 'g');
    const foundMatches: { start: number; end: number }[] = [];
    let match;

    while ((match = regex.exec(block.content)) !== null) {
      foundMatches.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    setMatches(foundMatches);
    
    // 如果有匹配项，设置为第一个（但不立即高亮，避免抢走输入框焦点）
    if (foundMatches.length > 0) {
      setCurrentMatchIndex(0);
      // 只有明确要求高亮时才高亮
      if (shouldHighlight) {
        highlightMatch(foundMatches[0]);
      }
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  // 高亮显示当前匹配项（通过选中文本）
  const highlightMatch = (match: { start: number; end: number }) => {
    if (textAreaRef.current) {
      // Ant Design TextArea 需要访问内部的 textarea DOM 元素
      const textarea = textAreaRef.current.resizableTextArea?.textArea;
      
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(match.start, match.end);
        
        // 滚动到可见区域
        const lineHeight = 24; // 估算行高
        const scrollTop = Math.floor(match.start / 50) * lineHeight; // 粗略计算
        textarea.scrollTop = scrollTop;
      }
    }
  };

  // 上一个匹配项
  const goToPrevMatch = () => {
    if (matches.length === 0) return;
    
    const newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1;
    setCurrentMatchIndex(newIndex);
    // 用户点击按钮时才高亮
    setTimeout(() => highlightMatch(matches[newIndex]), 0);
  };

  // 下一个匹配项
  const goToNextMatch = () => {
    if (matches.length === 0) return;
    
    const newIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0;
    setCurrentMatchIndex(newIndex);
    // 用户点击按钮时才高亮
    setTimeout(() => highlightMatch(matches[newIndex]), 0);
  };

  // 当查找文本改变时，重新查找（但不高亮，避免抢走焦点）
  const handleFindTextChange = (value: string) => {
    setFindText(value);
    performFind(value, false);
  };

  // 替换当前匹配项
  const replaceCurrentMatch = () => {
    if (matches.length === 0 || currentMatchIndex === -1) return;

    // 保存当前内容用于撤销
    setPreviousContent(block.content);

    const match = matches[currentMatchIndex];
    const newContent = 
      block.content.substring(0, match.start) + 
      replaceText + 
      block.content.substring(match.end);

    onChange({
      ...block,
      content: newContent,
    });

    message.success('已替换 1 处');
    
    // 重新查找（内容已改变，这次可以高亮）
    setTimeout(() => {
      performFind(findText, true);
    }, 100);
  };

  // 全部替换
  const replaceAllMatches = () => {
    if (matches.length === 0) return;

    // 保存当前内容用于撤销
    setPreviousContent(block.content);

    const newContent = findReplace(block.content, findText, replaceText);
    onChange({
      ...block,
      content: newContent,
    });

    const count = matches.length;
    message.success(`已替换 ${count} 处`);

    // 清空查找
    setFindText('');
    setReplaceText('');
    setMatches([]);
    setCurrentMatchIndex(-1);
    setShowFindBar(false);
  };

  // 关闭查找栏
  const closeFindBar = () => {
    setShowFindBar(false);
    setFindText('');
    setReplaceText('');
    setMatches([]);
    setCurrentMatchIndex(-1);
    setShowReplaceInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果内容为空且按下删除键，删除整个块（但要检查是否可以删除）
    if (e.key === 'Backspace' && block.content === '' && canDelete) {
      e.preventDefault();
      onDelete();
    }
  };

  // 格式化菜单项
  const formatMenuItems: MenuProps['items'] = [
    {
      key: 'indent',
      icon: <FormatPainterOutlined />,
      label: '首行缩进',
      onClick: () => handleFormat('indent'),
    },
    {
      key: 'removeIndent',
      icon: <AlignLeftOutlined />,
      label: '移除缩进',
      onClick: () => handleFormat('removeIndent'),
    },
    {
      type: 'divider',
    },
    {
      key: 'removeEmpty',
      icon: <CompressOutlined />,
      label: '去除所有空行',
      onClick: () => handleFormat('removeEmpty'),
    },
    {
      key: 'normalizeBreaks',
      icon: <AlignLeftOutlined />,
      label: '统一段落间距',
      onClick: () => handleFormat('normalizeBreaks'),
    },
    {
      key: 'cleanSpaces',
      icon: <ClearOutlined />,
      label: '清理空格',
      onClick: () => handleFormat('cleanSpaces'),
    },
    {
      type: 'divider',
    },
    {
      key: 'chinese',
      icon: <ThunderboltOutlined />,
      label: '中文排版（一键）',
      onClick: () => handleFormat('chinese'),
    },
    {
      type: 'divider',
    },
    {
      key: 'find',
      icon: <SearchOutlined />,
      label: '查找',
      onClick: () => {
        setShowFindBar(true);
        setShowReplaceInput(false);
      },
    },
    {
      key: 'replace',
      icon: <SearchOutlined />,
      label: '查找替换',
      onClick: () => {
        setShowFindBar(true);
        setShowReplaceInput(true);
      },
    },
    {
      key: 'undo',
      icon: <UndoOutlined />,
      label: '撤销',
      disabled: !previousContent,
      onClick: handleUndo,
    },
  ];

  return (
    <>
      <style>{`
        /* 彻底隐藏所有可能的滚动条 */
        .text-block-textarea,
        .text-block-textarea *,
        .text-block-textarea textarea,
        .text-block-textarea .ant-input,
        .text-block-textarea .ant-input-affix-wrapper,
        .text-block-textarea .resizable-text-area,
        .text-block-textarea .resizable-text-area textarea,
        .text-block-textarea .ant-input-affix-wrapper textarea,
        .text-block-textarea .ant-input-affix-wrapper .ant-input {
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE and Edge */
          overflow: -moz-scrollbars-none !important; /* 旧版 Firefox */
        }
        .text-block-textarea textarea::-webkit-scrollbar,
        .text-block-textarea .ant-input::-webkit-scrollbar,
        .text-block-textarea .ant-input-affix-wrapper::-webkit-scrollbar,
        .text-block-textarea .resizable-text-area::-webkit-scrollbar,
        .text-block-textarea .resizable-text-area textarea::-webkit-scrollbar,
        .text-block-textarea .ant-input-affix-wrapper textarea::-webkit-scrollbar,
        .text-block-textarea .ant-input-affix-wrapper .ant-input::-webkit-scrollbar,
        .text-block-textarea *::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari, Opera */
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
          appearance: none !important;
          -webkit-appearance: none !important;
        }
        .text-block-textarea textarea::-webkit-scrollbar-track,
        .text-block-textarea .ant-input::-webkit-scrollbar-track,
        .text-block-textarea *::-webkit-scrollbar-track {
          display: none !important;
        }
        .text-block-textarea textarea::-webkit-scrollbar-thumb,
        .text-block-textarea .ant-input::-webkit-scrollbar-thumb,
        .text-block-textarea *::-webkit-scrollbar-thumb {
          display: none !important;
        }

      `}</style>
      <div
        style={{
          position: 'relative',
          padding: '12px',
          border: isFocused ? '2px solid #1890ff' : '2px solid transparent',
          borderRadius: '8px',
          backgroundColor: isFocused ? '#fafafa' : 'transparent',
          transition: 'all 0.2s',
          marginBottom: '8px',
          opacity: isDragging ? 0.5 : 1,
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
          {...sortableHandleProps}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            cursor: 'grab',
            color: '#999',
            fontSize: '16px',
            userSelect: 'none',
            touchAction: 'none',
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
          style={{
            width: '32px',
            height: '32px',
            color: '#999',
            border: 'none',
            background: 'transparent',
            boxShadow: 'none',
          }}
        />
        <Button
          size="small"
          icon={<ArrowDownOutlined />}
          onClick={onMoveDown}
          disabled={!canMoveDown}
          title="下移"
          style={{
            width: '32px',
            height: '32px',
            color: '#999',
            border: 'none',
            background: 'transparent',
            boxShadow: 'none',
          }}
        />
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? "删除块" : "至少需要保留一个块"}
          style={{
            width: '32px',
            height: '32px',
            color: '#999',
            border: 'none',
            background: 'transparent',
            boxShadow: 'none',
          }}
        />
      </div>

      {/* 查找工具栏 */}
      {showFindBar && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            backgroundColor: '#fff',
            border: '2px solid #1890ff',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 查找输入行 */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Input
                placeholder="查找..."
                value={findText}
                onChange={(e) => handleFindTextChange(e.target.value)}
                style={{ flex: 1 }}
                size="small"
                autoFocus
              />
              <Button 
                size="small" 
                icon={<ArrowUpOutlined />}
                onClick={goToPrevMatch}
                disabled={matches.length === 0}
                title="上一个"
              />
              <Button 
                size="small" 
                icon={<ArrowDownOutlined />}
                onClick={goToNextMatch}
                disabled={matches.length === 0}
                title="下一个"
              />
              <span style={{ fontSize: '12px', color: '#666', minWidth: '80px' }}>
                {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '无匹配'}
              </span>
              <Button 
                size="small" 
                type={showReplaceInput ? 'default' : 'link'}
                onClick={() => setShowReplaceInput(!showReplaceInput)}
              >
                {showReplaceInput ? '隐藏' : '替换'}
              </Button>
              <Button 
                size="small" 
                icon={<ClearOutlined />}
                onClick={closeFindBar}
                title="关闭"
              />
            </div>

            {/* 替换输入行 */}
            {showReplaceInput && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Input
                  placeholder="替换为..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  style={{ flex: 1 }}
                  size="small"
                />
                <Button 
                  size="small"
                  onClick={replaceCurrentMatch}
                  disabled={matches.length === 0}
                >
                  替换
                </Button>
                <Button 
                  size="small"
                  onClick={replaceAllMatches}
                  disabled={matches.length === 0}
                >
                  全部替换
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 块类型标签和格式化按钮 */}
      {isFocused && !showFindBar && (
        <>
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


          {/* 格式化菜单 */}
          {/* <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '12px',
            }}
          >
            <Dropdown menu={{ items: formatMenuItems }} trigger={['click']} placement="bottomRight">
              <Button 
                size="small" 
                icon={<ToolOutlined />}
                style={{
                  backgroundColor: '#52c41a',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                }}
              >
                格式化
              </Button>
            </Dropdown>
          </div> */}
        </>
      )}

      {/* 文本编辑区 */}
      <TextArea
        ref={textAreaRef}
        value={block.content}
        onChange={handleContentChange}
        // onKeyDown={handleKeyDown}
        placeholder="输入文字内容.."
        autoSize={{ minRows: 3 }}
        className="text-block-textarea"
        style={{
          fontSize: '16px',
          lineHeight: '1.8',
          border: 'none',
          boxShadow: 'none',
          padding: '8px 0 86px 0', // 底部留3行空白（16px * 1.8 * 3 ≈ 86px）
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
            }}
            onClick={() => handleAccessLevelChange(level.label)}
          >
            {level.label}
          </Button>
        ))}
      </Space.Compact>

      {/* 空块提示 */}
      {/* {block.content === '' && isFocused && canDelete && (
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
    </>
  );
}

