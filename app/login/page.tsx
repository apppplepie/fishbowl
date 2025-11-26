'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Paragraph } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const [loading, setLoading] = useState(false);

  // 如果已经登录，直接跳转
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      router.push(redirectUrl);
    }
  }, [router, redirectUrl]);

  const onFinish = (values: { username: string; password: string }) => {
    setLoading(true);
    
    // 模拟登录请求
    setTimeout(() => {
      console.log('登录信息:', values);
      
      // 模拟登录成功
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', values.username);
      
      // 触发自定义事件通知其他组件登录状态变化
      window.dispatchEvent(new Event('loginStatusChanged'));
      
      message.success('登录成功！');
      setLoading(false);
      
      // 跳转到原来要去的页面，或者仪表盘
      router.push(redirectUrl);
    }, 1000);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: '100%', maxWidth: '400px', margin: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2}>🐠 登录 Fishbowl</Title>
          <Paragraph type="secondary">
            请输入您的账号和密码
          </Paragraph>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名！' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Paragraph type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：输入任意用户名和密码即可登录（演示）
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}

