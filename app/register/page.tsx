'use client';

import { Typography, Button } from 'antd';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

const { Title, Paragraph } = Typography;

export default function RegisterPage() {
  const router = useRouter();

  return (
    <>
      <Header />
      <div style={{ 
        paddingTop: '8vh',
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          textAlign: 'center', 
          background: 'white', 
          padding: '60px 40px', 
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%'
        }}>
          <Title level={2}>📝 注册页面</Title>
          <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
            注册功能正在开发中，敬请期待！
          </Paragraph>
          <Paragraph style={{ fontSize: '14px', color: '#999' }}>
            目前您可以使用测试账号登录：
          </Paragraph>
          <div style={{ 
            background: '#f0f5ff', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '32px'
          }}>
            <Paragraph style={{ margin: 0 }}>
              用户名: <strong>A</strong><br />
              密码: <strong>123</strong>
            </Paragraph>
          </div>
          <Button type="primary" size="large" onClick={() => router.back()}>
            返回上一页
          </Button>
        </div>
      </div>
    </>
  );
}

