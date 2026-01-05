'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 携带 cookie
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
          display_name: values.display_name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success('注册成功！');
        
        // 只保存用户信息（token 已存储在 HttpOnly cookie 中）
        if (data.user) {
          sessionStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('isLoggedIn', 'true');
        }
        
        // 跳转到首页
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        message.error(data.error || '注册失败，请稍后重试');
      }
    } catch (error) {
      console.error('注册错误:', error);
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <PageLayout
        box1Content={
          <div style={{ 
            padding: '12px 24px',
            color: 'white',
            fontSize: '14px',
          }}>
            首页 / 用户注册
          </div>
        }
        box1BgColor="rgba(0, 0, 0, 0.7)"
        box2BgColor="#f5f5f5"
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '600px',
          padding: '40px 20px',
        }}>
          <Card
            style={{
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ 
              textAlign: 'center', 
              marginBottom: '32px', 
              fontSize: '28px',
              fontWeight: 700,
            }}>
              🐠 注册 Fishbowl
            </h2>
            
            <Form
              form={form}
              name="register"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名！' },
                  { 
                    pattern: /^[a-zA-Z0-9_]{3,20}$/, 
                    message: '用户名必须是3-20个字符，只能包含字母、数字和下划线' 
                  },
                ]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="3-20个字符，字母、数字或下划线"
                />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱！' },
                  { type: 'email', message: '请输入有效的邮箱地址！' },
                ]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="your@email.com"
                />
              </Form.Item>

              <Form.Item
                label="昵称（可选）"
                name="display_name"
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="显示名称，留空则使用用户名"
                />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: '请输入密码！' },
                  { min: 6, message: '密码至少需要6个字符！' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="至少6个字符"
                />
              </Form.Item>

              <Form.Item
                label="确认密码"
                name="confirm_password"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码！' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致！'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="再次输入密码"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  block 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                >
                  注册
                </Button>
              </Form.Item>

              <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                已有账号？{' '}
                <a onClick={() => router.push('/')}>
                  返回登录
                </a>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </PageLayout>
    </>
  );
}
