'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState } from 'react';
import Header from './components/Header';

const { Title, Paragraph } = Typography;

export default function Home() {
  const [isLocked, setIsLocked] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  // 平滑滚动到第二部分
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 解锁并返回顶部
  const unlockAndGoBack = () => {
    // 先渐隐隐藏header
    setShowHeader(false);
    setIsLocked(false);
    // 立即滚动到顶部
    requestAnimationFrame(() => {
      scrollToSection('part-1');
    });
  };

  // 检测是否完全滚动到 part2
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const threshold = window.innerHeight * 0.8; // 80vh
    
    // 完全滚动到 part2 就锁定
    if (scrollTop >= threshold && !isLocked) {
      setIsLocked(true);
      // 锁定后0.5秒渐显显示header
      setTimeout(() => {
        setShowHeader(true);
      }, 500);
    }
  };




  return (
    <>
    {/* Header 组件 */}
    <Header isVisible={showHeader} />
    
    <div 
      className="snap-container"
      onScroll={handleScroll}
      style={{
        height: '100vh',
        overflowY: isLocked ? 'hidden' : 'scroll',
        scrollSnapType: isLocked ? 'none' : 'y mandatory',
        scrollBehavior: 'smooth',
      }}
    >
      {/* 第一部分 - 首屏 */}
      <div 
        id="part-1" 
        className="flex flex-col items-center justify-center"
        style={{ 
          display: isLocked ? 'none' : 'flex',
          height: '80vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always'
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
            onClick={() => scrollToSection('part-2')}
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
        id="part-2" 
        className="h-screen flex flex-col items-center justify-center p-8"
        style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          overflowY: 'auto',
          borderTop:'8vh solid black',
          borderLeft: '6px solid black',
          borderRight: '6px solid black',
          borderBottom: '6px solid black',
          boxSizing: 'border-box'
        }}
      >
        <div className="max-w-4xl text-center text-white">
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

          <Button 
            type="default"
            size="large"
            onClick={unlockAndGoBack}
            className="mt-12"
            style={{ 
              height: '50px', 
              fontSize: '16px',
              borderRadius: '25px',
              padding: '0 32px'
            }}
          >
            🔓 解锁并返回顶部
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
