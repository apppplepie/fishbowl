// 使用示例文件 - 展示如何使用 PageLayout 组件
// 使用完可以删除此文件

'use client';

import PageLayout from './PageLayout';

// ========== 示例 1: 基础使用 ==========
export function Example1BasicUsage() {
  return (
    <PageLayout>
      <div style={{ padding: '20px' }}>
        <h1>这是页面内容</h1>
        <p>整个页面（盒1和盒2）可以一起滚动</p>
        {/* 添加更多内容测试滚动 */}
        {Array.from({ length: 50 }).map((_, i) => (
          <p key={i}>内容行 {i + 1}</p>
        ))}
      </div>
    </PageLayout>
  );
}

// ========== 示例 2: 自定义颜色 ==========
export function Example2CustomColors() {
  return (
    <PageLayout
      box1BgColor="#ff6b6b"
      box2BgColor="#fff"
    >
      <div style={{ padding: '20px' }}>
        <h1>自定义颜色的页面</h1>
        <p>盒1是红色，盒2是白色</p>
      </div>
    </PageLayout>
  );
}

// ========== 示例 3: 盒1带内容 ==========
export function Example3WithBox1() {
  return (
    <PageLayout
      box1BgColor="#3498db"
      box2BgColor="#ecf0f1"
      box1Content={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          页面标题
        </div>
      }
    >
      <div style={{ padding: '20px' }}>
        <h1>带盒1内容的页面</h1>
        <p>盒1区域显示了标题</p>
      </div>
    </PageLayout>
  );
}

// ========== 示例 4: 完整应用示例 ==========
export function Example4FullPage() {
  return (
    <PageLayout
      box1BgColor="linear-gradient(90deg, #667eea 0%, #764ba2 100%)"
      box2BgColor="#f8f9fa"
      box1Content={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 20px',
          height: '100%',
          color: 'white'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>我的应用</div>
          <div>菜单按钮</div>
        </div>
      }
      box2Style={{ padding: '20px' }}
    >
      <h1>欢迎来到我的页面</h1>
      <p>这是一个完整的页面示例</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>功能特点</h2>
        <ul>
          <li>盒1：60px高，紧贴大盒子边框</li>
          <li>盒2：内容区域，紧贴盒1</li>
          <li>整体可滚动（盒1和盒2一起滚动）</li>
          <li>黑色边框样式</li>
          <li>灵活的自定义选项</li>
        </ul>
      </div>

      {/* 添加更多内容测试滚动 */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{ 
          marginTop: '15px', 
          padding: '15px', 
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          卡片内容 {i + 1}
        </div>
      ))}
    </PageLayout>
  );
}

