'use client';

import { Typography, Card, Button } from 'antd';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    // 触发自定义事件通知其他组件登录状态变化
    window.dispatchEvent(new Event('loginStatusChanged'));
    router.push('/login');
  };

  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh', background: '#f0f2f5', padding: '80px 24px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Title level={1}>🎯 仪表盘</Title>
          <Paragraph>这是一个受保护的页面，只有登录用户才能访问。</Paragraph>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
            <Card title="用户统计" hoverable>
              <Paragraph>总用户数: 1,234</Paragraph>
              <Paragraph>活跃用户: 567</Paragraph>
            </Card>
            
            <Card title="订单统计" hoverable>
              <Paragraph>今日订单: 89</Paragraph>
              <Paragraph>总订单: 3,456</Paragraph>
            </Card>
            
            <Card title="收入统计" hoverable>
              <Paragraph>今日收入: ¥12,345</Paragraph>
              <Paragraph>总收入: ¥567,890</Paragraph>
            </Card>
          </div>

          <div style={{ marginTop: '40px' }}>
            <Button danger onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

