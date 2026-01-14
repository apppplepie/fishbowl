'use client';

import React, { useState, useEffect } from 'react';
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
 */
export default function BreadcrumbBox1({ 
  type, 
  articleId, 
  categoryPath = [],
  customItems,
  style 
}: BreadcrumbBox1Props) {
  const router = useRouter();
  const [breadcrumbItems, setBreadcrumbItems] = useState<any[]>([]);

  useEffect(() => {
    if (type === 'custom' && customItems) {
      // 自定义面包屑
      const items = customItems.map(item => ({
        title: item.onClick ? (
          <a
            style={{
              color: 'white',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            onClick={item.onClick}
          >
            {item.title}
          </a>
        ) : (
          <span style={{ color: 'white' }}>{item.title}</span>
        ),
      }));
      setBreadcrumbItems(items);
      return;
    }

    if (type === 'article') {
      // 文章面包屑：首页 > 分类层级 > 当前文章
      const items = [
        {
          title: (
            <a
              style={{
                color: 'white',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              onClick={() => router.push('/')}
            >
              首页
            </a>
          ),
        },
        ...categoryPath.map((category, index) => ({
          title: (
            <a
              key={category.id}
              style={{
                color: 'white',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              onClick={() => router.push(`/archive?category=${category.id}`)}
            >
              {category.name}
            </a>
          ),
        })),
      ];
      setBreadcrumbItems(items);
    }

    if (type === 'book') {
      // 书籍面包屑：书橱 > 书籍分类层级
      const items = [
        {
          title: (
            <a
              style={{
                color: 'white',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              onClick={() => router.push('/bookcase')}
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
                color: 'white',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              onClick={() => router.push(`/bookcase?category=${category.id}`)}
            >
              {category.name}
            </a>
          ),
        })),
      ];
      setBreadcrumbItems(items);
    }
  }, [type, articleId, categoryPath, customItems, router]);

  return (
    <div style={{ padding: '16px 24px', ...style }}>
      <Breadcrumb items={breadcrumbItems} />
    </div>
  );
}

