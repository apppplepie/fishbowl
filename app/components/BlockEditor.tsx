'use client';

import React, { useState } from 'react';
import { Button, Space, Modal, Input, Upload, message } from 'antd';
import { PlusOutlined, FileTextOutlined, PictureOutlined, CodeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import CodeBlock from './blocks/CodeBlock';
import type { Block, TextBlock as TextBlockType, ImageBlock as ImageBlockType, CodeBlock as CodeBlockType } from '@/app/types/block';

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);
  const [addImageModalVisible, setAddImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 生成唯一ID
  const generateId = () => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 添加文字块
  const addTextBlock = () => {
    const newBlock: TextBlockType = {
      id: generateId(),
      type: 'text',
      order: blocks.length,
      content: '',
    };
    onChange([...blocks, newBlock]);
    setAddBlockModalVisible(false);
  };

  // 添加代码块
  const addCodeBlock = () => {
    const newBlock: CodeBlockType = {
      id: generateId(),
      type: 'code',
      order: blocks.length,
      code: '',
      language: 'javascript',
    };
    onChange([...blocks, newBlock]);
    setAddBlockModalVisible(false);
  };

  // 添加图片块
  const handleAddImageBlock = () => {
    if (!imageUrl && fileList.length === 0) {
      message.warning('请输入图片URL或上传图片');
      return;
    }

    // 这里应该上传图片到服务器，暂时使用URL或本地预览
    const finalImageUrl = imageUrl || (fileList[0] ? URL.createObjectURL(fileList[0].originFileObj as Blob) : '');

    const newBlock: ImageBlockType = {
      id: generateId(),
      type: 'image',
      order: blocks.length,
      imageUrl: finalImageUrl,
    };

    onChange([...blocks, newBlock]);
    setAddImageModalVisible(false);
    setImageUrl('');
    setFileList([]);
  };

  // 更新块
  const updateBlock = (index: number, updatedBlock: Block) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };

  // 删除块
  const deleteBlock = (index: number) => {
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

  // 拖拽开始
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    // 交换位置
    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    
    // 重新排序
    const reorderedBlocks = newBlocks.map((block, i) => ({
      ...block,
      order: i,
    }));
    
    onChange(reorderedBlocks);
    setDraggedIndex(index);
  };

  // 渲染块
  const renderBlock = (block: Block, index: number) => {
    const commonProps = {
      onDelete: () => deleteBlock(index),
      onMoveUp: () => moveBlockUp(index),
      onMoveDown: () => moveBlockDown(index),
      canMoveUp: index > 0,
      canMoveDown: index < blocks.length - 1,
      onDragStart: () => handleDragStart(index),
      onDragEnd: handleDragEnd,
      onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
      isDragging: draggedIndex === index,
    };

    switch (block.type) {
      case 'text':
        return (
          <TextBlock
            key={block.id}
            block={block}
            onChange={(updated) => updateBlock(index, updated)}
            {...commonProps}
          />
        );
      case 'image':
        return (
          <ImageBlock
            key={block.id}
            block={block}
            onChange={(updated) => updateBlock(index, updated)}
            {...commonProps}
          />
        );
      case 'code':
        return (
          <CodeBlock
            key={block.id}
            block={block}
            onChange={(updated) => updateBlock(index, updated)}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

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
            <p style={{ fontSize: '14px' }}>点击下方按钮开始创作</p>
          </div>
        )}

        {blocks.map((block, index) => (
          <div key={block.id}>
            {renderBlock(block, index)}
            
            {/* 块之间的添加按钮 */}
            <div
              style={{
                textAlign: 'center',
                margin: '8px 0',
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
                onClick={() => setAddBlockModalVisible(true)}
              >
                在此处添加块
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部添加块按钮 */}
      <div
        style={{
          marginLeft: '48px',
          marginTop: '24px',
          padding: '24px',
          border: '2px dashed #d9d9d9',
          borderRadius: '8px',
          textAlign: 'center',
          backgroundColor: '#fafafa',
        }}
      >
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setAddBlockModalVisible(true)}
        >
          添加新块
        </Button>
      </div>

      {/* 添加块类型选择弹窗 */}
      <Modal
        title="选择块类型"
        open={addBlockModalVisible}
        onCancel={() => setAddBlockModalVisible(false)}
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
        </Space>
      </Modal>

      {/* 添加图片弹窗 */}
      <Modal
        title="添加图片块"
        open={addImageModalVisible}
        onCancel={() => {
          setAddImageModalVisible(false);
          setImageUrl('');
          setFileList([]);
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

