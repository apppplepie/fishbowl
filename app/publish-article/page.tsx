'use client';

import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Upload, 
  Select, 
  Card,
  Space,
  message,
  Divider,
  Tag,
} from 'antd';
import { 
  PlusOutlined, 
  SaveOutlined,
  EyeOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import BlockEditor from '@/app/components/BlockEditor';
import type { Block, Article } from '@/app/types/block';

const { Option } = Select;

/**
 * 块编辑器文章发布页面
 */
export default function PublishArticlePage() {
  const [form] = Form.useForm();
  
  // 初始化一个空的文字块
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: `block-initial-${Date.now()}`,
      type: 'text',
      order: 0,
      content: '',
    }
  ]);
  
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // 表单提交
  const onFinish = (values: any) => {
    // 检查是否有实际内容
    const hasContent = blocks.some(block => {
      if (block.type === 'text') return (block as any).content?.trim();
      if (block.type === 'code') return (block as any).code?.trim();
      if (block.type === 'image') return true; // 图片块总是有内容
      return false;
    });
    
    if (!hasContent) {
      message.warning('请至少添加一些内容');
      return;
    }

    const article: Article = {
      id: `article-${Date.now()}`,
      title: values.title,
      author: values.author || '匿名',
      coverImage: values.coverImage,
      tags: values.tags || [],
      blocks: blocks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('发布文章:', article);
    
    // 这里应该调用API保存文章
    // await fetch('/api/articles', { method: 'POST', body: JSON.stringify(article) });
    
    message.success('文章发布成功！（仅为演示，实际需接入后端API）');
  };

  // 保存草稿
  const saveDraft = () => {
    const values = form.getFieldsValue();
    const draft: Article = {
      id: `draft-${Date.now()}`,
      title: values.title || '未命名草稿',
      author: values.author || '匿名',
      tags: values.tags || [],
      blocks: blocks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('保存草稿:', draft);
    
    // 这里应该保存到本地存储或后端
    localStorage.setItem('article-draft', JSON.stringify(draft));
    
    message.success('草稿已保存到本地');
  };

  // 加载草稿
  const loadDraft = () => {
    const draftStr = localStorage.getItem('article-draft');
    if (draftStr) {
      try {
        const draft: Article = JSON.parse(draftStr);
        form.setFieldsValue({
          title: draft.title,
          author: draft.author,
          tags: draft.tags,
        });
        setBlocks(draft.blocks || []);
        message.success('草稿已加载');
      } catch (error) {
        message.error('加载草稿失败');
      }
    } else {
      message.info('没有找到草稿');
    }
  };

  // 封面上传
  const handleCoverUploadChange = ({ fileList: newFileList }: any) => {
    setCoverFileList(newFileList);
  };

  // 统计信息
  const getStatistics = () => {
    const textBlocks = blocks.filter(b => b.type === 'text');
    const imageBlocks = blocks.filter(b => b.type === 'image');
    const codeBlocks = blocks.filter(b => b.type === 'code');
    
    const totalChars = textBlocks.reduce((sum, block) => {
      return sum + (block as any).content?.length || 0;
    }, 0);

    return {
      totalBlocks: blocks.length,
      textBlocks: textBlocks.length,
      imageBlocks: imageBlocks.length,
      codeBlocks: codeBlocks.length,
      totalChars,
      estimatedReadTime: Math.max(1, Math.ceil(totalChars / 400)), // 假设每分钟阅读400字
    };
  };

  const stats = getStatistics();

  return (
    <>
      <Header />
      
      <PageLayout
        box1Content={
          <div style={{ padding: '16px 24px' }}>
            <h2 style={{ 
              margin: 0, 
              color: 'white', 
              fontSize: '20px',
              fontWeight: 600,
            }}>
              ✍️ 创作文章
            </h2>
            <p style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
            }}>
              使用块编辑器，自由组织你的内容
            </p>
          </div>
        }
        box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        box2BgColor="#f5f5f5"
        box2Style={{ padding: '40px 20px' }}
      >
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
        }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              author: '匿名',
              tags: [],
            }}
          >
            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>📝 文章信息</h3>
                <Space>
                  <Button onClick={loadDraft}>加载草稿</Button>
                  <Button icon={<SaveOutlined />} onClick={saveDraft}>
                    保存草稿
                  </Button>
                </Space>
              </div>

              <Form.Item
                label="文章标题"
                name="title"
                rules={[{ required: true, message: '请输入文章标题' }]}
              >
                <Input 
                  placeholder="输入一个吸引人的标题..." 
                  size="large"
                  style={{ fontSize: '18px', fontWeight: 500 }}
                />
              </Form.Item>

              <Form.Item
                label="封面图"
                name="coverImage"
                tooltip="可选，为文章添加封面图片"
              >
                <Upload
                  listType="picture-card"
                  fileList={coverFileList}
                  onChange={handleCoverUploadChange}
                  beforeUpload={() => false}
                  maxCount={1}
                >
                  {coverFileList.length < 1 && (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传封面</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                label="作者"
                name="author"
              >
                <Input placeholder="作者名称" size="large" />
              </Form.Item>

              <Form.Item
                label="标签"
                name="tags"
                tooltip="添加标签可以帮助读者更好地找到你的文章"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签（按回车添加）"
                  size="large"
                  style={{ width: '100%' }}
                >
                  <Option value="技术">技术</Option>
                  <Option value="生活">生活</Option>
                  <Option value="随笔">随笔</Option>
                  <Option value="教程">教程</Option>
                  <Option value="思考">思考</Option>
                </Select>
              </Form.Item>
            </Card>

            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>🧱 文章内容</h3>
                <Space>
                  <Tag color="blue">{stats.totalBlocks} 个块</Tag>
                  <Tag color="green">{stats.textBlocks} 文字</Tag>
                  <Tag color="orange">{stats.imageBlocks} 图片</Tag>
                  <Tag color="purple">{stats.codeBlocks} 代码</Tag>
                  <Tag>{stats.totalChars} 字</Tag>
                  <Tag>约 {stats.estimatedReadTime} 分钟阅读</Tag>
                </Space>
              </div>

              <Divider />

              <BlockEditor blocks={blocks} onChange={setBlocks} showAddButton={false} />
            </Card>

            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Space size="large">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  icon={<PlusOutlined />}
                  style={{ minWidth: '140px' }}
                >
                  发布文章
                </Button>
                
                <Button 
                  size="large" 
                  icon={<SaveOutlined />}
                  onClick={saveDraft}
                  style={{ minWidth: '140px' }}
                >
                  保存草稿
                </Button>

                <Button 
                  size="large" 
                  icon={<EyeOutlined />}
                  onClick={() => {
                    if (blocks.length === 0) {
                      message.warning('请先添加一些内容');
                      return;
                    }
                    message.info('预览功能开发中...');
                    // 这里可以跳转到预览页面或打开预览弹窗
                  }}
                >
                  预览
                </Button>
              </Space>

              <Divider />

              <div style={{ color: '#666', fontSize: '13px' }}>
                <p style={{ margin: '4px 0' }}>💡 <strong>使用提示：</strong></p>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>点击"添加新块"按钮创建文字、图片或代码块</li>
                  <li>鼠标悬停在块上可以看到编辑工具（上移、下移、删除）</li>
                  <li>在空文字/代码块中按 Backspace 可以快速删除该块</li>
                  <li>图片块添加后无法修改图片本身，但可以编辑标题和描述</li>
                  <li>记得定期保存草稿，避免内容丢失</li>
                </ul>
              </div>
            </Card>
          </Form>
        </div>
      </PageLayout>
    </>
  );
}

