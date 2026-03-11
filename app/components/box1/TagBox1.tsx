'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tag, Space, Input } from '@/app/components/ui';
import { PlusOutlined } from '@ant-design/icons';
import { apiGetJson, apiPostJson } from '@/lib/apiClient';
import { message } from '@/app/components/ui';

export interface TagBox1Props {
    tags: string[];
    editMode?: boolean;
    onTagsChange?: (tags: string[]) => void;
    maxTags?: number;
    style?: React.CSSProperties;
}

interface TagOption {
    id: string;
    name: string;
}

/**
 * 标签 Box1 组件
 * 支持显示和编辑标签
 * - 非编辑模式：只显示标签
 * - 编辑模式：支持添加、删除标签
 */
export default function TagBox1({
    tags = [],
    editMode = false,
    onTagsChange,
    maxTags = 10,
    style,
}: TagBox1Props) {
    const [allTags, setAllTags] = useState<TagOption[]>([]);
    const [filteredOptions, setFilteredOptions] = useState<{ value: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showInput, setShowInput] = useState(false);
    const inputRef = useRef<any>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 加载标签列表 - 使用 useCallback 避免每次渲染都创建新函数
    const loadTags = React.useCallback(async () => {
        try {
            const data = await apiGetJson<{ success: boolean; tags?: TagOption[] }>('/api/tags', { requiresAuth: false });

            if (data.success) {
                setAllTags(data.tags || []);
            }
        } catch (error) {
            console.error('加载标签失败:', error);
        }
    }, []);

    // 加载所有标签
    useEffect(() => {
        if (editMode) {
            loadTags();
        }
    }, [editMode, loadTags]);

    // 显示输入框时聚焦
    useEffect(() => {
        if (showInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showInput]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    // 创建新标签 - 使用 useCallback 避免每次渲染都创建新函数
    const createTag = React.useCallback(async (tagName: string) => {
        try {
            const data = await apiPostJson<{ success: boolean; error?: string }>('/api/tags', { name: tagName });

            if (data.success) {
                // 重新加载标签列表
                loadTags();
            }
        } catch (error) {
            console.error('创建标签失败:', error);
        }
    }, [loadTags]);

    // 输入变化时过滤标签 - 使用 useCallback 优化
    const handleSearch = React.useCallback((searchText: string) => {
        setInputValue(searchText);

        if (!searchText.trim()) {
            setFilteredOptions([]);
            return;
        }

        // 过滤出匹配的标签（不包括已选中的）
        setFilteredOptions((prevOptions) => {
            // 使用函数式更新，避免依赖 allTags 和 tags
            return allTags
                .filter(tag =>
                    tag.name.toLowerCase().includes(searchText.toLowerCase()) &&
                    !tags.includes(tag.name)
                )
                .map(tag => ({ value: tag.name }));
        });
    }, [allTags, tags]);

    // 添加标签 - 使用 useCallback 优化
    const addTag = React.useCallback((tagName: string) => {
        const trimmedTag = tagName.trim();

        if (!trimmedTag) {
            return;
        }

        // 检查是否已存在
        if (tags.includes(trimmedTag)) {
            message.warning('标签已存在');
            setInputValue('');
            return;
        }

        // 检查数量限制
        if (tags.length >= maxTags) {
            message.warning(`最多只能添加 ${maxTags} 个标签`);
            setInputValue('');
            return;
        }

        // 添加标签
        const newTags = [...tags, trimmedTag];
        onTagsChange?.(newTags);
        setInputValue('');
        setFilteredOptions([]);
        setShowInput(false);

        // 如果是新标签，添加到标签列表
        setAllTags((prevTags) => {
            if (!prevTags.find(t => t.name === trimmedTag)) {
                createTag(trimmedTag);
            }
            return prevTags;
        });
    }, [tags, maxTags, onTagsChange, createTag]);

    // 删除标签 - 使用 useCallback 优化
    const removeTag = React.useCallback((tagToRemove: string) => {
        const newTags = tags.filter(tag => tag !== tagToRemove);
        onTagsChange?.(newTags);
    }, [tags, onTagsChange]);

    // 处理键盘事件 - 使用 useCallback 优化
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
        // 按 ESC 键取消输入
        else if (e.key === 'Escape') {
            setInputValue('');
            setShowInput(false);
            setFilteredOptions([]);
        }
        // 按退格键删除最后一个标签（当输入框为空时）
        else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    }, [inputValue, tags, addTag, removeTag]);

    // 处理输入框失焦
    const handleBlur = () => {
        // 清除之前的定时器
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
        }

        // 延迟隐藏，以便点击添加按钮时能触发
        blurTimeoutRef.current = setTimeout(() => {
            if (inputValue.trim()) {
                addTag(inputValue);
            } else {
                setShowInput(false);
                setFilteredOptions([]);
            }
            blurTimeoutRef.current = null;
        }, 200);
    };

    if (!editMode) {
        // 非编辑模式：只显示标签
        if (tags.length === 0) {
            return null;
        }

        return (
            <div
                style={{
                    padding: '0 24px 16px 24px',
                    overflow: 'hidden',
                    minWidth: 0,
                    ...style,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        alignItems: 'center',
                        gap: 8,
                        overflow: 'hidden',
                        minWidth: 0,
                    }}
                >
                    {tags.map((tag, index) => (
                        <span key={index} style={{ flexShrink: 0 }}>
                            <Tag
                                id={tag}
                                style={{
                                    padding: '2px 8px',
                                    fontWeight: 500,
                                    fontSize: 12,
                                }}
                            >
                                {tag}
                            </Tag>
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    // 编辑模式：显示标签和输入框
    return (
        <div style={{ marginTop: '12px', ...style }}>
            <Space wrap size="small">
                {/* 已选标签 */}
                {tags.map((tag, index) => (
                    <Tag
                        key={index}
                        id={tag}
                        closable
                        onClose={() => removeTag(tag)}
                        style={{
                            padding: '4px 12px',
                            fontWeight: 500,
                        }}
                    >
                        {tag}
                    </Tag>
                ))}

                {/* 添加标签输入框 */}
                {showInput ? (
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        style={{
                            width: '150px',
                            fontSize: '14px',
                            backgroundColor: 'transparent', // 去掉背景
                            border: '1px solid #d9d9d9',    // 可选，保持输入框边框的颜色
                        }}
                        autoFocus
                    />
                ) : (
                    tags.length < maxTags && (
                        <span
                            onClick={() => setShowInput(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                border: '1px dashedrgba(217, 217, 217, 0)',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: '#000',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#1890ff';
                                e.currentTarget.style.color = '#1890ff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#d9d9d9';
                                e.currentTarget.style.color = '#000';
                            }}
                        >
                            <PlusOutlined style={{ marginRight: '4px' }} /> 添加标签
                        </span>
                    )
                )}
            </Space>
        </div>
    );
}

