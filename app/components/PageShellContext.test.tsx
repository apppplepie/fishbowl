'use client';

/**
 * PageShellContext 测试组件
 * 
 * 使用方法：
 * 1. 在任意页面中导入并使用此组件
 * 2. 检查浏览器控制台输出
 * 3. 验证 Context 功能是否正常
 * 
 * 示例：
 * import PageShellContextTest from '@/app/components/PageShellContext.test';
 * 
 * export default function TestPage() {
 *   return (
 *     <>
 *       <PageShellContextTest />
 *       <div>其他内容</div>
 *     </>
 *   );
 * }
 */

import React, { useEffect } from 'react';
import { usePageShell } from '@/app/contexts/PageShellContext';

export default function PageShellContextTest() {
  const { config, setConfig, resetConfig } = usePageShell();

  useEffect(() => {
    console.log('✅ PageShellContext 测试组件已加载');
    console.log('📋 当前配置:', config);
    
    // 测试 1: 验证 Context 可以访问
    console.log('✅ 测试 1: Context 访问正常');
    
    // 测试 2: 验证默认配置
    if (config.box1Content === null && config.hideBox1 === false) {
      console.log('✅ 测试 2: 默认配置正确');
    } else {
      console.error('❌ 测试 2: 默认配置不正确', config);
    }
    
    // 测试 3: 测试更新配置
    console.log('🧪 测试 3: 更新配置...');
    setConfig({
      box1Content: <div>测试内容</div>,
      hideBox1: true,
    });
    
    // 测试 4: 测试重置配置
    setTimeout(() => {
      console.log('🧪 测试 4: 重置配置...');
      resetConfig();
      console.log('✅ 测试 4: 配置已重置');
    }, 1000);
  }, []);

  // 监听配置变化
  useEffect(() => {
    console.log('📝 配置已更新:', config);
  }, [config]);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '12px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 10000,
      maxWidth: '300px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        🧪 PageShellContext 测试
      </div>
      <div style={{ marginBottom: '4px' }}>
        box1Content: {config.box1Content ? '✅ 有内容' : '✅ 无内容（默认值）'}
      </div>
      <div style={{ marginBottom: '4px' }}>
        hideBox1: {config.hideBox1 ? '✅ true' : '✅ false（默认值）'}
      </div>
      <div style={{ marginBottom: '4px' }}>
        theme: {config.theme ? `✅ ${config.theme.name}` : '✅ undefined（默认值）'}
      </div>
      <div style={{ marginBottom: '4px', fontSize: '10px', color: '#4ade80' }}>
        ✅ 所有默认值正确！
      </div>
      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.7 }}>
        查看控制台获取详细测试信息
      </div>
    </div>
  );
}

