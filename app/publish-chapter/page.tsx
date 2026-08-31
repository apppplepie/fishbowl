'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Form, Input, Upload, Select, Dropdown } from '@/app/components/ui/compat';
import type { MenuProps } from '@/app/components/ui/compat';
import { Button, Card, Space, Divider, Tag, message } from '@/app/components/ui';
import { SaveOutlined, ThunderboltOutlined } from '@/app/components/ui/icons';
import { usePageShell, DEFAULT_SCROLL_SNAP_VH } from '@/app/contexts/PageShellContext';
import { useScrollSnapAtTop } from '@/app/hooks/useScrollSnapAtTop';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import type { Block, Article, TextBlock as TextBlockType } from '@/app/types/block';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import FloatingActions, { FloatingActionsProps } from '@/app/components/float/PublishFloat';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { apiGetJson, apiPostJson } from '@/lib/apiClient';
import { getNextOrderIndex } from '@/app/utils/orderIndex';
import { getContentAreaWrapperStyle, contentCardBorderRadius, contentCardBoxShadow } from '@/app/styles/contentArea';
const { Option } = Select;

/**
 * 章节发布页面内部组件
 * 根据category参数发布子级文章
 */
function PublishChapterContent() {
  const [form] = Form.useForm();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const { currentFishbowlTheme } = useAppTheme();
  const searchParams = useSearchParams();
  const { isMobile } = useResponsive();
  const { setConfig } = usePageShell();
  // 从URL参数获取category
  const categoryFromUrl = searchParams.get('category');

  useScrollSnapAtTop();
  // 设置页面配置（含 15vh 吸附）
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      scrollSnapVh: DEFAULT_SCROLL_SNAP_VH,
      box1Content: (
        <div style={{ padding: '16px 24px' }}>
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
      ),
      box2Style: { padding: isMobile ? '40px 12px' : '40px 24px' },
    }));

    return () => {
      setConfig((prev) => ({ ...prev, box1Content: null, scrollSnapVh: undefined }));
    };
  }, [setConfig, isLoggedIn, isMobile]);

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
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 自动加载了章节草稿');
        }
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextOrderInCategory, setNextOrderInCategory] = useState(1);
  const [categoryName, setCategoryName] = useState<string>('');

  const saveTimeoutRef = useRef<number | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // 获取下一个order_index值
  // 使用工具函数计算，同时考虑子分类和文章的最大 order 值

  // 初始化时获取order_index和分类名称
  useEffect(() => {
    if (categoryFromUrl) {
      getNextOrderIndex(categoryFromUrl)
        .then(setNextOrderInCategory)
        .catch(error => {
          console.warn('获取章节顺序失败，使用默认顺序:', error);
          setNextOrderInCategory(0); // 继续发布，后端可能会自动处理
        });
      
      // 获取分类名称
      apiGetJson<{ success: boolean; category?: { name: string } }>(`/api/categories/${categoryFromUrl}`)
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
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 检查是否有实际内容
    const hasContent = blocks.some(block => {
      if (block.type === 'text') return (block as any).content?.trim();
      if (block.type === 'code') return (block as any).code?.trim();
      if (block.type === 'image') return true; // 图片块总是有内容
      return false;
    });

    if (!hasContent) {
      message.warning('请至少添加一些内容');
      setIsSubmitting(false);
      return;
    }

    // 检查是否有关联的目录
    if (!categoryFromUrl) {
      message.error('缺少目录参数，无法发布章节');
      setIsSubmitting(false);
      return;
    }

    // 生成摘要（从第一个文字块提取）
    const excerpt = generateExcerptFromBlocks(blocks);

    // 获取当前用户作为作者
    const author = user?.username || '匿名';

    // 计算 visible_access_level（所有 blocks 的最小值）和 full_access_level（所有 blocks 的最大值）
    const visibleAccessLevel = blocks.length > 0
      ? Math.min(...blocks.map(block => block.access_level || 1))
      : 1;
    const fullAccessLevel = blocks.length > 0
      ? Math.max(...blocks.map(block => block.access_level || 1))
      : 1;

    const articleData = {
      title: values.title,
      author: author,
      excerpt,
      tags: values.tags || [],
      category_id: categoryFromUrl,
      order_index: nextOrderInCategory,
      blocks: blocks,
      visible_access_level: visibleAccessLevel,
      full_access_level: fullAccessLevel,
      // 封面图片由后端自动计算，无需前端提供
      status: 'published' as const,
    };

    console.log('发布章节:', articleData);

    try {
      // 调用API保存文章（token 在 HttpOnly cookie 中）
      const result = await apiPostJson<{ success: boolean; error?: string; articleId?: string }>('/api/articles', articleData);

      if (result.success) {
        message.success('章节发布成功！');

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
    } finally {
      setIsSubmitting(false);
    }
  };

  // 保存草稿：先立即提示用户，再异步写入 localStorage
  const saveDraft = () => {
    const values = form.getFieldsValue();
    const author = user?.username || '匿名';
    const latestBlocks = blocksRef.current;
    const draft = {
      id: `draft-${Date.now()}`,
      title: values.title || '未命名草稿',
      author: author,
      tags: values.tags || [],
      category_id: categoryFromUrl,
      order_index: nextOrderInCategory,
      blocks: latestBlocks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('保存章节草稿:', draft);
    }

    message.success('草稿已保存到本地');
    const doWrite = () => {
      try {
        localStorage.setItem('chapter-draft', JSON.stringify(draft));
      } catch (e) {
        console.warn('保存草稿失败', e);
        message.error('保存草稿失败');
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(doWrite, { timeout: 2000 });
    } else {
      setTimeout(doWrite, 0);
    }
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
    if (process.env.NODE_ENV === 'development') {
      console.log('已清除章节草稿');
    }
  };

  // 防抖草稿：定时器回调从 ref 读最新 blocks，避免每键执行重逻辑
  useEffect(() => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      const values = form.getFieldsValue();
      const latestBlocks = blocksRef.current;
      const draft = {
        id: `draft-${Date.now()}`,
        title: values.title || '未命名草稿',
        author: user?.username || '匿名',
        tags: values.tags || [],
        category_id: categoryFromUrl,
        order_index: nextOrderInCategory,
        blocks: latestBlocks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const doWrite = () => {
        try {
          localStorage.setItem('chapter-draft', JSON.stringify(draft));
        } catch (e) {
          console.warn('保存草稿失败', e);
        }
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(doWrite, { timeout: 2000 });
      } else {
        setTimeout(doWrite, 0);
      }
    }, 10000);
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [blocks, form, user?.username, categoryFromUrl, nextOrderInCategory]);

  // 统计信息 - 使用 useMemo 缓存，避免每次渲染都循环 blocks
  const stats = useMemo(() => {
    const textBlocks = blocks.filter(b => b.type === 'text');
    const imageBlocks = blocks.filter(b => b.type === 'image');
    const codeBlocks = blocks.filter(b => b.type === 'code');
    const totalChars = textBlocks.reduce((sum, block) => sum + ((block as any).content?.length || 0), 0);
    return {
      totalBlocks: blocks.length,
      textBlocks: textBlocks.length,
      imageBlocks: imageBlocks.length,
      codeBlocks: codeBlocks.length,
      totalChars,
      estimatedReadTime: Math.max(1, Math.ceil(totalChars / 400)),
    };
  }, [blocks]);

  // 批量格式化所有文字块 - 从 blocksRef 读取最新 blocks，避免 requestIdleCallback 延迟导致闭包过期
  const batchFormat = (option: FormatOption) => {
    const messages: Record<FormatOption, string> = {
      indent: '首行缩进',
      removeEmpty: '去除所有空行',
      normalizeBreaks: '统一段落间距',
      cleanSpaces: '清理空格',
      chinese: '中文排版',
      removeIndent: '移除缩进',
    };

    message.loading({ content: `正在应用【${messages[option]}】...`, key: 'format', duration: 0 });

    const doFormat = () => {
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

      setBlocks(newBlocks);
      message.success({ content: `已对 ${count} 个文字块应用【${messages[option]}】`, key: 'format' });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(doFormat, { timeout: 3000 });
    } else {
      setTimeout(doFormat, 0);
    }
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
        <div style={getContentAreaWrapperStyle()}>
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
                borderRadius: contentCardBorderRadius,
                boxShadow: contentCardBoxShadow,
                marginBottom: isMobile ? '12px' : '24px',
                background: 'var(--ui-color-bg, #fff)',
                borderColor: 'var(--ui-color-border, #eee)',
              }}
              bodyStyle={{ padding: isMobile ? '0' : '24px' }}
            >
              {/* 移动端隐藏标题和草稿按钮 */}
              {!isMobile && (
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>📝 章节信息</h3>
                  <Space size="middle">
                    <Button type="default" onClick={loadDraft}>加载草稿</Button>
                    <Button type="default" icon={<SaveOutlined />} onClick={saveDraft}>
                      保存草稿
                    </Button>
                  </Space>
                </div>
              )}

              <Form.Item
                label={isMobile ? null : "章节标题"}
                name="title"
                rules={[{ required: true, message: '请输入章节标题' }]}
                style={{ marginBottom: isMobile ? '12px' : '24px' }}
              >
                <Input
                  placeholder="输入章节标题..."
                  size={isMobile ? 'middle' : 'large'}
                  style={{ 
                    fontSize: isMobile ? '16px' : '18px', 
                    fontWeight: 500 
                  }}
                />
              </Form.Item>


              <Form.Item
                label={isMobile ? null : "标签"}
                name="tags"
                tooltip={isMobile ? null : "添加标签可以帮助读者更好地找到你的章节"}
                style={{ marginBottom: isMobile ? '12px' : '24px' }}
              >
                <TagInput placeholder={isMobile ? "标签 (空格/回车)" : "输入标签，按空格或回车添加"} maxTags={10} />
              </Form.Item>

              {categoryFromUrl && (
                <div style={{
                  marginBottom: isMobile ? '0' : '16px',
                  padding: isMobile ? '8px' : '12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  fontSize: isMobile ? '12px' : '14px',
                  color: '#52c41a'
                }}>
                  <strong>📂 发布到目录：</strong>{categoryName || categoryFromUrl}
                  {!isMobile && <br />}
                  {isMobile && ' '}
                  <strong>🔢 序号：</strong>{nextOrderInCategory}
                </div>
              )}
            </Card>

            <Card
              style={{
                borderRadius: contentCardBorderRadius,
                boxShadow: contentCardBoxShadow,
                marginBottom: isMobile ? '60px' : '24px',
                background: 'var(--ui-color-bg, #fff)',
                borderColor: 'var(--ui-color-border, #eee)',
              }}
              bodyStyle={{ padding: isMobile ? '0' : '24px' }}
            >
              <div style={{ 
                marginBottom: isMobile ? '8px' : '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? '8px' : '0',
              }}>
                <Space size="small" wrap>
                  <Tag color="blue">{stats.textBlocks} 文字</Tag>
                  <Tag color="green">{stats.imageBlocks} 图片</Tag>
                  <Tag color="purple">{stats.codeBlocks} 代码</Tag>
                  <Tag color="default">{stats.totalChars} 字</Tag>
                  {stats.textBlocks > 0 && !isPreviewMode && (
                    <Dropdown menu={{ items: batchFormatMenuItems }} placement="bottomRight">
                      <span className="format-trigger-wrap">
                        <Button type="default" size="small" icon={<ThunderboltOutlined />}>
                          {isMobile ? '格式' : '格式化'}
                        </Button>
                      </span>
                    </Dropdown>
                  )}
                </Space>
              </div>

              {!isMobile && <Divider />}

              {isPreviewMode ? (
                // 预览模式：只显示内容，不可编辑
                <div style={{
                  padding: isMobile ? '20px' : '40px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: contentCardBorderRadius,
                  minHeight: '400px',
                  boxShadow: contentCardBoxShadow,
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

      <FloatingActions
        onPublish={() => form.submit()}
        onSave={saveDraft}
        onLoadDraft={loadDraft}
        onClearDraft={clearDraft}
        form={form}
        blocks={blocks}
        isPreviewMode={isPreviewMode}
        setIsPreviewMode={setIsPreviewMode}
        isSubmitting={isSubmitting}
        exitPath="/bookcase"
      />
    </>
  );
}

/**
 * 章节发布页面
 * 用 Suspense 包装以支持 useSearchParams
 */
export default function PublishChapterPage() {
  return (
    <Suspense fallback={<div> </div>}>
      <PublishChapterContent />
    </Suspense>
  );
}
