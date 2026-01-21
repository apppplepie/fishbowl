import React, { useState, useRef } from 'react';
import '../../styles/fish-sidebar.css';
import { DEFAULT_FISH_CONFIG } from '../../config/fishConfig';

interface SidebarProps {
  config: FishConfig;
  onChange: (newConfig: FishConfig) => void;
  minimizable?: boolean;
  onConfigSaved?: () => void;
  onConfigReset?: () => void;
}

export interface FishConfig {
  colors: {
    body: string;
    bodyAccent: string;
    tail: string;
    tailAccent: string;
    dorsal: string;
    dorsalAccent: string;
    eye: string;
  };
  behavior: {
    agility: number; // 0 to 1
    energy: number;  // 0 to 1
    scale: number;   // 0.5 to 2
  };
}


const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChange,
  minimizable = true,
  onConfigSaved,
  onConfigReset
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 跟踪当前打开的颜色选择器，防止重渲染时失去焦点
  const activeColorInputRef = useRef<HTMLInputElement | null>(null);
  // sidebar 容器的引用，用于检测点击外部
  const sidebarRef = useRef<HTMLDivElement>(null);

  const updateColor = (part: keyof FishConfig['colors'], value: string) => {
    onChange({
      ...config,
      colors: { ...config.colors, [part]: value },
    });
  };

  const updateBehavior = (param: keyof FishConfig['behavior'], value: number) => {
    onChange({
      ...config,
      behavior: { ...config.behavior, [param]: value },
    });
  };

  // 保存配置到服务器
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/fish/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          colors: config.colors,
          behavior: config.behavior,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 调用父组件的回调
        onConfigSaved?.();
      } else {
        console.error('保存失败:', data.error);
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 重置配置从服务器加载（取消按钮）
  const handleReset = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fish/config');
      const data = await response.json();

      if (data.success && data.config) {
        // 从数据库读取到配置，更新配置
        onChange(data.config);
        // 调用父组件的回调
        onConfigReset?.();
      } else {
        // 读不到数据，使用默认配置（所有颜色都是 '#991b1b'）
        onChange(DEFAULT_FISH_CONFIG);
        // 调用父组件的回调
        onConfigReset?.();
      }
    } catch (error) {
      console.error('加载失败:', error);
      // 出错时也使用默认配置
      onChange(DEFAULT_FISH_CONFIG);
      // 调用父组件的回调
      onConfigReset?.();
    } finally {
      setIsLoading(false);
    }
  };

  // Minimized State
  if (minimizable && isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fish-sidebar-minimized"
        title="Open Controls"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      </button>
    );
  }

  const handleColorChange = (key: keyof FishConfig['colors']) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColor(key, e.target.value);
    // 不自动关闭调色板，让用户手动关闭
  };

  const handleColorFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // 记录当前打开的颜色选择器
    activeColorInputRef.current = e.currentTarget;
  };

  const handleColorBlur = () => {
    // 清除引用
    activeColorInputRef.current = null;
  };

  // 防止点击调色板触发喂食游戏
  const handleColorPickerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };


  const GradientRow = ({ label, startKey, endKey }: { label: string, startKey: keyof FishConfig['colors'], endKey: keyof FishConfig['colors'] }) => (
    <div className="fish-sidebar-gradient-row">
      <span className="fish-sidebar-gradient-label">{label}</span>
      <div className="fish-sidebar-color-picker-container" onClick={handleColorPickerClick}>
        <div className="fish-sidebar-color-picker" title={`${label} 主色`} onClick={handleColorPickerClick}>
          <input
            type="color"
            value={config.colors[startKey]}
            onChange={handleColorChange(startKey)}
            onFocus={handleColorFocus}
            onBlur={handleColorBlur}
            className="fish-sidebar-color-input"
            aria-label={`${label} 主色`}
          />
          <div style={{ backgroundColor: config.colors[startKey], width: '100%', height: '100%' }} />
        </div>

        <div className="fish-sidebar-gradient-bar" style={{ '--start-color': config.colors[startKey], '--end-color': config.colors[endKey] } as React.CSSProperties} />

        <div className="fish-sidebar-color-picker" title={`${label} 渐变色`} onClick={handleColorPickerClick}>
          <input
            type="color"
            value={config.colors[endKey]}
            onChange={handleColorChange(endKey)}
            onFocus={handleColorFocus}
            onBlur={handleColorBlur}
            className="fish-sidebar-color-input"
            aria-label={`${label} 渐变色`}
          />
          <div style={{ backgroundColor: config.colors[endKey], width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );

  const SliderRow = ({ label, value, onChange, min, max, step, displayValue }: any) => (
      <div className="fish-sidebar-slider-row">
        <div className="fish-sidebar-slider-label-container">
          <span>{label}</span>
          <span className="fish-sidebar-slider-label">{displayValue}</span>
        </div>
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="fish-sidebar-slider"
        />
     </div>
  );

  return (
    <div className="fish-sidebar" ref={sidebarRef} onMouseLeave={() => {
      // 当鼠标离开sidebar时，如果有打开的调色板，关闭它
      if (activeColorInputRef.current) {
        activeColorInputRef.current.blur();
        activeColorInputRef.current = null;
      }
    }}>

      {/* Header */}
      <div className="fish-sidebar-header">
        <div className="fish-sidebar-header-content">
           <span className="fish-sidebar-title">鱼的配置</span>
        </div>
        {minimizable && (
          <button
            onClick={() => setIsMinimized(true)}
            className="fish-sidebar-minimize-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="fish-sidebar-content">

        {/* Section: Pigmentation */}
        <div className="fish-sidebar-section">
          <div className="space-y-3">
             <GradientRow label="Body" startKey="body" endKey="bodyAccent" />
             <GradientRow label="Tail" startKey="tail" endKey="tailAccent" />
             <GradientRow label="Fin" startKey="dorsal" endKey="dorsalAccent" />
          </div>
        </div>

        {/* Divider */}
        <div className="fish-sidebar-divider" />

        {/* Section: Dynamics */}
        <div className="fish-sidebar-section">
           <SliderRow 
              label="Agility" 
              value={config.behavior.agility} 
              onChange={(v: number) => updateBehavior('agility', v)}
              min="0" max="1" step="0.01"
              displayValue={`${Math.round(config.behavior.agility * 100)}%`}
           />
           <SliderRow 
              label="能量" 
              value={config.behavior.energy} 
              onChange={(v: number) => updateBehavior('energy', v)}
              min="0" max="1" step="0.01"
              displayValue={`${Math.round(config.behavior.energy * 100)}%`}
           />
           <SliderRow 
              label="大小" 
              value={config.behavior.scale} 
              onChange={(v: number) => updateBehavior('scale', v)}
              min="0.5" max="2" step="0.1"
              displayValue={`x${config.behavior.scale}`}
           />
        </div>

      </div>

      {/* Action Buttons */}
      <div className="fish-sidebar-actions">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="fish-sidebar-action-btn fish-sidebar-save-btn"
        >
          {isSaving ? '保存中...' : '确定'}
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="fish-sidebar-action-btn fish-sidebar-reset-btn"
        >
          {isLoading ? '加载中...' : '取消'}
        </button>
      </div>

    </div>
  );
};

// 使用 React.memo 防止不必要的重渲染
export default React.memo(Sidebar, (prevProps, nextProps) => {
  // 只有当 config 真正改变时才重新渲染
  // 比较 colors 和 behavior 对象
  const colorsEqual = Object.keys(prevProps.config.colors).every(
    key => prevProps.config.colors[key as keyof typeof prevProps.config.colors] === 
           nextProps.config.colors[key as keyof typeof nextProps.config.colors]
  );
  const behaviorEqual = 
    prevProps.config.behavior.agility === nextProps.config.behavior.agility &&
    prevProps.config.behavior.energy === nextProps.config.behavior.energy &&
    prevProps.config.behavior.scale === nextProps.config.behavior.scale;
  
  return colorsEqual && behaviorEqual && 
         prevProps.minimizable === nextProps.minimizable;
});