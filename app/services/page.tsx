'use client';

import { Typography, Card, Tag } from 'antd';
import { RocketOutlined, CloudOutlined, MobileOutlined, SafetyOutlined } from '@ant-design/icons';
import Header from '../components/Header';

const { Title, Paragraph } = Typography;

export default function ServicesPage() {
  const services = [
    {
      icon: <RocketOutlined style={{ fontSize: '48px', color: '#1677ff' }} />,
      title: 'Web 开发',
      description: '提供现代化的 Web 应用开发服务，使用最新的技术栈',
      tags: ['React', 'Next.js', 'Node.js'],
    },
    {
      icon: <MobileOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      title: '移动应用',
      description: '开发跨平台移动应用，一次开发多端运行',
      tags: ['React Native', 'Flutter', 'iOS/Android'],
    },
    {
      icon: <CloudOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      title: '云服务',
      description: '提供云基础设施搭建和管理服务',
      tags: ['AWS', 'Azure', 'Docker'],
    },
    {
      icon: <SafetyOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
      title: '安全咨询',
      description: '为您的应用提供安全评估和防护方案',
      tags: ['安全审计', '渗透测试', '加密方案'],
    },
  ];

  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' }}>
          <Title level={1} style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
            我们的服务
          </Title>
          <Paragraph style={{ color: 'white', textAlign: 'center', fontSize: '18px', marginBottom: '60px' }}>
            为您提供全方位的技术解决方案
          </Paragraph>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {services.map((service, index) => (
              <Card
                key={index}
                hoverable
                style={{ background: 'rgba(255,255,255,0.95)', textAlign: 'center' }}
              >
                <div style={{ marginBottom: '20px' }}>{service.icon}</div>
                <Title level={3}>{service.title}</Title>
                <Paragraph>{service.description}</Paragraph>
                <div style={{ marginTop: '16px' }}>
                  {service.tags.map((tag) => (
                    <Tag key={tag} color="blue" style={{ marginBottom: '8px' }}>
                      {tag}
                    </Tag>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

