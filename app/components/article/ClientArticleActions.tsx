'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui';
import { LikeOutlined, ShareAltOutlined, CameraOutlined } from '@ant-design/icons';
import { message } from '@/app/components/ui';
import { apiGet } from '@/lib/apiClient';
import { useResponsive } from '@/app/hooks/useResponsive';

export default function ClientArticleActions({ 
  articleId, 
  initialLikes,
  initialComments 
}: { 
  articleId: string; 
  initialLikes: number;
  initialComments?: number;
}) {
  const { isMobile } = useResponsive();
  const [likes, setLikes] = useState(initialLikes || 0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  // 延迟加载点赞状态检查（优化首屏速度）
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const response = await apiGet(`/api/articles/${articleId}/like`, { requiresAuth: false });
        const result = await response.json();
        if (result.success) {
          setLiked(result.liked);
        }
      } catch (error) {
        console.error('检查点赞状态失败:', error);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [articleId]);

  const handleLike = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/articles/${articleId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();
      
      if (result.success) {
        setLiked(result.liked);
        setLikes(result.likes || likes + (result.liked ? 1 : -1));
      } else {
        message.error(result.error || '点赞失败');
      }
    } catch (e) {
      console.error(e);
      message.error('点赞失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      message.success('链接已复制到剪切板');
    } catch {
      message.error('复制链接失败，请手动复制');
    }
  };

  const handleExportImage = async () => {
    try {
      message.loading({ content: '正在准备导出...', key: 'export' });
      const mod = await import('./exportLongImage');
      await mod.exportArticleAsImage(articleId);
      message.success({ content: '图片已保存！', key: 'export' });
    } catch (error) {
      console.error('导出图片失败:', error);
      message.error({ content: '导出失败，请重试', key: 'export' });
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      paddingBottom: '32px',
      borderBottom: '1px solid #e8e8e8',
      marginBottom: '32px',
    }}>
      <Button
        icon={<LikeOutlined />}
        size="large"
        style={{
          minWidth: isMobile ? '48px' : '120px',
          color: liked ? '#1890ff' : undefined,
          borderColor: liked ? '#1890ff' : undefined,
        }}
        onClick={handleLike}
        loading={loading}
      >
        {!isMobile && <>{liked ? '已点赞' : '点赞'} {likes}</>}
      </Button>
      <Button
        icon={<ShareAltOutlined />}
        size="large"
        style={{ minWidth: isMobile ? '48px' : '120px' }}
        onClick={handleShare}
      >
        {!isMobile && '分享链接'}
      </Button>
      <Button
        icon={<CameraOutlined />}
        size="large"
        style={{ minWidth: isMobile ? '48px' : '120px' }}
        onClick={handleExportImage}
      >
        {!isMobile && '保存为图片'}
      </Button>
    </div>
  );
}
