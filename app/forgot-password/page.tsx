'use client';

import { Button } from '@/app/components/ui';
import { Typography } from '@/app/components/ui/compat';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

export default function ForgotPasswordPage() {
  const router = useRouter();
  return (
    <>
      <div style={{ 
        paddingTop: '8vh',
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      }}>
        <div style={{ 
          textAlign: 'center', 
          background: 'white', 
          padding: '60px 40px', 
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%'
        }}>
          <Title level={2}>🔑 忘记密码</Title>
          <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
            密码重置功能正在开发中，敬请期待！
          </Paragraph>
          <Paragraph style={{ fontSize: '14px', color: '#999' }}>
            如果您忘记了密码，请联系管理员重置。
          </Paragraph>
          <div style={{ 
            background: '#fff7e6', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '32px',
            border: '1px solid #ffd591'
          }}>
            <Paragraph style={{ margin: 0, color: '#fa8c16' }}>
              💡 提示：测试账号无需重置密码<br />
              用户名: <strong>A</strong> / 密码: <strong>123</strong>
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

