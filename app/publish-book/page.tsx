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
import TagInput from '@/app/components/TagInput';
import type { Block } from '@/app/types/block';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';

const { TextArea } = Input;

/**
 * 书籍发布页面
 */
export default function PublishBookPage() {
  const [form] = Form.useForm();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  // 封面图片状态
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // 表单提交
  const onFinish = async (values: any) => {
    if (!values.title?.trim()) {
      message.warning('请输入书名');
      return;
    }

    if (!values.description?.trim()) {
      message.warning('请输入书籍简介');
      return;
    }

    try {
      // 获取 Token
      const token = localStorage.getItem('token');

      if (!token) {
        message.error('请先登录');
        return;
      }

      // 1. 首先创建书籍分类（category）
      const categoryData = {
        id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: values.title,
        parent_id: 'cat_bookcase',
        order_index: await getNextBookOrder(),
      };

      const categoryResponse = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(categoryData),
      });

      const categoryResult = await categoryResponse.json();

      if (!categoryResponse.ok || !categoryResult.success) {
        message.error(categoryResult.error || '创建书籍分类失败');
        return;
      }

      const categoryId = categoryResult.category.id;

      // 2. 创建书籍简介文章
      const blocks: Block[] = [];

      // 如果有封面图片，添加图片块
      if (coverFileList.length > 0 && coverFileList[0].response?.url) {
        blocks.push({
          id: `block-cover-${Date.now()}`,
          type: 'image',
          order: 0,
          imageUrl: coverFileList[0].response.url,
          title: `${values.title}封面`,
          description: '',
        } as any);
      }

      // 添加简介文本块
      blocks.push({
        id: `block-intro-${Date.now()}`,
        type: 'text',
        order: blocks.length,
        content: values.description,
      });

      const articleData = {
        title: '简介',
        author: user?.username || '匿名',
        excerpt: values.description.substring(0, 150) + (values.description.length > 150 ? '...' : ''),
        tags: values.tags || [],
        category_id: categoryId,
        blocks: blocks,
        status: 'published' as const,
      };

      const articleResponse = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(articleData),
      });

      const articleResult = await articleResponse.json();

      if (articleResponse.ok && articleResult.success) {
        message.success('书籍发布成功！');
        // 清空表单
        form.resetFields();
        setCoverFileList([]);
        // 跳转到bookcase页面
        setTimeout(() => {
          router.push('/bookcase');
        }, 1000);
      } else {
        message.error(articleResult.error || '发布失败，请重试');
      }
    } catch (error) {
      console.error('发布书籍失败:', error);
      message.error('发布失败，请检查网络连接');
    }
  };

  // 获取下一个书籍order
  const getNextBookOrder = async (): Promise<number> => {
    try {
      const response = await fetch('/api/categories?type=children&parentId=cat_bookcase');
      const result = await response.json();

      if (response.ok && result.success && result.categories.length > 0) {
        const maxOrder = Math.max(...result.categories.map((cat: any) => cat.order || 0));
        return maxOrder + 1;
      }
      return 1;
    } catch (error) {
      console.error('获取书籍order失败:', error);
      return 1;
    }
  };

  // 封面上传配置
  const coverUploadProps = {
    name: 'file',
    action: '/api/upload',
    headers: {
      authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    listType: 'picture-card' as const,
    className: 'avatar-uploader',
    fileList: coverFileList,
    beforeUpload: (file: File) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error('只能上传 JPG/PNG 格式的图片!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片大小不能超过 2MB!');
        return false;
      }
      return true;
    },
    onChange: (info: any) => {
      setCoverFileList(info.fileList);
      if (info.file.status === 'done') {
        message.success('封面上传成功');
      } else if (info.file.status === 'error') {
        message.error('封面上传失败');
      }
    },
    onRemove: () => {
      setCoverFileList([]);
    },
  };

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
              📚 发布新书
            </h2>
            <p style={{
              margin: '8px 0 0 0',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
            }}>
              为你的书架添加一本新书
            </p>
          </div>
        }
        box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        box2BgColor="#f5f5f5"
        box2Style={{ padding: '40px 20px' }}
      >
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
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
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>📖 书籍信息</h3>
              </div>

              <Form.Item
                label="书名"
                name="title"
                rules={[{ required: true, message: '请输入书名' }]}
              >
                <Input
                  placeholder="输入书籍名称..."
                  size="large"
                  style={{ fontSize: '18px', fontWeight: 500 }}
                />
              </Form.Item>

              <Form.Item
                label="书籍简介"
                name="description"
                rules={[{ required: true, message: '请输入书籍简介' }]}
              >
                <TextArea
                  placeholder="简要介绍这本书的内容、特点等..."
                  rows={6}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Form.Item
                label="标签（可选）"
                name="tags"
                tooltip="添加标签可以帮助读者更好地找到你的书籍"
              >
                <TagInput placeholder="输入标签，按空格或回车添加" maxTags={10} />
              </Form.Item>
            </Card>

            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>🖼️ 封面图片（可选）</h3>
                <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                  上传书籍封面图片，没有的话会使用默认封面
                </p>
              </div>

              <Upload {...coverUploadProps}>
                {coverFileList.length === 0 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传封面</div>
                  </div>
                )}
              </Upload>
            </Card>

            {isPreviewMode && (
              <Card
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  marginBottom: '24px',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>👀 预览效果</h3>
                </div>

                <div style={{
                  padding: '24px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                }}>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                  }}>
                    {coverFileList.length > 0 && coverFileList[0].response?.url ? (
                      <img
                        src={coverFileList[0].response.url}
                        alt="书籍封面"
                        style={{
                          maxWidth: '200px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '200px',
                        height: '280px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '8px',
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '48px',
                      }}>
                        📚
                      </div>
                    )}
                  </div>

                  <h1 style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: '#1a1a1a',
                    textAlign: 'center',
                  }}>
                    {form.getFieldValue('title') || '未命名书籍'}
                  </h1>

                  <div style={{
                    marginBottom: '24px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.6',
                  }}>
                    {form.getFieldValue('description') || '暂无简介'}
                  </div>

                  {form.getFieldValue('tags') && form.getFieldValue('tags').length > 0 && (
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}>
                      {form.getFieldValue('tags').map((tag: string, index: number) => (
                        <Tag key={index} color="blue" style={{ margin: '0 4px 4px 0' }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}

                  <div style={{
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px',
                  }}>
                    👤 作者：{user?.username || '匿名'} • 📅 {new Date().toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </Card>
            )}

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
                  发布书籍
                </Button>

                <Button
                  size="large"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    const values = form.getFieldsValue();
                    if (!values.title) {
                      message.warning('请先输入书名');
                      return;
                    }
                    if (!values.description) {
                      message.warning('请先输入书籍简介');
                      return;
                    }
                    setIsPreviewMode(!isPreviewMode);
                    message.info(isPreviewMode ? '退出预览模式' : '进入预览模式');
                  }}
                  type={isPreviewMode ? 'primary' : 'default'}
                >
                  {isPreviewMode ? '退出预览' : '预览效果'}
                </Button>
              </Space>

              <Divider />

              <div style={{ color: '#666', fontSize: '13px' }}>
                <p style={{ margin: '4px 0' }}>💡 <strong>发布说明：</strong></p>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>书名将成为书籍的唯一标识</li>
                  <li>简介将显示在书籍卡片上，建议控制在200字以内</li>
                  <li>封面图片建议使用JPG或PNG格式，大小不超过2MB</li>
                  <li>标签可以帮助读者更好地分类和查找书籍</li>
                </ul>
              </div>
            </Card>
          </Form>
        </div>
      </PageLayout>
    </>
  );
}
