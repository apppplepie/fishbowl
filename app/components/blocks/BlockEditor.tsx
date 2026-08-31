'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Upload, Dropdown } from '@/app/components/ui/compat';
import { Button, Space, Modal, Input, message } from '@/app/components/ui';
import type { MenuProps } from '@/app/components/ui/compat';
import {
  PlusOutlined,
  FileTextOutlined,
  PictureOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  FormatPainterOutlined,
  LinkOutlined,
} from '@/app/components/ui/icons';
import type { UploadFile } from '@/app/components/ui/compat';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import CodeBlock from './CodeBlock';
import PlaceholderBlock from './PlaceholderBlock';
import QuoteBlock from './QuoteBlock';
import type { Block, TextBlock as TextBlockType, ImageBlock as ImageBlockType, CodeBlock as CodeBlockType, PlaceholderBlock as PlaceholderBlockType, QuoteBlock as QuoteBlockType } from '@/app/types/block';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { useResponsive } from '@/app/hooks/useResponsive';
import { uploadFileWithProgress } from '@/lib/uploadClient';
import { apiGetJson } from '@/lib/apiClient';
import { Spin } from '@/app/components/ui';

export type BlocksUpdater = (prev: Block[]) => Block[];

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[] | BlocksUpdater) => void;
  showAddButton?: boolean;
}

interface SortableItemProps {
  id: string;
  index: number;
  block: Block;
  onBlockChange: (index: number, updatedBlock: Block) => void;
  deleteBlock: (index: number) => void;
  moveBlockUp: (index: number) => void;
  moveBlockDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
}

interface SortableHandleProps {
  listeners: any;
  attributes: any;
}

const SortableItem = React.memo(function SortableItem({
  id,
  index,
  block,
  onBlockChange,
  deleteBlock,
  moveBlockUp,
  moveBlockDown,
  canMoveUp,
  canMoveDown,
  canDelete,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handleBlockChange = useCallback((updatedBlock: Block) => {
    onBlockChange(index, updatedBlock);
  }, [index, onBlockChange]);

  const commonProps = {
    onMoveUp: () => moveBlockUp(index),
    onMoveDown: () => moveBlockDown(index),
    canMoveUp,
    canMoveDown,
    canDelete,
    isDragging,
  };

  const sortableHandleProps = useMemo(() => ({ ...attributes, ...listeners }), [attributes, listeners]);

  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return (
          <TextBlock
            key={block.id}
            block={block}
            mode="edit"
            onChange={handleBlockChange}
            onDelete={() => deleteBlock(index)}
            sortableHandleProps={sortableHandleProps}
            {...commonProps}
          />
        );
      case 'image':
        return (
          <ImageBlock
            key={block.id}
            block={block}
            mode="edit"
            onChange={handleBlockChange}
            onDelete={() => deleteBlock(index)}
            sortableHandleProps={sortableHandleProps}
            {...commonProps}
          />
        );
      case 'code':
        return (
          <CodeBlock
            key={block.id}
            block={block}
            mode="edit"
            onChange={handleBlockChange}
            onDelete={() => deleteBlock(index)}
            sortableHandleProps={sortableHandleProps}
            {...commonProps}
          />
        );
      case 'placeholder':
        return (
          <PlaceholderBlock
            key={block.id}
            block={block as PlaceholderBlockType}
          />
        );
      case 'quote':
        return (
          <QuoteBlock
            key={block.id}
            block={block as QuoteBlockType}
            onReplaceWithBlock={(newBlock) => onBlockChange(index, newBlock)}
            onChange={handleBlockChange}
            isEditing={true}
            onDelete={() => deleteBlock(index)}
            sortableHandleProps={sortableHandleProps}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
    }}>
      {renderBlock()}
    </div>
  );
});

// 图片压缩工具函数
function compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('压缩失败'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type || 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// DnD 传感器配置提到模块级，避免每次渲染新对象导致 useSensors 不稳定
const pointerConstraint = { distance: 8, delay: 100, tolerance: 5 };
const touchConstraint = { delay: 100, tolerance: 5 };

export default function BlockEditor({ blocks, onChange, showAddButton = true }: BlockEditorProps) {
  const { isMobile } = useResponsive();
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);
  const [addImageModalVisible, setAddImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [insertPosition, setInsertPosition] = useState<number>(-1);
  const [quotePickerVisible, setQuotePickerVisible] = useState(false);
  const [pickerBlocks, setPickerBlocks] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerInputValue, setPickerInputValue] = useState('');
  const pickerPageSize = 10;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: pointerConstraint }),
    useSensor(TouchSensor, { activationConstraint: touchConstraint }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleBlockChange = useCallback((index: number, updatedBlock: Block) => {
    onChange((prev) => {
      const next = [...prev];
      next[index] = updatedBlock;
      return next;
    });
  }, [onChange]);

  const deleteBlock = useCallback((index: number) => {
    const prev = blocksRef.current;
    if (prev.length <= 1) {
      message.warning('至少需要保留一个内容块');
      return;
    }
    const next = prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i }));
    onChange(next);
  }, [onChange]);

  const moveBlockUp = useCallback((index: number) => {
    if (index <= 0) return;
    const prev = blocksRef.current;
    const next = [...prev];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next.map((b, i) => ({ ...b, order: i })));
  }, [onChange]);

  const moveBlockDown = useCallback((index: number) => {
    const prev = blocksRef.current;
    if (index >= prev.length - 1) return;
    const next = [...prev];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((b, i) => ({ ...b, order: i })));
  }, [onChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const prev = blocksRef.current;
    const oldIndex = prev.findIndex((b) => b.id === active.id);
    const newIndex = prev.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(prev, oldIndex, newIndex);
    onChange(reordered.map((b, i) => ({ ...b, order: i })));
  }, [onChange]);

  // 生成唯一ID
  const generateId = () => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 添加文字块
  const addTextBlock = () => {
    const newBlock: TextBlockType = {
      id: generateId(),
      type: 'text',
      order: 0, // 临时值，后面会重新排序
      content: '',
    };

    // 在指定位置插入
    const newBlocks = [...blocks];
    if (insertPosition === -1) {
      // 添加到末尾
      newBlocks.push(newBlock);
    } else {
      // 在指定位置后面插入
      newBlocks.splice(insertPosition + 1, 0, newBlock);
    }

    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));

    onChange(reorderedBlocks);
    setAddBlockModalVisible(false);
    setInsertPosition(-1);
  };

  // 添加代码块
  const addCodeBlock = () => {
    const newBlock: CodeBlockType = {
      id: generateId(),
      type: 'code',
      order: 0, // 临时值，后面会重新排序
      code: '',
      language: 'javascript',
    };

    // 在指定位置插入
    const newBlocks = [...blocks];
    if (insertPosition === -1) {
      // 添加到末尾
      newBlocks.push(newBlock);
    } else {
      // 在指定位置后面插入
      newBlocks.splice(insertPosition + 1, 0, newBlock);
    }

    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));

    onChange(reorderedBlocks);
    setAddBlockModalVisible(false);
    setInsertPosition(-1);
  };

  // 获取引用块列表（选择后插入，不创建空引用块）
  const fetchPickerBlocks = async (page: number = 1, query: string = pickerSearchQuery) => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pickerPageSize.toString(),
      });
      if (query.trim()) params.append('search', query.trim());
      const data = await apiGetJson<{ success: boolean; data: { blocks: any[]; total: number }; error?: string }>(`/api/blocks?${params}`);
      if (data.success) {
        setPickerBlocks(data.data.blocks);
        setPickerTotal(data.data.total);
      }
    } catch (e) {
      console.error('获取内容块列表失败', e);
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (quotePickerVisible) {
      fetchPickerBlocks(pickerPage, pickerSearchQuery);
    }
  }, [quotePickerVisible, pickerPage, pickerSearchQuery]);

  // 引用块选择器：输入防抖后再触发请求，避免每键请求风暴
  const pickerInputRef = useRef(pickerInputValue);
  pickerInputRef.current = pickerInputValue;
  useEffect(() => {
    if (!quotePickerVisible) return;
    const t = window.setTimeout(() => {
      const v = pickerInputRef.current;
      setPickerSearchQuery(v);
      setPickerPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [quotePickerVisible, pickerInputValue]);

  // 从 API 块数据构建编辑器块（与 QuoteBlock 一致）
  const buildBlockFromPreview = (blockData: any): Block | null => {
    const { type, content } = blockData;
    const parsedContent = blockData.parsedContent;
    let newBlock: any = null;

    if (type === 'image') {
      let imageUrl = '';
      let imageTitle = '';
      const mediaId = blockData.media_id ?? blockData.mediaId ?? null;
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
          id: generateId(),
          type: 'image',
          order: 0,
          imageUrl,
          title: imageTitle || undefined,
          ...(mediaId != null && { media_id: mediaId, mediaId }),
        };
      }
    } else if (type === 'text') {
      const textContent = parsedContent?.content || (typeof content === 'string' ? content : '');
      if (textContent) {
        newBlock = { id: generateId(), type: 'text', order: 0, content: textContent };
      }
    } else if (type === 'code') {
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
        newBlock = { id: generateId(), type: 'code', order: 0, code: codeContent, language: codeLanguage, title: codeTitle || undefined };
      }
    }
    return newBlock;
  };

  const insertBlockFromPreview = (blockData: any) => {
    const newBlock = buildBlockFromPreview(blockData);
    if (!newBlock) return;
    const newBlocks = [...blocks];
    if (insertPosition === -1) {
      newBlocks.push(newBlock);
    } else {
      newBlocks.splice(insertPosition + 1, 0, newBlock);
    }
    const reorderedBlocks = newBlocks.map((b, i) => ({ ...b, order: i }));
    onChange(reorderedBlocks);
    setQuotePickerVisible(false);
    setAddBlockModalVisible(false);
    setInsertPosition(-1);
    setPickerPage(1);
    setPickerSearchQuery('');
    setPickerInputValue('');
  };

  // 添加图片块
  const handleAddImageBlock = async () => {
    if (!imageUrl && fileList.length === 0) {
      message.warning('请输入图片URL或上传图片');
      return;
    }

    let finalImageUrl = imageUrl;

    // 如果用户上传了文件，则上传到服务器（改用 XHR + 进度）
    let lastUploadMediaId: string | null = null;
    if (fileList.length > 0 && fileList[0].originFileObj) {
      try {
        // 初始化 loading（持久显示，后面用相同 key 更新）
        message.loading({ content: '正在压缩图片...', key: 'upload', duration: 0 });

        // 压缩图片（在 requestIdleCallback 中执行，避免阻塞）
        let fileToUpload: File = fileList[0].originFileObj as File;
        
        // 如果文件是图片且大于 500KB，则压缩
        if (fileToUpload.type.startsWith('image/') && fileToUpload.size > 500 * 1024) {
          fileToUpload = await compressImage(fileToUpload);
        }

        message.loading({ content: '正在上传图片... 0%', key: 'upload', duration: 0 });

        // 节流：只在百分比增加 >=3 或达到 100 时更新一次提示，避免频繁渲染
        let lastPercent = -1;

        const result = await uploadFileWithProgress(
          fileToUpload,
          (percent: number) => {
            if (percent - lastPercent >= 3 || percent === 100) {
              lastPercent = percent;
              // 更新 loading 文案（保持同 key）
              message.loading({ content: `正在上传图片... ${percent}%`, key: 'upload', duration: 0 });
            }
          }
        );

        if (result.success) {
          finalImageUrl = result.url || '';
          lastUploadMediaId = result.media_id ?? null;
          message.success({ content: '图片上传成功！', key: 'upload' });
        } else {
          message.error({ content: (typeof result.error === 'string' ? result.error : null) || '图片上传失败', key: 'upload' });
          return;
        }
      } catch (error) {
        console.error('上传图片失败:', error);
        message.error({ content: '图片上传失败，请重试', key: 'upload' });
        return;
      }
    }

    if (!finalImageUrl) {
      message.warning('请输入图片URL或上传图片');
      return;
    }

    const newBlock: ImageBlockType = {
      id: generateId(),
      type: 'image',
      order: 0, // 临时值，后面会重新排序
      imageUrl: finalImageUrl,
      ...(lastUploadMediaId != null && {
        media_id: lastUploadMediaId,
        mediaId: lastUploadMediaId,
      }),
    };

    // 在指定位置插入
    const newBlocks = [...blocks];
    if (insertPosition === -1) {
      // 添加到末尾
      newBlocks.push(newBlock);
    } else {
      // 在指定位置后面插入
      newBlocks.splice(insertPosition + 1, 0, newBlock);
    }

    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));

    onChange(reorderedBlocks);
    setAddImageModalVisible(false);
    setImageUrl('');
    setFileList([]);
    // 清理预览 URL，避免内存泄漏
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setInsertPosition(-1);
  };

  // 批量格式化所有文字块（读当前 blocks）
  const batchFormat = (option: FormatOption) => {
    const prev = blocksRef.current;
    let count = 0;
    const newBlocks = prev.map(block => {
      if (block.type === 'text') {
        count++;
        return {
          ...block,
          content: applyFormat((block as TextBlockType).content, option),
        };
      }
      return block;
    });

    onChange(newBlocks);

    const messages: Record<FormatOption, string> = {
      indent: '首行缩进',
      removeEmpty: '去除所有空行',
      normalizeBreaks: '统一段落间距',
      cleanSpaces: '清理空格',
      chinese: '中文排版',
      removeIndent: '移除缩进',
    };

    message.success(`已对 ${count} 个文字块应用【${messages[option]}】`);
  };

  // 批量格式化菜单
  const batchFormatMenuItems: MenuProps['items'] = [
    {
      key: 'indent',
      icon: <FormatPainterOutlined />,
      label: '批量首行缩进',
      onClick: () => batchFormat('indent'),
    },
    {
      key: 'removeIndent',
      label: '批量移除缩进',
      onClick: () => batchFormat('removeIndent'),
    },
    {
      type: 'divider',
    },
    {
      key: 'removeEmpty',
      label: '批量去除所有空行',
      onClick: () => batchFormat('removeEmpty'),
    },
    {
      key: 'normalizeBreaks',
      label: '批量统一段落间距',
      onClick: () => batchFormat('normalizeBreaks'),
    },
    {
      key: 'cleanSpaces',
      label: '批量清理空格',
      onClick: () => batchFormat('cleanSpaces'),
    },
    {
      type: 'divider',
    },
    {
      key: 'chinese',
      icon: <ThunderboltOutlined />,
      label: '批量中文排版（一键）',
      onClick: () => batchFormat('chinese'),
    },
  ];


  return (
    <div style={{ position: 'relative' }}>
      {/* 编辑器主体 */}
      <div
        style={{
          marginLeft: isMobile ? '0' : '48px', // 移动端不需要左侧边距，工具栏在底部
          minHeight: '400px',
        }}
      >
        {blocks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              fontSize: '16px',
            }}
          >
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }} />
            <p>还没有任何内容块</p>
            <p style={{ fontSize: '14px', marginBottom: '16px' }}>点击下方按钮开始创作</p>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setInsertPosition(-1); // 没有块时，添加到末尾
                setAddBlockModalVisible(true);
              }}
            >
              添加第一个块
            </Button>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks.map(block => block.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block, index) => (
              <div key={block.id}>
                <SortableItem
                  id={block.id}
                  index={index}
                  block={block}
                  onBlockChange={handleBlockChange}
                  deleteBlock={deleteBlock}
                  moveBlockUp={moveBlockUp}
                  moveBlockDown={moveBlockDown}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                  canDelete={blocks.length > 1}
                />

                {/* 块之间的添加按钮：引用块未选择引用时不显示 */}
                {block.type !== 'quote' && (
                  <div
                    style={{
                      textAlign: 'center',
                      marginTop: isMobile ? '8px' : '8px',
                      marginBottom: isMobile ? '8px' : '0',
                      opacity: isMobile ? 0.7 : 0.5,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = isMobile ? '0.7' : '0.5';
                    }}
                  >
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setInsertPosition(index);
                        setAddBlockModalVisible(true);
                      }}
                      style={{
                        fontSize: isMobile ? '12px' : '14px',
                      }}
                    >添加新块
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* 添加块类型选择弹窗 */}
      <Modal
        title={insertPosition === -1 ? "选择块类型" : `在第 ${insertPosition + 1} 个块后添加`}
        open={addBlockModalVisible}
        onCancel={() => {
          setAddBlockModalVisible(false);
          setInsertPosition(-1);
        }}
        footer={null}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Button
            type="default"
            size="large"
            icon={<FileTextOutlined />}
            onClick={addTextBlock}
            block
            style={{ height: '60px', fontSize: '16px' }}
          >
            <div>
              <div>文字块</div>
              <div style={{ fontSize: '12px', color: '#999' }}>添加段落文字内容</div>
            </div>
          </Button>

          <Button
            type="default"
            size="large"
            icon={<PictureOutlined />}
            onClick={() => {
              setAddBlockModalVisible(false);
              setAddImageModalVisible(true);
            }}
            block
            style={{ height: '60px', fontSize: '16px' }}
          >
            <div>
              <div>图片块</div>
              <div style={{ fontSize: '12px', color: '#999' }}>插入图片，可添加标题和描述</div>
            </div>
          </Button>

          <Button
            type="default"
            size="large"
            icon={<CodeOutlined />}
            onClick={addCodeBlock}
            block
            style={{ height: '60px', fontSize: '16px' }}
          >
            <div>
              <div>代码块</div>
              <div style={{ fontSize: '12px', color: '#999' }}>添加代码片段，支持多种语言</div>
            </div>
          </Button>

          <Button
            type="default"
            size="large"
            icon={<LinkOutlined />}
            onClick={() => {
              setAddBlockModalVisible(false);
              setQuotePickerVisible(true);
            }}
            block
            style={{ height: '60px', fontSize: '16px' }}
          >
            <div>
              <div>引用块</div>
              <div style={{ fontSize: '12px', color: '#999' }}>选择已有内容块插入，选后才创建</div>
            </div>
          </Button>
        </Space>
      </Modal>

      {/* 引用块选择器：选中的块会插入到当前插入位置，不创建空引用块 */}
      <Modal
        title={
          <span>
            <LinkOutlined style={{ marginRight: '8px' }} />
            {insertPosition === -1 ? '选择要引用的内容块' : `在第 ${insertPosition + 1} 个块后插入`}
          </span>
        }
        open={quotePickerVisible}
        onCancel={() => {
          setQuotePickerVisible(false);
          setInsertPosition(-1);
          setPickerPage(1);
          setPickerSearchQuery('');
          setPickerInputValue('');
        }}
        footer={null}
        width="80%"
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
        {pickerLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#666' }}>加载内容中...</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <Input.Search
                placeholder="搜索内容块..."
                value={pickerInputValue}
                onChange={(e) => setPickerInputValue(e.target.value)}
                onSearch={(q) => {
                  setPickerSearchQuery(q);
                  setPickerPage(1);
                }}
                allowClear
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#999' }}>
              共 {pickerTotal} 个内容块，点击一项即可插入
            </div>
            <div style={{ marginBottom: '16px' }}>
              {pickerBlocks.map((item: any) => {
                const typeLabel = item.type === 'text' ? '文字' : item.type === 'image' ? '图片' : item.type === 'code' ? '代码' : '内容';
                const preview = item.type === 'text'
                  ? (item.parsedContent?.content || item.content || '').replace(/<[^>]+>/g, '').slice(0, 60)
                  : item.type === 'code'
                    ? (item.parsedContent?.code || (typeof item.content === 'string' ? '' : item.content?.code) || '').slice(0, 60)
                    : item.type === 'image' ? (item.parsedContent?.title || '图片块') : '内容块';
                const imageUrl = item.type === 'image' ? (item.parsedContent?.imageUrl || item.imageUrl) : null;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => insertBlockFromPreview(item)}
                    onKeyDown={(e) => e.key === 'Enter' && insertBlockFromPreview(item)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: imageUrl ? 'column' : 'row',
                      alignItems: imageUrl ? 'stretch' : 'center',
                      gap: '12px',
                    }}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        style={{
                          width: '100%',
                          maxHeight: 400,
                          objectFit: 'contain',
                          borderRadius: 6,
                          display: 'block',
                        }}
                      />
                    )}
                    <div style={{ flex: imageUrl ? undefined : 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, marginRight: '8px' }}>{typeLabel}</span>
                      <span style={{ color: '#666', fontSize: '13px' }}>{preview}{preview.length >= 60 ? '…' : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {pickerTotal > pickerPageSize && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Button
                  disabled={pickerPage <= 1}
                  onClick={() => setPickerPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <Button
                  disabled={pickerPage >= Math.ceil(pickerTotal / pickerPageSize)}
                  onClick={() => setPickerPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 添加图片弹窗 */}
      <Modal
        title={insertPosition === -1 ? "添加图片块" : `在第 ${insertPosition + 1} 个块后添加图片`}
        open={addImageModalVisible}
        onCancel={() => {
          setAddImageModalVisible(false);
          setImageUrl('');
          setFileList([]);
          // 清理预览 URL
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl('');
          }
          setInsertPosition(-1);
        }}
        onOk={handleAddImageBlock}
        okText="添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: '8px' }}>方式一：输入图片URL</div>
            <Input
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              size="large"
            />
          </div>

          <div style={{ textAlign: 'center', color: '#999' }}>或</div>

          <div>
            <div style={{ marginBottom: '8px' }}>方式二：上传图片</div>
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newFileList }) => {
                setFileList(newFileList);
                // 创建预览 URL
                if (newFileList.length > 0 && newFileList[0].originFileObj) {
                  // 清理旧的预览 URL
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  const url = URL.createObjectURL(newFileList[0].originFileObj);
                  setPreviewUrl(url);
                  // 更新 fileList 以显示预览
                  newFileList[0].thumbUrl = url;
                } else {
                  // 清理预览 URL
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl('');
                  }
                }
              }}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length < 1 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </div>
        </Space>
      </Modal>
    </div>
  );
}

