'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { usePageShell } from '@/app/contexts/PageShellContext';
import TagInput from '@/app/components/TagInput';
import type { Block } from '@/app/types/block';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import FloatingActions, { FloatingActionsProps } from '@/app/components/float/PublishFloat';
import { apiPostJson, apiGetJson } from '@/lib/apiClient';

const { TextArea } = Input;

/**
 * 书籍发布页面
 */
function PublishBookPage() {
  const [form] = Form.useForm();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const { setConfig } = usePageShell();

  // 封面图片状态
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  // 设置页面配置
  useEffect(() => {
    setConfig({
      box1Content: (
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
      ),
      box2Style: { padding: '40px 20px' },
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig]);

  // 组件挂载时尝试加载草稿
  useEffect(() => {
    // 确保在客户端环境中
    if (typeof window !== 'undefined') {
      loadDraft();
    }
  }, []);

  // 为悬浮按钮提供必要的状态
  const [blocks] = useState<Block[]>([]);

  // 自动保存相关 - 脏标志 + 防抖
  const saveTimeoutRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const lastSavedFormRef = useRef<string>('');

  // 保存草稿功能
  const saveDraft = useCallback(() => {
    const values = form.getFieldsValue();
    const author = user?.username || '匿名';

    // 处理封面图片数据
    const coverImage = coverFileList.length > 0 ? coverFileList[0] : null;

    const draft = {
      id: `book-draft-${Date.now()}`,
      title: values.title || '未命名书籍草稿',
      description: values.description || '',
      author: author,
      tags: values.tags || [],
      coverFileList: coverImage ? [{
        uid: coverImage.uid,
        name: coverImage.name,
        status: coverImage.status,
        url: coverImage.url,
        response: coverImage.response
      }] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('保存书籍草稿:', draft);
    }

    // 将写操作安排在空闲时段执行，避免打断主渲染
    const doWrite = () => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('book-draft', JSON.stringify(draft));
          const currentFormData = {
            ...values,
            coverFileList: coverFileList.map(file => ({
              uid: file.uid,
              name: file.name,
              status: file.status,
              url: file.url
            }))
          };
          lastSavedFormRef.current = JSON.stringify(currentFormData);
          dirtyRef.current = false;
        }
      } catch (e) {
        console.warn('保存草稿失败', e);
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(doWrite, { timeout: 2000 });
    } else {
      // fallback：短延迟异步写
      setTimeout(doWrite, 0);
    }
  }, [form, user, coverFileList]);

  // 使用 Form.useWatch 监听表单值变化
  const watchedTitle = Form.useWatch('title', form);
  const watchedDescription = Form.useWatch('description', form);
  const watchedTags = Form.useWatch('tags', form);

  // 标记为脏（在表单值或封面变化时触发）
  useEffect(() => {
    dirtyRef.current = true;

    // 防抖：编辑停止 10s 后触发保存
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      if (!dirtyRef.current) return;
      const values = form.getFieldsValue();
      const hasContent = (values.title || '').trim() ||
        (values.description || '').trim() ||
        (values.tags && values.tags.length > 0) ||
        coverFileList.length > 0;

      if (hasContent) {
        // 比较当前表单数据与上次保存的是否不同
        const currentFormData = {
          ...values,
          coverFileList: coverFileList.map(file => ({
            uid: file.uid,
            name: file.name,
            status: file.status,
            url: file.url
          }))
        };
        const currentFormStr = JSON.stringify(currentFormData);

        if (currentFormStr !== lastSavedFormRef.current) {
          saveDraft();
        }
      }
    }, 10000); // 10秒防抖

    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [watchedTitle, watchedDescription, watchedTags, coverFileList, form, saveDraft]);

  // 加载草稿
  const loadDraft = () => {
    if (typeof window === 'undefined') return;
    const draftStr = localStorage.getItem('book-draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);

        // 恢复表单数据
        form.setFieldsValue({
          title: draft.title,
          description: draft.description,
          tags: draft.tags,
        });

        // 恢复封面图片
        if (draft.coverFileList && draft.coverFileList.length > 0) {
          setCoverFileList(draft.coverFileList);
        }

        message.success('已恢复上次保存的草稿');
        return true;
      } catch (error) {
        console.error('加载草稿失败:', error);
        message.error('加载草稿失败');
        return false;
      }
    }
    return false;
  };

  // 清除草稿
  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('book-draft');
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('已清除书籍草稿');
    }
  };

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
      // 1. 首先创建书籍分类（category）
      const categoryData = {
        id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: values.title,
        parent_id: 'cat_bookcase',
        order_index: await getNextBookOrder(),
      };

      const categoryResult = await apiPostJson<{ success: boolean; error?: string; category?: { id: string } }>('/api/categories', categoryData);

      if (!categoryResult.success || !categoryResult.category) {
        message.error(categoryResult.error || '创建书籍分类失败');
        console.error('创建分类失败:', categoryResult);
        return;
      }

      const categoryId = categoryResult.category.id;
      console.log('成功创建书籍分类:', categoryId, '书名:', values.title);

      // 2. 创建书籍简介文章
      const blocks: Block[] = [];

      // 如果有封面图片，添加图片块（含 media_id 供列表占位与瀑布流用）
      if (coverFileList.length > 0 && coverFileList[0].response?.url) {
        const coverResp = coverFileList[0].response as { url: string; media_id?: string };
        blocks.push({
          id: `block-cover-${Date.now()}`,
          type: 'image',
          order: 0,
          access_level: 1,
          imageUrl: coverResp.url,
          title: `${values.title}封面`,
          description: '',
          ...(coverResp.media_id && { mediaId: coverResp.media_id }),
        } as any);
      }

      // 添加简介文本块
      blocks.push({
        id: `block-intro-${Date.now()}`,
        type: 'text',
        order: blocks.length,
        access_level: 1, // 书籍简介所有内容都是公开的
        content: values.description,
      });

      // 设置封面图片（书籍封面永远是公开的，access_level=1）
      let coverImage = null;
      let coverAccessLevel = 1;

      if (coverFileList.length > 0 && coverFileList[0].response?.url) {
        coverImage = {
          url: coverFileList[0].response.url,
          title: `${values.title}封面`,
          description: ''
        };
        coverAccessLevel = 1; // 书籍封面永远公开
      }

      // 书籍简介都是公开内容，两个字段都设为1
      const visibleAccessLevel = 1;
      const fullAccessLevel = blocks.length > 0
        ? Math.max(...blocks.map((block: any) => block.access_level || 1))
        : 1;

      const articleData = {
        title: '简介',
        author: user?.username || '匿名',
        excerpt: values.description.substring(0, 150) + (values.description.length > 150 ? '...' : ''),
        tags: values.tags || [],
        category_id: categoryId,
        blocks: blocks,
        visible_access_level: visibleAccessLevel, // 书籍简介可见门槛是公开
        full_access_level: fullAccessLevel, // 完整阅读权限取决于blocks的最大值
        cover_image: coverImage,
        cover_access_level: coverAccessLevel,
        status: 'published' as const,
      };

      const articleResult = await apiPostJson<{ success: boolean; error?: string; articleId?: string }>('/api/articles', articleData);

      if (articleResult.success && articleResult.articleId) {
        console.log('成功创建书籍文章:', articleResult.articleId, '分类ID:', categoryId);
        message.success('书籍发布成功！');
        // 清空表单和草稿
        form.resetFields();
        setCoverFileList([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('book-draft');
        }
        // 跳转到bookcase页面
        setTimeout(() => {
          router.push('/bookcase');
        }, 1000);
      } else {
        console.error('发布书籍失败: API返回成功但文章数据缺失', {
          resultSuccess: articleResult.success,
          hasArticleId: !!articleResult.articleId,
          fullResult: articleResult
        });
        message.error(articleResult.error || '发布失败：服务器返回数据异常');
      }
    } catch (error) {
      console.error('发布书籍失败:', error);
      message.error('发布失败，请检查网络连接');
    }
  };

  // 获取下一个书籍order
  const getNextBookOrder = async (): Promise<number> => {
    try {
      const result = await apiGetJson<{ success: boolean; categories: Array<{ order_index?: number }> }>(
        '/api/categories?type=children&parentId=cat_bookcase'
      );

      if (result.success && result.categories.length > 0) {
        const maxOrder = Math.max(...result.categories.map((cat: any) => cat.order_index || 0));
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
    withCredentials: true, // 确保上传请求也携带 HttpOnly cookies
    // 不再需要手动设置 Authorization header，token 在 HttpOnly cookie 中
    // 但 Ant Design Upload 组件需要手动配置 withCredentials
    // 注意：Ant Design Upload 可能不支持 withCredentials，需要自定义上传函数
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
              {/* <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>📖 书籍信息</h3>
              </div> */}

              <Form.Item
                // label="书名"
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
                // label="标签（可选）"
                name="tags"
              // tooltip="添加标签可以帮助读者更好地找到你的书籍"
              >
                <TagInput placeholder="输入标签，按空格或回车添加" maxTags={10} />
              </Form.Item>

              <Upload {...coverUploadProps}>
                {coverFileList.length === 0 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传封面</div>
                  </div>
                )}
              </Upload>
            </Card>

            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px',
              }}
            >
              {/* <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>🖼️ 封面图片（可选）</h3>
                <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                  上传书籍封面图片，没有的话会使用默认封面
                </p>
              </div> */}
              <Form.Item
                // label="书籍简介"
                name="description"
                rules={[{ required: true, message: '请输入书籍简介' }]}
              >
                <TextArea
                  placeholder="简要介绍这本书的内容、特点等..."
                  rows={10}
                />
              </Form.Item>
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

            {/* <Card
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
            </Card> */}
          </Form>
        </div>

      <FloatingActions
        onPublish={() => form.submit()}
        onSave={saveDraft}
        onLoadDraft={loadDraft}
        onClearDraft={clearDraft}
        form={form}
        blocks={blocks}
        isPreviewMode={isPreviewMode}
        setIsPreviewMode={setIsPreviewMode}
        exitPath="/bookcase"
      />
    </>
  );
}

export default PublishBookPage;
