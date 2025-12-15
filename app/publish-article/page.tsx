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
import { useRouter } from 'next/navigation';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { FloatingActions } from '@/app/components/float/PublishFloat';

const { Option } = Select;

/**
 * 块编辑器文章发布页面
 */
export default function PublishArticlePage() {
  const [form] = Form.useForm();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  
  // 调试：在页面加载时检查登录状态
  React.useEffect(() => {
    const testTokenValidity = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ 没有找到Token');
        return false;
      }
      
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log('✅ Token有效，用户信息:', result.user);
          message.success(`Token有效！当前用户: ${result.user.username} (${result.user.role})`);
          return true;
        } else {
          console.error('❌ Token无效:', result.error);
          message.error('Token已失效，请重新登录');
          // 清除无效的token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('loginStatusChanged'));
          return false;
        }
      } catch (error) {
        console.error('❌ 测试Token失败:', error);
        message.error('网络错误，无法验证Token');
        return false;
      }
    };
    
    console.log('=== 登录状态检查 ===');
    console.log('isLoggedIn:', isLoggedIn);
    console.log('user:', user);
    console.log('localStorage token:', localStorage.getItem('token'));
    console.log('localStorage user:', localStorage.getItem('user'));
    
    // 如果未登录，显示提示
    if (!isLoggedIn || !user) {
      message.warning('您还未登录，请先登录后再发布内容', 5);
    } else {
      console.log('✅ 已登录，用户:', user.username, '角色:', user.role);
      // 自动测试Token有效性
      testTokenValidity();
    }
  }, [isLoggedIn, user]);
  
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

    // 生成摘要（从第一个文字块提取）
    const excerpt = generateExcerptFromBlocks(blocks);

    // 获取当前用户作为作者
    const author = user?.username || '匿名';

    const articleData = {
      title: values.title,
      author: author,
      excerpt,
      tags: values.tags || [],
      category_id: values.category_id || null,
      blocks: blocks,
      status: 'published' as const,
    };

    console.log('发布文章:', articleData);
    
    try {
      // 获取 Token
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      console.log('=== 提交文章 - Token检查 ===');
      console.log('Token存在:', !!token);
      console.log('Token前20字符:', token?.substring(0, 20));
      console.log('用户信息:', userStr);
      console.log('useAuth状态:', { isLoggedIn, user });
      
      if (!token) {
        console.error('❌ 没有找到Token');
        message.error('请先登录（未找到登录凭证）');
        return;
      }
      
      if (!userStr) {
        console.error('❌ 没有找到用户信息');
        message.error('请先登录（未找到用户信息）');
        return;
      }

      console.log('✅ Token和用户信息都存在，准备发送请求');

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
      
      console.log('=== API响应 ===');
      console.log('状态码:', response.status);
      console.log('响应内容:', result);

      if (response.ok && result.success) {
        message.success('文章发布成功！');
        // 清空表单和块
        form.resetFields();
        setBlocks([{
          id: `block-initial-${Date.now()}`,
          type: 'text',
          order: 0,
          content: '',
        }]);
        // 清除草稿
        localStorage.removeItem('article-draft');
        // 跳转到归档页
        setTimeout(() => {
          router.push('/archive');
        }, 1000);
      } else {
        console.error('❌ 发布失败:', result.error);
        if (response.status === 401) {
          message.error('登录已过期，请重新登录');
          // 清除过期的登录信息
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('loginStatusChanged'));
        } else {
          message.error(result.error || '发布失败，请重试');
        }
      }
    } catch (error) {
      console.error('❌ 发布文章异常:', error);
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
      category_id: values.category_id || null,
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
              ✍️ 创作文章
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
                label="标签"
                name="tags"
                tooltip="添加标签可以帮助读者更好地找到你的文章"
              >
                <TagInput 
                placeholder="输入标签，按空格或回车添加" maxTags={10} 
                />
              </Form.Item>

              <Form.Item
                label="文章目录"
                name="category_id"
                tooltip="选择文章所属分类目录，方便管理和查找"
              >
                <CategoryTreeSelect placeholder="选择文章所属目录（可选）" />
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
      </PageLayout>

      <FloatingActions
        onPublish={() => form.submit()}
        onSave={saveDraft}
        form={form}
        blocks={blocks}
        isPreviewMode={isPreviewMode}
        setIsPreviewMode={setIsPreviewMode}
      />
    </>
  );
}

