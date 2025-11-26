'use client';

import { Typography, Card, Button, Space } from 'antd';
import { PhoneOutlined, MailOutlined, EnvironmentOutlined, WechatOutlined } from '@ant-design/icons';
import Header from '../components/Header';

const { Title, Paragraph } = Typography;

export default function ContactPage() {
  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh', background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' }}>
          <Title level={1} style={{ color: '#333', textAlign: 'center', marginBottom: '20px' }}>
            联系我们
          </Title>
          <Paragraph style={{ color: '#666', textAlign: 'center', fontSize: '18px', marginBottom: '60px' }}>
            我们随时欢迎您的咨询与合作
          </Paragraph>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <Card style={{ textAlign: 'center' }}>
              <PhoneOutlined style={{ fontSize: '48px', color: '#1677ff', marginBottom: '16px' }} />
              <Title level={4}>电话咨询</Title>
              <Paragraph>400-888-8888</Paragraph>
              <Paragraph type="secondary">工作日 9:00-18:00</Paragraph>
            </Card>

            <Card style={{ textAlign: 'center' }}>
              <MailOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>邮箱联系</Title>
              <Paragraph>contact@fishbowl.com</Paragraph>
              <Paragraph type="secondary">24小时内回复</Paragraph>
            </Card>

            <Card style={{ textAlign: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: '48px', color: '#fa8c16', marginBottom: '16px' }} />
              <Title level={4}>公司地址</Title>
              <Paragraph>北京市朝阳区科技园</Paragraph>
              <Paragraph type="secondary">欢迎预约到访</Paragraph>
            </Card>

            <Card style={{ textAlign: 'center' }}>
              <WechatOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>微信客服</Title>
              <Paragraph>fishbowl_service</Paragraph>
              <Paragraph type="secondary">扫码添加客服</Paragraph>
            </Card>
          </div>

          <Card style={{ textAlign: 'center', background: 'rgba(255,255,255,0.9)' }}>
            <Title level={3}>留言咨询</Title>
            <Paragraph>点击按钮留下您的联系方式，我们会尽快与您取得联系</Paragraph>
            <Space size="large" style={{ marginTop: '24px' }}>
              <Button type="primary" size="large">在线留言</Button>
              <Button size="large">预约会议</Button>
            </Space>
          </Card>
        </div>
      </div>
    </>
  );
}

