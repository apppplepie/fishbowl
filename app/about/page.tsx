'use client';

import { Typography, Card } from 'antd';
import Header from '../components/Header';

const { Title, Paragraph } = Typography;

export default function AboutPage() {
  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' }}>
          <Title level={1} style={{ color: 'white', textAlign: 'center', marginBottom: '40px' }}>
            关于我们
          </Title>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <Card title="公司简介" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <Paragraph>
                我们是一家专注于创新技术的现代化企业，致力于为客户提供最优质的解决方案。
              </Paragraph>
              <Paragraph>
                成立于2020年，我们已经服务了超过1000家企业客户。
              </Paragraph>
            </Card>

            <Card title="我们的使命" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <Paragraph>
                通过技术创新，帮助企业实现数字化转型，提升运营效率和用户体验。
              </Paragraph>
            </Card>

            <Card title="核心价值观" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <ul>
                <li>创新驱动</li>
                <li>客户至上</li>
                <li>追求卓越</li>
                <li>团队协作</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

