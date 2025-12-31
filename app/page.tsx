'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';

const { Title, Paragraph } = Typography;

export default function Home() {
  const [showNavBar, setShowNavBar] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 滚动监听
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollY = container.scrollTop;
      const threshold = (window.innerHeight || 800) * 0.8; // 80vh
      setShowNavBar(scrollY > threshold);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);




  return (
    <>

    <div
      ref={scrollContainerRef}
      style={{
        height: '100vh',
        overflowY: 'scroll',
      }}
    >
      {/* 第一部分 - 首屏 */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          height: '80vh',
          background: 'transparent',
        }}
      >
        <div className="text-center text-white px-8">
          <Title level={1} className="!text-white mb-6" style={{ fontSize: '3.5rem' }}>
            🐠 欢迎来到
          </Title>
          <Paragraph className="!text-white text-xl mb-8 max-w-2xl">
            一个基于 Next.js 和 Ant Design 构建的现代化 Web 应用
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<DownOutlined />}
            className="animate-bounce"
            style={{
              height: '50px',
              fontSize: '18px',
              borderRadius: '25px',
              padding: '0 32px'
            }}
          >
            探索更多
          </Button>
        </div>
      </div>

      {/* 第二部分 - 内容展示 */}
      <div
        className="flex flex-col items-center"
        style={{
          background: 'transparent',
          minHeight: '100vh',
          borderLeft: '6px solid black',
          borderRight: '6px solid black',
          borderBottom: '6px solid black',
          boxSizing: 'border-box',
          padding: 0
        }}
      >
        {/* 45px导航栏区域 */}
        <div
          style={{
            height: '45px',
            width: '100%',
            background: showNavBar ? 'transparent' : 'black',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            transition: 'background-color 0.3s ease',
            overflow: 'hidden',
          }}
        >
          {showNavBar && (
            <Header embedded={true} />
          )}
        </div>
        {/* 盒模型1：7vh高的透明顶部区域 */}
        <div
          style={{
            height: '7vh',
            background: 'transparent',
            width: '100%',
            flexShrink: 0,
            flexGrow: 0,
          }}
        >
          {/* 透明占位区域 - 可以添加内容 */}
        </div>

        {/* 盒模型2：内容区域 */}
        <div
        className="text-center text-white"
        style={{
          flex: 1,
          width: '100%',
          padding: '40px 24px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          boxSizing: 'border-box',
          }}>
          <Title level={2} className="!text-white mb-6">
            ✨ 关于我们
          </Title>
          <Paragraph className="!text-white text-lg mb-6">
            这是第二部分的内容区域。您可以在这里添加任何您想要展示的内容。
          </Paragraph>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl mb-4">🚀</div>
              <Title level={4} className="!text-white">快速开发</Title>
              <Paragraph className="!text-white/90">
                使用现代化的技术栈，提升开发效率
              </Paragraph>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl mb-4">🎨</div>
              <Title level={4} className="!text-white">精美设计</Title>
              <Paragraph className="!text-white/90">
                采用 Ant Design 设计体系，界面优雅美观
              </Paragraph>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl mb-4">⚡</div>
              <Title level={4} className="!text-white">高性能</Title>
              <Paragraph className="!text-white/90">
                基于 Next.js 16，享受极致的性能体验
              </Paragraph>
            </div>
          </div>
        </div>
      </div>
    </div>


    </>
  );
}
