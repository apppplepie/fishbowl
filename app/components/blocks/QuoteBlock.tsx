'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Typography } from '@/app/components/ui/compat';
import { LinkOutlined, PictureOutlined } from '@/app/components/ui/icons';
import { Image as AntImage } from '@/app/components/ui/compat';
import type { QuoteBlock as QuoteBlockType } from '@/app/types/block';
import { apiGetJson } from '@/lib/apiClient';
import { Spin, Modal, Divider, Input, Button } from '@/app/components/ui';

const { Title, Paragraph, Text } = Typography;

interface QuoteBlockProps {
  block: QuoteBlockType;
  onChange?: (updated: QuoteBlockType) => void;
  onReplaceWithBlock?: (newBlock: any) => void; // 用新块替换当前块的回调
  isEditing?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
  isDragging?: boolean;
  sortableHandleProps?: any;
}

interface BlockPreview {
  id: string;
  type: string;
  content: string;
  parsedContent?: any;
  title?: string;
  created_at: string;
  author: string;
  article_title: string;
}

const QuoteBlock: React.FC<QuoteBlockProps> = ({
  block,
  onChange,
  onReplaceWithBlock,
  isEditing = false,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canDelete,
  onDelete,
  isDragging = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [blocks, setBlocks] = useState<BlockPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const pageSize = 10;
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取所有block数据
  const fetchBlocks = async (page: number = 1, query: string = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (query.trim()) {
        params.append('search', query.trim());
      }

      const data = await apiGetJson<{
        success: boolean;
        data: { blocks: any[]; total: number };
        error?: string;
      }>(`/api/blocks?${params}`);

      if (data.success) {
        setBlocks(data.data.blocks);
        setTotal(data.data.total);
      } else {
        console.error('获取block数据失败:', data.error);
      }
    } catch (error) {
      console.error('获取block数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 打开Modal时加载数据，搜索或分页变化时重新加载
  useEffect(() => {
    if (isModalVisible) {
      fetchBlocks(currentPage, searchQuery);
    }
  }, [isModalVisible, currentPage, searchQuery]);

  // 分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 防抖搜索函数
  const debouncedSearch = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1); // 搜索时重置到第一页
    }, 500); // 500ms 防抖延迟
  }, []);

  // 搜索处理（立即执行）
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // 搜索时重置到第一页
  };

  // 搜索输入变化（防抖）
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // 更新输入框显示值

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 如果输入为空，立即搜索（清除搜索）
    if (!value.trim()) {
      setSearchQuery('');
      setCurrentPage(1);
      return;
    }

    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 800); // 800ms 防抖延迟，给用户更多输入时间
  };

  // 清理定时器和处理Modal关闭
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Modal关闭时清理搜索状态
  const handleModalClose = () => {
    setIsModalVisible(false);
    // 清理定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  // 处理内容选择
  const handleContentSelect = (blockData: BlockPreview) => {
    const { type, content, id } = blockData;
    const parsedContent = (blockData as any).parsedContent;

    let newBlock: any = null;

    if (type === 'image') {
      // 图片：创建引用链接
      let imageUrl = '';
      let imageTitle = '';

      if (parsedContent) {
        imageUrl = parsedContent.url || parsedContent.imageUrl || '';
        imageTitle = parsedContent.title || '';
      } else {
        try {
          const imageContent = typeof content === 'string' ? JSON.parse(content) : content;
          imageUrl = imageContent?.imageUrl || imageContent?.url || '';
          imageTitle = imageContent?.title || '';
        } catch {
          imageUrl = typeof content === 'string' ? content : '';
        }
      }

      if (imageUrl) {
        newBlock = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'image',
          order: 0, // 临时值，会被重新排序
          imageUrl: imageUrl,
          title: imageTitle || undefined,
        };
      }
    } else if (type === 'text') {
      // 文字：复制内容
      const textContent = parsedContent?.content || (typeof content === 'string' ? content : '');
      if (textContent) {
        newBlock = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'text',
          order: 0,
          content: textContent,
        };
      }
    } else if (type === 'code') {
      // 代码：复制内容
      let codeContent = '';
      let codeLanguage = 'javascript';
      let codeTitle = '';

      if (parsedContent) {
        codeContent = parsedContent.code || '';
        codeLanguage = parsedContent.language || 'javascript';
        codeTitle = parsedContent.title || '';
      } else {
        try {
          const codeData = typeof content === 'string' ? JSON.parse(content) : content;
          codeContent = codeData?.code || '';
          codeLanguage = codeData?.language || 'javascript';
          codeTitle = codeData?.title || '';
        } catch {
          codeContent = typeof content === 'string' ? content : '';
        }
      }

      if (codeContent) {
        newBlock = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'code',
          order: 0,
          code: codeContent,
          language: codeLanguage,
          title: codeTitle || undefined,
        };
      }
    }

    if (newBlock && onReplaceWithBlock) {
      onReplaceWithBlock(newBlock);
      // 关闭弹窗
      setIsModalVisible(false);
    }
  };

  // 渲染block预览
  const renderBlockPreview = (blockData: BlockPreview) => {
    const { type, content, title, author, article_title, created_at } = blockData;
    const parsedContent = (blockData as any).parsedContent;

    let blockTypeLabel = '';
    let renderedContent: React.ReactNode = null;

    switch (type) {
      case 'text':
        blockTypeLabel = '📝 文字';
        // 渲染HTML内容，限制高度
        const textContent = parsedContent?.content || (typeof content === 'string' ? content : '');
        renderedContent = (
          <div
            style={{
              maxHeight: '120px',
              overflow: 'hidden',
              fontSize: '14px',
              lineHeight: '1.6',
              wordWrap: 'break-word',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
            dangerouslySetInnerHTML={{ __html: textContent }}
          />
        );
        break;

      case 'code':
        blockTypeLabel = '💻 代码';
        // 渲染代码内容，限制高度
        let codeContent = '';
        let codeLanguage = 'javascript';

        if (parsedContent) {
          codeContent = parsedContent.code || '代码内容';
          codeLanguage = parsedContent.language || 'javascript';
        } else {
          try {
            const codeData = typeof content === 'string' ? JSON.parse(content) : content;
            codeContent = codeData?.code || '代码内容';
            codeLanguage = codeData?.language || 'javascript';
          } catch {
            codeContent = typeof content === 'string' ? content : '代码内容';
          }
        }

        renderedContent = (
          <div>
            <div style={{
              fontSize: '12px',
              color: '#999',
              marginBottom: '4px',
              textAlign: 'right'
            }}>
              {codeLanguage}
            </div>
            <Input.TextArea
              value={codeContent}
              readOnly
              style={{
                fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
                fontSize: '13px',
                lineHeight: '1.5',
                backgroundColor: '#f5f5f5',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                maxHeight: '100px',
                overflow: 'hidden',
                overflowX: 'auto',
                resize: 'none',
              }}
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </div>
        );
        break;

      case 'image':
        blockTypeLabel = '🖼️ 图片';
        // 渲染图片缩略图
        let imageUrl = '';
        let imageTitle = '';

        if (parsedContent) {
          // 使用已解析的内容
          imageUrl = parsedContent.url || parsedContent.imageUrl || '';
          imageTitle = parsedContent.title || '';
        } else {
          // 回退到解析content
          try {
            const imageContent = typeof content === 'string' ? JSON.parse(content) : content;
            imageUrl = imageContent?.imageUrl || imageContent?.url || '';
            imageTitle = imageContent?.title || '';
          } catch {
            imageUrl = typeof content === 'string' ? content : '';
          }
        }

        renderedContent = (
          <div style={{ textAlign: 'center', maxHeight: '120px', overflow: 'hidden' }}>
            {imageUrl ? (
              <div>
                <AntImage
                  src={imageUrl}
                  alt={imageTitle || "图片预览"}
                  preview={false}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    // 如果图片加载失败，隐藏图片
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {imageTitle && (
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#666',
                    textAlign: 'center'
                  }}>
                    {imageTitle}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                }}
              >
                <PictureOutlined style={{ fontSize: '24px' }} />
                <div style={{ marginTop: '4px', fontSize: '12px' }}>无图片</div>
              </div>
            )}
          </div>
        );
        break;

      default:
        blockTypeLabel = '📄 内容';
        renderedContent = (
          <Paragraph
            ellipsis={{ rows: 2, expandable: false }}
            style={{ marginBottom: '4px', fontSize: '14px' }}
          >
            {typeof content === 'string' ? content : '其他类型内容'}
          </Paragraph>
        );
    }

    return (
      <Card
        key={blockData.id}
        size="small"
        style={{
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => handleContentSelect(blockData)}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = '#1890ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.borderColor = '#d9d9d9';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              {blockTypeLabel} - 点击引用
            </Text>

            {/* 渲染实际内容 */}
            <div style={{ marginBottom: '8px' }}>
              {renderedContent}
            </div>

            {/* 元信息 */}
            <div style={{ fontSize: '12px', color: '#999' }}>
              <span>{author}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>{article_title}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>{new Date(created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // 引用块不显示任何内容，直接触发弹窗
  useEffect(() => {
    if (!isModalVisible) {
      setIsModalVisible(true);
    }
  }, []);

  // 引用块始终显示Modal，不显示任何块内容
  return (
    <>
      {/* 引用内容Modal */}
      <Modal
        title={
          <div>
            <LinkOutlined style={{ marginRight: '8px' }} />
            {block.title || '内容引用'}
          </div>
        }
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width="80%"
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#666' }}>加载内容中...</div>
          </div>
        ) : (
          <>
            {/* 搜索框 */}
            <div style={{ marginBottom: '20px' }}>
              <Input.Search
                placeholder="搜索内容块... (输入完成后自动搜索)"
                value={inputValue}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                allowClear
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Text type="secondary">
                共 {total} 个内容块，按创建时间倒序排列
                {searchQuery && <span> (搜索: "{searchQuery}")</span>}
              </Text>
            </div>

            <div style={{ marginBottom: '20px' }}>
              {blocks.map(renderBlockPreview)}
            </div>

            {total > pageSize && (
              <>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <Button
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default QuoteBlock;
