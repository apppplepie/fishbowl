'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AutoComplete } from '@/app/components/ui/compat';
import { Plus } from 'lucide-react';
import { Input, Space, message } from '@/app/components/ui';
import { apiGetJson, apiPostJson } from '@/lib/apiClient';
import { Tag } from '@/app/components/ui';

interface TagInputProps {
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

interface TagOption {
  id: string;
  name: string;
}

/**
 * 标签输入组件
 * 特点：
 * 1. 输入时自动匹配已有标签，显示下拉框供选择
 * 2. 按空格键自动创建新标签
 * 3. 支持删除已选标签
 * 4. 自动去重
 */
export default function TagInput({
  value = [],
  onChange,
  placeholder = '输入标签，按空格添加',
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<{ value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<any>(null);

  // 加载所有标签
  useEffect(() => {
    loadTags();
  }, []);

  // 加载标签列表
  const loadTags = async () => {
    try {
      const data = await apiGetJson<{ success: boolean; tags?: TagOption[] }>('/api/tags');
      
      if (data.success) {
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  // 输入变化时过滤标签
  const handleSearch = (searchText: string) => {
    setInputValue(searchText);
    
    if (!searchText.trim()) {
      setFilteredOptions([]);
      return;
    }

    // 过滤出匹配的标签（不包括已选中的）
    const filtered = allTags
      .filter(tag => 
        tag.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !value.includes(tag.name)
      )
      .map(tag => ({ value: tag.name }));

    setFilteredOptions(filtered);
  };

  // 选择标签（从下拉框）
  const handleSelect = (selectedValue: string) => {
    addTag(selectedValue);
  };

  // 添加标签
  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim();
    
    if (!trimmedTag) {
      return;
    }

    // 检查是否已存在
    if (value.includes(trimmedTag)) {
      message.warning('标签已存在');
      setInputValue('');
      return;
    }

    // 检查数量限制
    if (value.length >= maxTags) {
      message.warning(`最多只能添加 ${maxTags} 个标签`);
      setInputValue('');
      return;
    }

    // 添加标签
    const newTags = [...value, trimmedTag];
    onChange?.(newTags);
    setInputValue('');
    setFilteredOptions([]);

    // 如果是新标签，添加到标签列表
    if (!allTags.find(t => t.name === trimmedTag)) {
      createTag(trimmedTag);
    }
  };

  // 创建新标签
  const createTag = async (tagName: string) => {
    try {
      const data = await apiPostJson<{ success: boolean; error?: string }>('/api/tags', { name: tagName });
      
      if (data.success) {
        // 重新加载标签列表
        loadTags();
      }
    } catch (error) {
      console.error('创建标签失败:', error);
    }
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    onChange?.(newTags);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 按空格键添加标签
    if (e.key === ' ' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
    // 按回车键添加标签
    else if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
    // 按退格键删除最后一个标签（当输入框为空时）
    else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 已选标签 */}
      <Space size={[8, 8]} wrap style={{ marginBottom: value.length > 0 ? 8 : 0 }}>
        {value.map((tag, index) => (
          <Tag
            key={index}
            id={tag}
            closable
            onClose={() => removeTag(tag)}
            style={{ padding: '4px 8px', fontSize: '14px' }}
          >
            {tag}
          </Tag>
        ))}
      </Space>

      {/* 输入框 */}
      {value.length < maxTags && (
        <AutoComplete
          ref={inputRef}
          value={inputValue}
          options={filteredOptions}
          onSearch={handleSearch}
          onSelect={handleSelect}
          style={{ width: '100%' }}
          placeholder={placeholder}
          notFoundContent={
            inputValue.trim() ? (
              <div style={{ padding: '8px 12px', color: '#999' }}>
                按空格或回车创建新标签 "<strong>{inputValue}</strong>"
              </div>
            ) : null
          }
        >
          <Input
            size="large"
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            suffix={
              <span style={{ color: '#999', fontSize: '12px' }}>
                {value.length}/{maxTags}
              </span>
            }
          />
        </AutoComplete>
      )}

      {/* 提示信息 */}
      {/* <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
        💡 输入标签名称，按<strong>空格</strong>或<strong>回车</strong>添加标签，支持从已有标签中选择
      </div> */}
    </div>
  );
}

