'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, message, Modal } from 'antd';
import { LikeOutlined, ShareAltOutlined, MessageOutlined, UnorderedListOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageLayout from '@/app/components/PageLayout';
import Header from '@/app/components/Header';
import ArticleTocNav from '@/app/components/ArticleTocNav';
import ArticleTocDrawer from '@/app/components/ArticleTocDrawer';
import ArticleEditFloat, { EditMode } from '@/app/components/ArticleEditFloat';
import { useParams, useRouter } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';

const { TextArea } = Input;

/**
 * 文章详情页面
 * 展示单篇文章的完整内容
 */
export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { isMobile } = useResponsive();
  const { isLoggedIn } = useAuth();
  const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
  
  // 编辑模式状态
  const [editMode, setEditMode] = useState<EditMode>('view');

  // 配置消息提示位置，避免被 header 遮挡
  useEffect(() => {
    message.config({
      top: 60, // header 45px + 15px 间距
      duration: 2,
      maxCount: 3,
    });
  }, []);

  // 监听编辑模式，防止意外离开页面导致数据丢失
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editMode === 'edit') {
        e.preventDefault();
        e.returnValue = '你还有未保存的更改，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editMode]);
  
  // 示例文章数据（后续可以从数据库获取）
  const [article, setArticle] = useState({
    id: articleId,
    title: '这是一篇示例文章的标题',
    author: '张三',
    publishDate: '2024-01-15',
    lastModified: '2024-01-20',
    content: `
这是文章的第一段内容。Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

这是文章的第二段内容。Ut enim ad minim veniam, quis nostrud exercitation ullamco 
laboris nisi ut aliquip ex ea commodo consequat.

## 这是一个小标题

这是小标题下的内容。Duis aute irure dolor in reprehenderit in voluptate velit 
esse cillum dolore eu fugiat nulla pariatur.

### 这是三级标题

更多的内容在这里。Excepteur sint occaecat cupidatat non proident, sunt in culpa 
qui officia deserunt mollit anim id est laborum.

最后一段总结性的内容。感谢阅读！
    `,
    likes: 128,
    shares: 45,
    comments: 23,
  });

  // 编辑时的临时数据
  const [editedArticle, setEditedArticle] = useState(article);

  // 处理文章点击 - 编辑模式下需要确认
  const handleArticleClick = (newArticleId: string) => {
    if (editMode === 'edit') {
      Modal.confirm({
        title: '确认离开当前文章？',
        icon: <ExclamationCircleOutlined />,
        content: '你还有未保存的更改，确定要放弃这些更改并跳转到其他文章吗？',
        okText: '确定离开',
        cancelText: '继续编辑',
        okType: 'danger',
        onOk() {
          setEditMode('view');
          setEditedArticle(article);
          router.push(`/article/${newArticleId}`);
        },
      });
    } else {
      router.push(`/article/${newArticleId}`);
    }
  };

  // 进入编辑模式
  const handleEdit = () => {
    setEditedArticle(article); // 复制当前文章数据到编辑状态
    setEditMode('edit');
    message.info('进入编辑模式');
  };

  // 进入预览模式
  const handlePreview = () => {
    setEditMode('preview');
    message.info('预览模式 - 请确认后保存');
  };

  // 保存文章
  const handleSave = () => {
    setArticle(editedArticle); // 保存编辑的内容
    setEditMode('view');
    message.success('文章已保存！');
    // TODO: 这里后续可以添加实际的保存到数据库的逻辑
  };

  // 取消编辑 - 带确认对话框
  const handleCancel = () => {
    Modal.confirm({
      title: '确认退出编辑？',
      icon: <ExclamationCircleOutlined />,
      content: '你还有未保存的更改，确定要放弃这些更改并退出编辑模式吗？',
      okText: '确定退出',
      cancelText: '继续编辑',
      okType: 'danger',
      onOk() {
        setEditedArticle(article); // 恢复原始数据
        setEditMode('view');
        message.warning('已取消编辑');
      },
    });
  };

  // 返回编辑模式（从预览）
  const handleBackToEdit = () => {
    setEditMode('edit');
  };

  return (
    <>
      {/* Header 覆盖在PageLayout顶部边框上 */}
      <Header 
        leftContent={
          isMobile ? (
            <Button
              type="text"
              icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
              onClick={() => setTocDrawerOpen(true)}
              style={{ border: 'none' }}
            />
          ) : null
        }
      />
      
      {/* 移动端目录抽屉 */}
      <ArticleTocDrawer
        open={tocDrawerOpen}
        onClose={() => setTocDrawerOpen(false)}
        currentArticleId={articleId}
        onArticleClick={handleArticleClick}
      />

      {/* 编辑悬浮按钮 - 仅登录用户可见 */}
      {isLoggedIn && (
        <ArticleEditFloat
          mode={editMode}
          onEdit={handleEdit}
          onPreview={handlePreview}
          onSave={handleSave}
          onCancel={editMode === 'preview' ? handleBackToEdit : handleCancel}
        />
      )}

      {/* 电脑端固定侧边栏 - 从 header 下方到页面底部 */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: '45px', // header 的高度
            bottom: 0,
            width: '280px',
            background: 'white',
            borderRight: '1px solid #e8e8e8',
            zIndex: 999,
            overflowY: 'auto',
          }}
        >
          <ArticleTocNav 
            currentArticleId={articleId}
            onArticleClick={handleArticleClick}
          />
        </div>
      )}
      
      <div style={{ marginLeft: isMobile ? 0 : '280px' }}>
        <PageLayout
          box1Content={
            <div style={{ 
              padding: '12px 24px',
              color: 'white',
              fontSize: '14px',
            }}>
              首页 / 文章归档 / {article.title}
            </div>
          }
          box1BgColor="rgba(0, 0, 0, 0.7)"
          box2BgColor="#f5f5f5"
          box2Style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '900px',
            padding: '40px 24px',
          }}>
            {/* 模式提示 */}
            {editMode !== 'view' && (
              <div style={{
                background: editMode === 'edit' ? '#fff7e6' : '#e6f7ff',
                padding: '12px 20px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: `1px solid ${editMode === 'edit' ? '#ffd591' : '#91d5ff'}`,
                color: editMode === 'edit' ? '#d46b08' : '#0958d9',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                {editMode === 'edit' ? '📝 编辑模式 - 点击预览按钮查看效果' : '👁️ 预览模式 - 确认无误后点击保存'}
              </div>
            )}

            {/* Part 1: 标题和元信息 */}
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {editMode === 'edit' ? (
                // 编辑模式 - 可编辑标题
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#666',
                    }}>
                      文章标题
                    </label>
                    <Input
                      value={editedArticle.title}
                      onChange={(e) => setEditedArticle({ ...editedArticle, title: e.target.value })}
                      placeholder="请输入文章标题"
                      size="large"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    color: '#666',
                    fontSize: '14px',
                    paddingTop: '24px',
                    borderTop: '1px solid #e8e8e8',
                  }}>
                    <span>👤 作者：<strong>{editedArticle.author}</strong></span>
                    <span>📅 发布：{editedArticle.publishDate}</span>
                    <span>🔄 更新：{new Date().toISOString().split('T')[0]}</span>
                  </div>
                </>
              ) : (
                // 浏览/预览模式 - 显示标题
                <>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    marginBottom: '24px',
                    color: '#1a1a1a',
                  }}>
                    {editMode === 'preview' ? editedArticle.title : article.title}
                  </h1>
                  
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    color: '#666',
                    fontSize: '14px',
                    paddingBottom: '24px',
                    borderBottom: '1px solid #e8e8e8',
                  }}>
                    <span>👤 作者：<strong>{editMode === 'preview' ? editedArticle.author : article.author}</strong></span>
                    <span>📅 发布：{editMode === 'preview' ? editedArticle.publishDate : article.publishDate}</span>
                    <span>🔄 更新：{editMode === 'preview' ? editedArticle.lastModified : article.lastModified}</span>
                  </div>
                </>
              )}
            </div>

            {/* Part 2: 文章主体内容 */}
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              lineHeight: '1.8',
              fontSize: '16px',
              color: '#333',
            }}>
              {editMode === 'edit' ? (
                // 编辑模式 - 可编辑内容
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                  }}>
                    文章内容
                  </label>
                  <TextArea
                    value={editedArticle.content}
                    onChange={(e) => setEditedArticle({ ...editedArticle, content: e.target.value })}
                    placeholder="请输入文章内容"
                    rows={20}
                    style={{
                      fontSize: '16px',
                      lineHeight: '1.8',
                    }}
                  />
                </div>
              ) : (
                // 浏览/预览模式 - 显示内容
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {editMode === 'preview' ? editedArticle.content : article.content}
                </div>
              )}
            </div>

            {/* Part 3: 互动按钮和评论区 */}
            <div style={{
              background: 'white',
              padding: '32px 40px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {/* 互动按钮 */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                paddingBottom: '32px',
                borderBottom: '1px solid #e8e8e8',
              }}>
                <Button 
                  icon={<LikeOutlined />} 
                  size="large"
                  style={{ minWidth: '120px' }}
                >
                  点赞 {article.likes}
                </Button>
                <Button 
                  icon={<ShareAltOutlined />} 
                  size="large"
                  style={{ minWidth: '120px' }}
                >
                  分享 {article.shares}
                </Button>
                <Button 
                  icon={<MessageOutlined />} 
                  size="large"
                  style={{ minWidth: '120px' }}
                >
                  评论 {article.comments}
                </Button>
              </div>

              {/* 评论区 */}
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600,
                  marginBottom: '24px',
                }}>
                  评论区（{article.comments}）
                </h3>
                
                {/* 评论列表占位 */}
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#999',
                  background: '#fafafa',
                  borderRadius: '8px',
                }}>
                  <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>暂无评论，来抢沙发吧~</div>
                </div>
              </div>
            </div>
          </div>
        </PageLayout>
      </div>
    </>
  );
}

