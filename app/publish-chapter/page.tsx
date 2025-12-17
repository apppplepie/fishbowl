'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  EyeOutlined,
  UploadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import type { Block, Article, TextBlock as TextBlockType } from '@/app/types/block';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import FloatingActions, { FloatingActionsProps } from '@/app/components/float/PublishFloat';

const { Option } = Select;

/**
 * 章节发布页面
 * 根据category参数发布子级文章
 */
export default function PublishChapterPage() {
  const [form] = Form.useForm();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从URL参数获取category
  const categoryFromUrl = searchParams.get('category');

  // 调试：在页面加载时检查登录状态
  React.useEffect(() => {
    console.log('=== 章节发布 - 登录状态检查 ===');
    console.log('isLoggedIn:', isLoggedIn);
    console.log('user:', user);
    
    if (!isLoggedIn || !user) {
      message.warning('您还未登录，请先登录后再发布章节', 5);
    }
  }, [isLoggedIn, user]);

  // 页面加载时自动读取草稿
  React.useEffect(() => {
    const draftStr = localStorage.getItem('chapter-draft');
    if (draftStr) {
      try {
        const draft: Article = JSON.parse(draftStr);
        form.setFieldsValue({
          title: draft.title,
          tags: draft.tags,
        });
        setBlocks(draft.blocks || []);
        console.log('✅ 自动加载了章节草稿');
      } catch (error) {
        console.warn('自动加载章节草稿失败:', error);
      }
    }
  }, []);

  // 初始化一个空的文字块
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: `block-initial-${Date.now()}`,
      type: 'text',
      order: 0,
      content: '',
    }
  ]);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [nextOrderInCategory, setNextOrderInCategory] = useState(1);
  const [categoryName, setCategoryName] = useState<string>('');

  // 自动保存相关
  const lastSavedBlocksRef = useRef<string>('');

  // 获取下一个order_index值
  // 需要考虑同一节点下的categories的order_index和articles的order_index不能重复
  const getNextOrderInCategory = async (categoryId: string): Promise<number> => {
    try {
      let maxOrder = 0;

      // 获取该分类下的所有子分类
      const categoriesResponse = await fetch(`/api/categories?type=children&parentId=${categoryId}`);
      const categoriesResult = await categoriesResponse.json();

      // 获取该分类下的所有文章
      const articlesResponse = await fetch(`/api/articles/list?categoryId=${categoryId}&limit=1000`);
      const articlesResult = await articlesResponse.json();

      // 获取子分类的最大order_index
      if (categoriesResponse.ok && categoriesResult.success && categoriesResult.categories) {
        const categoryOrders = categoriesResult.categories.map((cat: any) => cat.order_index || 0);
        if (categoryOrders.length > 0) {
          maxOrder = Math.max(maxOrder, ...categoryOrders);
        }
      }

      // 获取子文章的最大order_index
      // 注意：/api/articles/list 返回的字段名是 orderInCategory，而不是 order_index
      if (articlesResponse.ok && articlesResult.success && articlesResult.articles) {
        const articleOrders = articlesResult.articles.map((article: any) => article.orderInCategory || 0);
        if (articleOrders.length > 0) {
          maxOrder = Math.max(maxOrder, ...articleOrders);
        }
      }

      return maxOrder + 1;
    } catch (error) {
      console.error('获取order_index失败:', error);
      return 1;
    }
  };

  // 初始化时获取order_index和分类名称
  useEffect(() => {
    if (categoryFromUrl) {
      getNextOrderInCategory(categoryFromUrl).then(setNextOrderInCategory);
      
      // 获取分类名称
      fetch(`/api/categories/${categoryFromUrl}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.category) {
            setCategoryName(result.category.name);
          }
        })
        .catch(error => {
          console.error('获取分类名称失败:', error);
        });
    }
  }, [categoryFromUrl]);

  // 表单提交
  const onFinish = async (values: any) => {
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

    // 检查是否有关联的目录
    if (!categoryFromUrl) {
      message.error('缺少目录参数，无法发布章节');
      return;
    }

    // 生成摘要（从第一个文字块提取）
    const excerpt = generateExcerptFromBlocks(blocks);

    // 获取当前用户作为作者
    const author = user?.username || '匿名';

    const articleData = {
      title: values.title,
      author: author,
      excerpt,
      tags: values.tags || [],
      category_id: categoryFromUrl,
      order_index: nextOrderInCategory,
      blocks: blocks,
      status: 'published' as const,
    };

    console.log('发布章节:', articleData);

    try {
      // 获取 Token
      const token = localStorage.getItem('token');

      if (!token) {
        message.error('请先登录');
        return;
      }

      // 调用API保存文章
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(articleData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success('章节发布成功！');

        // 清除相关书籍的缓存，因为新增了文章
        if (typeof window !== 'undefined' && window.localStorage) {
          const { clearBookCache } = await import('@/app/hooks/useArticleNavigation');
          clearBookCache(categoryFromUrl);
          console.log('已清除新文章所属书籍的缓存:', categoryFromUrl);
        }

        // 清空表单和块
        form.resetFields();
        setBlocks([{
          id: `block-initial-${Date.now()}`,
          type: 'text',
          order: 0,
          content: '',
        }]);
        // 清除草稿
        localStorage.removeItem('chapter-draft');
        // 跳转回bookcase页面
        setTimeout(() => {
          router.push(`/bookcase?category=${categoryFromUrl}`);
        }, 1000);
      } else {
        message.error(result.error || '发布失败，请重试');
      }
    } catch (error) {
      console.error('发布章节失败:', error);
      message.error('发布失败，请检查网络连接');
    }
  };

  // 保存草稿
  const saveDraft = () => {
    const values = form.getFieldsValue();
    const author = user?.username || '匿名';
    const draft = {
      id: `draft-${Date.now()}`,
      title: values.title || '未命名草稿',
      author: author,
      tags: values.tags || [],
      category_id: categoryFromUrl,
      order_index: nextOrderInCategory,
      blocks: blocks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('保存章节草稿:', draft);

    // 这里应该保存到本地存储或后端
    localStorage.setItem('chapter-draft', JSON.stringify(draft));

    message.success('草稿已保存到本地');
  };

  // 加载草稿
  const loadDraft = () => {
    const draftStr = localStorage.getItem('chapter-draft');
    if (draftStr) {
        try {
          const draft: Article = JSON.parse(draftStr);
          form.setFieldsValue({
            title: draft.title,
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

  // 清除草稿
  const clearDraft = () => {
    localStorage.removeItem('chapter-draft');
    console.log('已清除章节草稿');
  };

  // 自动保存草稿 - 每60秒检查一次
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      // 检查 blocks 是否有实际内容且有更新
      const hasContent = blocks.some(block => {
        if (block.type === 'text') return (block.content || '').trim().length > 0;
        if (block.type === 'code') return (block.code || '').trim().length > 0;
        if (block.type === 'image') return true;
        return false;
      });

      if (hasContent) {
        // 比较当前 blocks 与上次保存的是否不同
        const currentBlocksStr = JSON.stringify(blocks);
        if (currentBlocksStr !== lastSavedBlocksRef.current) {
          console.log('🔄 检测到内容变化，自动保存草稿...');
          saveDraft();
          lastSavedBlocksRef.current = currentBlocksStr;
        }
      }
    }, 60000); // 60秒检查一次

    return () => clearInterval(autoSaveInterval);
  }, [blocks]);

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

    setBlocks(newBlocks);

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
      key: 'chinese',
      icon: <ThunderboltOutlined />,
      label: '批量中文排版（一键）',
      onClick: () => batchFormat('chinese'),
    },
    {
      type: 'divider',
    },
    {
      key: 'indent',
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
  ];

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
              📄 发布章节
            </h2>
            {user && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'white',
              }}>
                👤 当前用户: {user.username} ({user.role === 'admin' ? '管理员' : user.role === 'moderator' ? '版主' : '普通用户'})
              </div>
            )}
            {!isLoggedIn && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(255,100,100,0.3)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'white',
                fontWeight: 500,
              }}>
                ⚠️ 未登录状态 - 请先登录
              </div>
            )}
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
                <h3 style={{ margin: 0, fontSize: '18px' }}>📝 章节信息</h3>
                <Space>
                  <Button onClick={loadDraft}>加载草稿</Button>
                  <Button icon={<SaveOutlined />} onClick={saveDraft}>
                    保存草稿
                  </Button>
                </Space>
              </div>

              <Form.Item
                label="章节标题"
                name="title"
                rules={[{ required: true, message: '请输入章节标题' }]}
              >
                <Input
                  placeholder="输入章节标题..."
                  size="large"
                  style={{ fontSize: '18px', fontWeight: 500 }}
                />
              </Form.Item>


              <Form.Item
                label="标签"
                name="tags"
                tooltip="添加标签可以帮助读者更好地找到你的章节"
              >
                <TagInput placeholder="输入标签，按空格或回车添加" maxTags={10} />
              </Form.Item>

              {categoryFromUrl && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#52c41a'
                }}>
                  <strong>📂 发布到目录：</strong>{categoryName || categoryFromUrl}
                  <br />
                  <strong>🔢 章节序号：</strong>{nextOrderInCategory}
                </div>
              )}
            </Card>

            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Tag color="green">{stats.textBlocks} 文字</Tag>
                  <Tag color="orange">{stats.imageBlocks} 图片</Tag>
                  <Tag color="purple">{stats.codeBlocks} 代码</Tag>
                  <Tag>{stats.totalChars} 字</Tag>

                  {stats.textBlocks > 0 && !isPreviewMode && (
                    <Dropdown menu={{ items: batchFormatMenuItems }} placement="bottomRight">
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                      >
                        格式化
                      </Button>
                    </Dropdown>
                  )}
                </Space>
              </div>

              <Divider />

              {isPreviewMode ? (
                // 预览模式：只显示内容，不可编辑
                <div style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '8px',
                  minHeight: '400px',
                }}>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    marginBottom: '24px',
                    color: '#1a1a1a',
                  }}>
                    {form.getFieldValue('title') || '未命名章节'}
                  </h1>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '32px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e8e8e8',
                    fontSize: '14px',
                    color: '#666',
                  }}>
                    <span>👤 作者：{user?.username || '匿名'}</span>
                    <span>📅 {new Date().toLocaleDateString('zh-CN')}</span>
                    <span>⏱️ 约 {stats.estimatedReadTime} 分钟阅读</span>
                  </div>

                  {blocks.map((block, index) => (
                    <div key={block.id} style={{ marginBottom: '32px' }}>
                      {block.type === 'text' && (
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.8',
                          fontSize: '16px',
                          color: '#333',
                        }}>
                          {(block as any).content}
                        </div>
                      )}
                      {block.type === 'image' && (
                        <div style={{ textAlign: 'center' }}>
                          <img
                            src={(block as any).imageUrl}
                            alt={(block as any).title || '图片'}
                            style={{
                              maxWidth: '100%',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                          />
                          {(block as any).title && (
                            <div style={{
                              marginTop: '12px',
                              fontSize: '14px',
                              color: '#666',
                              fontWeight: 500,
                            }}>
                              {(block as any).title}
                            </div>
                          )}
                          {(block as any).description && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '13px',
                              color: '#999',
                            }}>
                              {(block as any).description}
                            </div>
                          )}
                        </div>
                      )}
                      {block.type === 'code' && (
                        <div style={{
                          background: '#282c34',
                          borderRadius: '8px',
                          padding: '20px',
                          overflow: 'auto',
                        }}>
                          {(block as any).title && (
                            <div style={{
                              color: '#61dafb',
                              fontSize: '14px',
                              marginBottom: '12px',
                              fontWeight: 500,
                            }}>
                              {(block as any).title}
                            </div>
                          )}
                          <div style={{
                            fontSize: '13px',
                            color: '#abb2bf',
                            marginBottom: '8px',
                            opacity: 0.7,
                          }}>
                            {(block as any).language || 'code'}
                          </div>
                          <pre style={{
                            margin: 0,
                            color: '#abb2bf',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            overflowX: 'auto',
                          }}>
                            <code>{(block as any).code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // 编辑模式：显示块编辑器
                <BlockEditor blocks={blocks} onChange={setBlocks} showAddButton={false} />
              )}
            </Card>
          </Form>
        </div>
      </PageLayout>

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
