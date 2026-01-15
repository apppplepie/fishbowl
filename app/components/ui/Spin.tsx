'use client';

import React from 'react';
import './ui.css';

export interface SpinProps {
  size?: 'small' | 'middle' | 'large';
  spinning?: boolean;
  delay?: number;
  tip?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// 空状态组件，带有延迟显示逻辑
export interface EmptyProps {
  icon?: string | React.ReactNode;
  title?: string;
  description?: string;
  delay?: number; // 延迟显示时间，默认500ms
  className?: string;
  style?: React.CSSProperties;
}

// 加载完成提示组件，带有延迟显示逻辑
export interface LoadEndProps {
  icon?: string | React.ReactNode;
  message?: string;
  delay?: number; // 延迟显示时间，默认300ms
  className?: string;
  style?: React.CSSProperties;
}

const Empty: React.FC<EmptyProps> = ({
  icon = '📭',
  title = '暂无数据',
  description = '请稍后再试',
  delay = 500,
  className = '',
  style,
}) => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div
      className={`ui-empty ${className}`}
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#999',
        ...style,
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {typeof icon === 'string' ? icon : icon}
      </div>
      <div style={{ fontSize: '16px', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '14px' }}>{description}</div>
    </div>
  );
};

const LoadEnd: React.FC<LoadEndProps> = ({
  message = '没了',
  delay = 500,
  className = '',
  style,
}) => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div
      className={`ui-load-end ${className}`}
      style={{
        textAlign: 'center',
        padding: '40px 0',
        color: '#999',
        fontSize: '14px',
        ...style,
      }}
    >
      <div style={{ marginBottom: '8px' }}>
      </div>
      <div>{message}</div>
    </div>
  );
};

const Spin: React.FC<SpinProps> = ({
  size = 'middle',
  spinning = true,
  delay = 500, // 默认延迟0.5秒显示，防止闪烁
  tip,
  children,
  className = '',
  style,
}) => {
  const [delayedSpinning, setDelayedSpinning] = React.useState(false);

  React.useEffect(() => {
    if (spinning && delay > 0) {
      const timer = setTimeout(() => {
        setDelayedSpinning(true);
      }, delay);
      return () => clearTimeout(timer);
    } else if (!spinning) {
      setDelayedSpinning(false);
    }
  }, [spinning, delay]);

  if (children && !delayedSpinning) {
    return <>{children}</>;
  }

  const spinClasses = [
    'ui-spin',
    `ui-spin-${size}`,
    className,
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'ui-spin-container',
    delayedSpinning && 'ui-spin-blur',
  ].filter(Boolean).join(' ');

  return (
    <div className="ui-spin-wrapper" style={style}>
      {delayedSpinning && (
        <div className={spinClasses}>
          <div className="ui-spin-icon" />
          {tip && <div className="ui-spin-tip">{tip}</div>}
        </div>
      )}
      {children && (
        <div className={containerClasses}>
          {children}
        </div>
      )}
    </div>
  );
};

export { Empty, LoadEnd };
export default Spin;
