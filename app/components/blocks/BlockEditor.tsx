'use client';

import React, { useState } from 'react';
import { Button, Space, Modal, Input, Upload, message, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  PictureOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  FormatPainterOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
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
import type { Block, TextBlock as TextBlockType, ImageBlock as ImageBlockType, CodeBlock as CodeBlockType } from '@/app/types/block';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { useResponsive } from '@/app/hooks/useResponsive';

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  showAddButton?: boolean; // 是否显示底部的添加新块按钮
}

interface SortableItemProps {
  id: string;
  index: number;
  block: Block;
  onChange: (updated: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
}

interface SortableHandleProps {
  listeners: any;
  attributes: any;
}

function SortableItem({
  id,
  index,
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
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

  const commonProps = {
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    canDelete,
    isDragging,
  };

  const sortableHandleProps = {
    ...attributes,
    ...listeners,
  };

  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return (
          <TextBlock
            key={block.id}
            block={block}
            onChange={onChange}
            onDelete={onDelete}
            sortableHandleProps={sortableHandleProps}
            {...commonProps}
          />
        );
      case 'image':
        return (
          <ImageBlock
            key={block.id}
            block={block}
            onChange={onChange}
            onDelete={onDelete}
            sortableHandleProps={sortableHandleProps}
            {...commonProps}
          />
        );
      case 'code':
        return (
          <CodeBlock
            key={block.id}
            block={block}
            onChange={onChange}
            onDelete={onDelete}
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
}

export default function BlockEditor({ blocks, onChange, showAddButton = true }: BlockEditorProps) {
  const { isMobile } = useResponsive();
  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);
  const [addImageModalVisible, setAddImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [insertPosition, setInsertPosition] = useState<number>(-1); // 记录要插入的位置，-1表示末尾

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);

      const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex);
      onChange(reorderedBlocks);
    }
  };

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

  // 添加图片块
  const handleAddImageBlock = async () => {
    if (!imageUrl && fileList.length === 0) {
      message.warning('请输入图片URL或上传图片');
      return;
    }

    let finalImageUrl = imageUrl;

    // 如果用户上传了文件，则上传到服务器
    if (fileList.length > 0 && fileList[0].originFileObj) {
      try {
        message.loading({ content: '正在上传图片...', key: 'upload' });
        
        const formData = new FormData();
        formData.append('file', fileList[0].originFileObj);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {
          finalImageUrl = result.url;
          message.success({ content: '图片上传成功！', key: 'upload' });
        } else {
          message.error({ content: result.error || '图片上传失败', key: 'upload' });
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
    setInsertPosition(-1);
  };

  // 更新块
  const updateBlock = (index: number, updatedBlock: Block) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };

  // 删除块
  const deleteBlock = (index: number) => {
    // 如果只剩一个块，不允许删除
    if (blocks.length <= 1) {
      message.warning('至少需要保留一个内容块');
      return;
    }
    
    const newBlocks = blocks.filter((_, i) => i !== index);
    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));
    onChange(reorderedBlocks);
  };

  // 上移块
  const moveBlockUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));
    onChange(reorderedBlocks);
  };

  // 下移块
  const moveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));
    onChange(reorderedBlocks);
  };


  // 批量格式化所有文字块
  const batchFormat = (option: FormatOption) => {
    let count = 0;
    const newBlocks = blocks.map(block => {
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
          marginLeft: '48px', // 为左侧工具栏留出空间
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
                  onChange={(updated) => updateBlock(index, updated)}
                  onDelete={() => deleteBlock(index)}
                  onMoveUp={() => moveBlockUp(index)}
                  onMoveDown={() => moveBlockDown(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                  canDelete={blocks.length > 1}
                />

                {/* 块之间的添加按钮 */}
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: isMobile ? '24px' : '8px',
                    opacity: 0.5,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.5';
                  }}
                >
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setInsertPosition(index); // 记录要在这个块后面插入
                      setAddBlockModalVisible(true);
                    }}
                  >
                    在此处添加块
                  </Button>
                </div>
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
        <Space vertical style={{ width: '100%' }} size="large">
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
        </Space>
      </Modal>

      {/* 添加图片弹窗 */}
      <Modal
        title={insertPosition === -1 ? "添加图片块" : `在第 ${insertPosition + 1} 个块后添加图片`}
        open={addImageModalVisible}
        onCancel={() => {
          setAddImageModalVisible(false);
          setImageUrl('');
          setFileList([]);
          setInsertPosition(-1);
        }}
        onOk={handleAddImageBlock}
        okText="添加"
        cancelText="取消"
      >
        <Space vertical style={{ width: '100%' }} size="middle">
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
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
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

          <div style={{ fontSize: '12px', color: '#999' }}>
            提示：图片块添加后，图片本身不可编辑，但可以修改标题、描述和作者信息
          </div>
        </Space>
      </Modal>
    </div>
  );
}

