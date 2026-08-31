'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Form, Input, Upload, Select, Dropdown } from '@/app/components/ui/compat';
import type { MenuProps } from '@/app/components/ui/compat';
import type { UploadFile } from '@/app/components/ui/compat';
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
import { useRouter } from 'next/navigation';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import FloatingActions, { FloatingActionsProps } from '@/app/components/float/PublishFloat';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { apiPostJson } from '@/lib/apiClient';
import { getNextOrderIndex } from '@/app/utils/orderIndex';
import { getContentAreaWrapperStyle, contentCardBorderRadius, contentCardBoxShadow } from '@/app/styles/contentArea';

const { Option } = Select;

// Force recompile - updated import structure
/**
 * 块编辑器文章发布页面
 */
export default function PublishArticlePage() {
  const [form] = Form.useForm();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const { currentFishbowlTheme } = useAppTheme();
  const { isMobile } = useResponsive();
  const { setConfig } = usePageShell();

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
    const draftStr = localStorage.getItem('article-draft');
    if (draftStr) {
      try {
        const draft: Article = JSON.parse(draftStr);
        form.setFieldsValue({
          title: draft.title,
          tags: draft.tags,
          category_id: draft.category_id ?? undefined,
        });
        setBlocks(draft.blocks || []);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 自动加载了文章草稿');
        }
      } catch (error) {
        console.warn('自动加载草稿失败:', error);
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
  const [formDraftVersion, setFormDraftVersion] = useState(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const draftWritesEnabledRef = useRef(true);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const buildDraft = React.useCallback((): Article => {
    const values = form.getFieldsValue();
    return {
      id: `draft-${Date.now()}`,
      title: values.title || 'Untitled draft',
      author: user?.username || 'Anonymous',
      tags: values.tags || [],
      category_id: values.category_id || null,
      blocks: blocksRef.current,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [form, user?.username]);

  const writeDraft = React.useCallback((draft: Article, idle = false): boolean => {
    const doWrite = () => {
      if (!draftWritesEnabledRef.current) return true;
      try {
        localStorage.setItem('article-draft', JSON.stringify(draft));
        return true;
      } catch (e) {
        console.warn('淇濆瓨鑽夌澶辫触', e);
        return false;
      }
    };

    if (idle && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(doWrite, { timeout: 2000 });
      return true;
    }

    return doWrite();
  }, []);

  // 防抖草稿：仅重置 10s 定时器，回调里从 ref 读最新 blocks，避免每键执行重逻辑
  useEffect(() => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      writeDraft(buildDraft(), true);
    }, 10000);
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [blocks, formDraftVersion, buildDraft, writeDraft]);

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

    // 生成摘要（从第一个文字块提取）
    const excerpt = generateExcerptFromBlocks(blocks);

    // 获取当前用户作为作者
    const author = user?.username || '匿名';

    // 设置默认分类和计算排序
    const categoryId = values.category_id || 'cat_uncategorized';

    // 计算 order_index：找到当前分类下最大的 order 值 + 1
    let orderInCategory = 0;
    try {
      orderInCategory = await getNextOrderIndex(categoryId);
    } catch (error) {
      console.warn('计算排序失败，使用默认顺序:', error);
      // 继续发布，后端可能会自动处理
    }

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
      category_id: categoryId,
      order_index: orderInCategory,
      blocks: blocks,
      visible_access_level: visibleAccessLevel,
      full_access_level: fullAccessLevel,
      // 封面图片由后端自动计算，无需前端提供
      status: 'published' as const,
    };

    try {
      // 调用API保存文章（token 在 HttpOnly cookie 中）
      const result = await apiPostJson<{ success: boolean; error?: string; articleId?: string }>('/api/articles', articleData);

      if (result.success) {
        message.success('文章发布成功！');
        // 清空表单和块
        form.resetFields();
        setBlocks([{
          id: `block-initial-${Date.now()}`,
          type: 'text',
          order: 0,
          content: '',
        }]);
        draftWritesEnabledRef.current = false;
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        // 清除草稿
        localStorage.removeItem('article-draft');
        // 跳转到归档页（带 refresh 参数强制客户端刷新列表）
        setTimeout(() => {
          router.push('/archive?refresh=1');
        }, 1000);
      } else {
        message.error(result.error || '发布失败，请重试');
      }
    } catch (error) {
      console.error('❌ 发布文章异常:', error);
      message.error('发布失败，请检查网络连接');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 保存草稿：手动保存需要立即写入，避免退出前丢字段。
  const saveDraft = () => {
    const draft = buildDraft();

    if (process.env.NODE_ENV === 'development') {
      console.log('保存草稿:', draft);
    }

    if (writeDraft(draft)) {
      message.success('草稿已保存到本地');
    } else {
      message.error('保存草稿失败');
    }
  };

  // 加载草稿
  const loadDraft = () => {
    const draftStr = localStorage.getItem('article-draft');
    if (draftStr) {
        try {
          const draft: Article = JSON.parse(draftStr);
          form.setFieldsValue({
            title: draft.title,
            tags: draft.tags,
            category_id: draft.category_id ?? undefined,
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
    localStorage.removeItem('article-draft');
    if (process.env.NODE_ENV === 'development') {
      console.log('已清除文章草稿');
    }
  };

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
            onValuesChange={() => setFormDraftVersion((version) => version + 1)}
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
              bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
            >
              {/* 移动端隐藏草稿按钮，使用浮动按钮代替 */}
              {!isMobile && (
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size="middle">
                    <Button type="default" onClick={loadDraft}>加载草稿</Button>
                    <Button type="default" icon={<SaveOutlined />} onClick={saveDraft}>
                      保存草稿
                    </Button>
                  </Space>
                </div>
              )}

              <Form.Item
                label={isMobile ? null : "文章标题"}
                name="title"
                rules={[{ required: true, message: '请输入文章标题' }]}
                style={{ marginBottom: isMobile ? '12px' : '24px' }}
              >
                <Input 
                  placeholder="输入文章标题..." 
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
                tooltip={isMobile ? null : "添加标签可以帮助读者更好地找到你的文章"}
                style={{ marginBottom: isMobile ? '12px' : '24px' }}
              >
                <TagInput 
                  placeholder={isMobile ? "标签 (空格/回车)" : "输入标签，按空格或回车添加"} 
                  maxTags={10} 
                />
              </Form.Item>

              <Form.Item
                label={isMobile ? null : "文章目录"}
                name="category_id"
                tooltip={isMobile ? null : "选择文章所属分类目录，方便管理和查找"}
                style={{ marginBottom: isMobile ? '0' : '24px' }}
              >
                <CategoryTreeSelect placeholder={isMobile ? "选择目录（可选）" : "选择文章所属目录（可选）"} />
              </Form.Item>
            </Card>

            <Card
              style={{
                borderRadius: contentCardBorderRadius,
                boxShadow: contentCardBoxShadow,
                marginBottom: isMobile ? '60px' : '24px',
                background: 'var(--ui-color-bg, #fff)',
                borderColor: 'var(--ui-color-border, #eee)',
              }}
              bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
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
                    {form.getFieldValue('title') || '未命名文章'}
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
                    const values = form.getFieldsValue();
                    if (!values.title) {
                      message.warning('请先输入文章标题');
                      return;
                    }
                    if (blocks.length === 0 || !blocks.some(b => {
                      if (b.type === 'text') return (b as any).content?.trim();
                      if (b.type === 'code') return (b as any).code?.trim();
                      if (b.type === 'image') return true;
                      return false;
                    })) {
                      message.warning('请先添加一些内容');
                      return;
                    }
                    setIsPreviewMode(!isPreviewMode);
                    message.info(isPreviewMode ? '退出预览模式' : '进入预览模式');
                  }}
                  type={isPreviewMode ? 'primary' : 'default'}
                >
                  {isPreviewMode ? '退出预览' : '预览'}
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
        isSubmitting={isSubmitting}
        exitPath="/archive"
      />
    </>
  );
}

