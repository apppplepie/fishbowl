'use client';

import React from 'react';
import { Button, Space, Divider } from 'antd';
import { LikeOutlined, ShareAltOutlined, MessageOutlined } from '@ant-design/icons';
import PageLayout from '@/app/components/PageLayout';
import Header from '@/app/components/Header';
import { useParams } from 'next/navigation';

/**
 * 文章详情页面
 * 展示单篇文章的完整内容
 */
export default function ArticlePage() {
  const params = useParams();
  const articleId = params.id as string;

  // 示例文章数据（后续可以从数据库获取）
  const article = {
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
  };

  return (
    <>
      {/* Header 覆盖在PageLayout顶部边框上 */}
      <Header />
      
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
        >
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '40px 24px',
          }}>
            {/* Part 1: 标题和元信息 */}
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                marginBottom: '24px',
                color: '#1a1a1a',
              }}>
                {article.title}
              </h1>
              
              <div style={{
                display: 'flex',
                gap: '24px',
                color: '#666',
                fontSize: '14px',
                paddingBottom: '24px',
                borderBottom: '1px solid #e8e8e8',
              }}>
                <span>👤 作者：<strong>{article.author}</strong></span>
                <span>📅 发布：{article.publishDate}</span>
                <span>🔄 更新：{article.lastModified}</span>
              </div>
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
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {article.content}
              </div>
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
    </>
  );
}

