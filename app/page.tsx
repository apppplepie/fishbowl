'use client';

import { Button, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';

const { Title, Paragraph } = Typography;

export default function Home() {
  const [isLocked, setIsLocked] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('part-1');
  const [isScrolling, setIsScrolling] = useState(false);

  const part1Ref = useRef<HTMLDivElement>(null);
  const part2Ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // 滚动容器的 ref

  // 使用 IntersectionObserver 精确判断当前在哪个 section
  useEffect(() => {
    const options = {
      threshold: 0.98, // 当 section 有 80% 在视口中时，认为进入该 section
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            setActiveSection(id);
          }
        }
      });
    }, options);

    if (part1Ref.current) observer.observe(part1Ref.current);
    if (part2Ref.current) observer.observe(part2Ref.current);

    return () => observer.disconnect();
  }, []);

  // 检测滚动状态（用于判断是否正在滚动）
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout | null = null;
    const container = containerRef.current;

    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimer) clearTimeout(scrollTimer);
      
      scrollTimer = setTimeout(() => {
        setIsScrolling(false); // 停止滚动 150ms 后认为滚动结束
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  // 根据当前 section 和滚动状态来控制显示逻辑
  useEffect(() => {
    // 当完全停在 part-2 时
    if (activeSection === 'part-2' && !isScrolling) {
      if (!isLocked) {
        setIsLocked(true);   // 隐藏 part1
        setShowHeader(true); // 显示 header
      }
    }
  }, [activeSection, isScrolling, isLocked]);

  // 平滑滚动到第二部分
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 解锁：显示 part1，隐藏 header
  const startUnlock = () => {
    setShowHeader(false); // 隐藏 header
    setIsLocked(false);   // 显示 part1
  };




  return (
    <>
    {/* Header 组件 */}
    <Header isVisible={showHeader} />
    
    <div 
      ref={containerRef}
      className="snap-container"
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
        ref={part1Ref}
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
        ref={part2Ref}
        className="h-screen flex flex-col items-center"
        style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          overflowY: 'auto',
          borderTop:'45px solid black',
          borderLeft: '6px solid black',
          borderRight: '6px solid black',
          borderBottom: '6px solid black',
          boxSizing: 'border-box',
          padding: 0
        }}
      >
        {/* 盒模型1：60px高的顶部区域 */}
        <div
          style={{
            height: '7vh',
            background: ' #764ba2 100%',
            width: '100%',
            flexShrink: 0,
            flexGrow: 0,
          }}
        >&nbsp;</div>

        {/* 盒模型2：内容区域 */}
        <div className="max-w-4xl text-center text-white" style={{ padding: '40px 24px' }}>
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
            onClick={startUnlock}
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

    {/* 调试信息：显示当前状态 */}
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'monospace',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div>📍 当前: <strong>{activeSection}</strong></div>
      <div>🔄 滚动中: <strong>{isScrolling ? '是' : '否'}</strong></div>
      <div>🔒 已锁定: <strong>{isLocked ? '是' : '否'}</strong></div>
      <div>📋 Header: <strong>{showHeader ? '显示' : '隐藏'}</strong></div>
    </div>
    </>
  );
}
