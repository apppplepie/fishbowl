'use client';

import React, { useState } from 'react';
import { Layout, Menu, Drawer, Button, Card, Tag, Flex } from 'antd';
import { 
  MenuOutlined, 
  AppstoreOutlined, 
  FileTextOutlined, 
  TagsOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';

const { Sider, Content } = Layout;

// 侧边栏菜单项（占位数据）
const sideMenuItems: MenuProps['items'] = [
  {
    key: 'all',
    icon: <AppstoreOutlined />,
    label: '全部内容',
  },
  {
    key: 'recent',
    icon: <ClockCircleOutlined />,
    label: '最近更新',
  },
  {
    key: 'categories',
    icon: <TagsOutlined />,
    label: '分类',
    children: [
      { key: 'cat-1', label: '技术文章' },
      { key: 'cat-2', label: '生活随笔' },
      { key: 'cat-3', label: '摄影作品' },
      { key: 'cat-4', label: '其他' },
    ],
  },
  {
    key: 'drafts',
    icon: <FileTextOutlined />,
    label: '草稿箱',
  },
];

// 标签数据（占位展示）
const tags = [
  { id: 1, name: '技术', color: 'blue' },
  { id: 2, name: '生活', color: 'green' },
  { id: 3, name: '摄影', color: 'orange' },
  { id: 4, name: '随笔', color: 'purple' },
  { id: 5, name: '旅行', color: 'cyan' },
  { id: 6, name: '美食', color: 'gold' },
  { id: 7, name: '读书', color: 'geekblue' },
];

/**
 * 文章归档页面
 * 响应式布局：电脑端显示左侧边栏，手机端使用抽屉
 * Box1: 标签展示区
 * Box2: 文章列表区
 */
export default function ArticlesPage() {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState('all');

  // 侧边栏菜单组件
  const SideMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={['categories']}
      theme={isMobile ? 'dark' : 'light'}
      style={{ 
        height: '100%', 
        borderInlineEnd: 0,
        background: isMobile ? 'black' : 'transparent',
      }}
      items={sideMenuItems}
      onClick={(e) => {
        setSelectedKey(e.key);
        if (isMobile) {
          setDrawerOpen(false);
        }
      }}
    />
  );

  // 点击文章卡片跳转到详情页
  const handleArticleClick = (id: number) => {
    router.push(`/article/${id}`);
  };

  return (
    <>
      {/* Header 独立在最顶部，覆盖在边框上 */}
      <Header 
        leftContent={
          isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: '20px', color: 'white' }} />}
              onClick={() => setDrawerOpen(true)}
              style={{ border: 'none' }}
            />
          ) : undefined
        }
      />
      
      <PageLayout
        box1Content={
          <div style={{ padding: '16px 24px' }}>
            <Flex gap="small" align="center" wrap>
              {tags.map((tag) => (
                <Tag
                  key={tag.id}
                  color={tag.color}
                  style={{
                    fontSize: '14px',
                    padding: '4px 12px',
                  }}
                >
                  {tag.name}
                </Tag>
              ))}
            </Flex>
          </div>
        }
        box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        box2BgColor="#f0f2f5"
      >
        <Layout style={{ minHeight: '100%', background: 'transparent' }}>
          {/* 电脑端 - 固定侧边栏 */}
          {!isMobile && (
            <Sider 
              width={240} 
              style={{ 
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
              }}
            >
            <div style={{ 
              padding: '16px',
              borderBottom: '1px solid #f0f0f0',
              fontWeight: 600,
              fontSize: '16px',
            }}>
              内容导航
            </div>
            <SideMenu />
          </Sider>
        )}

        {/* 手机端 - 抽屉式侧边栏 */}
        {isMobile && (
          <Drawer
            title={<span style={{ color: 'white' }}>内容导航</span>}
            placement="left"
            onClose={() => setDrawerOpen(false)}
            open={drawerOpen}
            closable={false}
            mask={true}
            maskClosable={true}
            styles={{
              body: { 
                padding: 0,
                background: 'black',
              },
              header: {
                background: 'black',
                borderBottom: '1px solid #333',
                color: 'white',
              },
            }}
          >
            <SideMenu />
          </Drawer>
        )}

        {/* 主内容区域 */}
        <Layout style={{ padding: isMobile ? '16px' : '24px' }}>
          {/* 内容区 */}
          <Content
            style={{
              padding: isMobile ? '16px' : '24px',
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: '8px',
            }}
          >
            <h1 style={{ marginBottom: '24px' }}>文章归档</h1>
            
            {/* 占位内容 - 示例卡片 */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px' 
            }}>
              {[1, 2, 3, 4, 5].map((item) => (
                <Card
                  key={item}
                  hoverable
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={() => handleArticleClick(item)}
                  cover={
                    <div style={{
                      height: isMobile ? '150px' : '200px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: 'bold',
                    }}>
                      文章 {item}
                    </div>
                  }
                >
                  <Card.Meta
                    title={`示例文章标题 ${item}`}
                    description="这是一段文章摘要的占位文字。这里将显示文章的简短介绍，帮助读者快速了解文章内容..."
                  />
                  <div style={{ 
                    marginTop: '12px', 
                    color: '#999', 
                    fontSize: '12px',
                    display: 'flex',
                    gap: '16px',
                  }}>
                    <span>📅 2024-01-{10 + item}</span>
                    <span>👁️ {item * 100} 浏览</span>
                    <span>💬 {item * 5} 评论</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* 加载更多占位 */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: '32px',
              padding: '16px',
            }}>
              <Button type="primary" size="large">
                加载更多
              </Button>
            </div>
          </Content>
        </Layout>
        </Layout>
      </PageLayout>
    </>
  );
}

