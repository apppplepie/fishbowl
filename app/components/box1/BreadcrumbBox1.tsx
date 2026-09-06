'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/app/components/ui';

export interface BreadcrumbBox1Props {
  type: 'article' | 'book' | 'custom';
  articleId?: string;
  categoryPath?: Array<{ id: string; name: string }>;
  customItems?: Array<{ title: React.ReactNode; onClick?: () => void }>;
  style?: React.CSSProperties;
}

/**
 * 面包屑导航 Box1 组件
 * 支持文章、书籍等不同类型的面包屑导航
 * 
 * 优化说明：
 * - 使用 useMemo 缓存 breadcrumbItems，避免每次渲染都创建新对象
 * - 使用 useCallback 缓存事件处理器，避免创建新的函数引用
 * - 这样可以避免内存泄漏，特别是在路由切换时
 */
export default function BreadcrumbBox1({ 
  type, 
  articleId, 
  categoryPath = [],
  customItems,
  style 
}: BreadcrumbBox1Props) {
  const router = useRouter();

  // 缓存鼠标事件处理器，避免每次渲染都创建新函数
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#1890ff';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#000';
  }, []);

  // 缓存路由跳转处理器
  const handleHomeClick = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleBookcaseClick = useCallback(() => {
    router.push('/library?view=book', { scroll: false });
  }, [router]);

  // 使用 useMemo 缓存 breadcrumbItems，避免不必要的重新创建
  const breadcrumbItems = useMemo(() => {
    if (type === 'custom' && customItems) {
      // 自定义面包屑
      return customItems.map(item => ({
        title: item.onClick ? (
          <a
            style={{
              color: '#000',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={item.onClick}
          >
            {item.title}
          </a>
        ) : (
          <span style={{ color: '#000' }}>{item.title}</span>
        ),
      }));
    }

    if (type === 'article') {
      // 文章面包屑：首页 > 分类层级 > 当前文章
      const items = [
        {
          title: (
            <a
              style={{
                color: '#000',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleHomeClick}
            >
              首页
            </a>
          ),
        },
        ...categoryPath.map((category) => ({
          title: (
            <a
              key={category.id}
              style={{
                color: '#000',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => router.push(`/library?view=doc&category=${category.id}`, { scroll: false })}
            >
              {category.name}
            </a>
          ),
        })),
      ];
      return items;
    }

    if (type === 'book') {
      // 书籍面包屑：书橱 > 书籍分类层级
      const items = [
        {
          title: (
            <a
              style={{
                color: '#000',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleBookcaseClick}
            >
              书橱
            </a>
          ),
        },
        ...categoryPath.map((category) => ({
          title: (
            <a
              key={category.id}
              style={{
                color: '#000',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => router.push(`/library?view=book&category=${category.id}`, { scroll: false })}
            >
              {category.name}
            </a>
          ),
        })),
      ];
      return items;
    }

    return [];
  }, [type, articleId, categoryPath, customItems, router, handleMouseEnter, handleMouseLeave, handleHomeClick, handleBookcaseClick]);

  return (
    <div
      style={{
        padding: '16px 24px 0 24px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        ...style,
      }}
    >
      <Breadcrumb
        className="ui-breadcrumb-single-line"
        items={breadcrumbItems}
        separator={<span style={{ color: '#000' }}>/</span>}
        style={{
          color: '#000',
          fontSize: '14px',
          marginBottom: '8px',
        }}
      />
    </div>
  );
}

