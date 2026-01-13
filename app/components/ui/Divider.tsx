'use client';

import React from 'react';
import './ui.css';

export interface DividerProps {
  type?: 'horizontal' | 'vertical';
  orientation?: 'left' | 'right' | 'center';
  dashed?: boolean;
  plain?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Divider: React.FC<DividerProps> = ({
  type = 'horizontal',
  orientation = 'center',
  dashed = false,
  plain = false,
  children,
  className = '',
  style,
}) => {
  const dividerClasses = [
    'ui-divider',
    `ui-divider-${type}`,
    type === 'horizontal' && children && `ui-divider-with-text`,
    type === 'horizontal' && children && `ui-divider-with-text-${orientation}`,
    dashed && 'ui-divider-dashed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (type === 'vertical') {
    return <span className={dividerClasses} style={style} />;
  }

  return (
    <div className={dividerClasses} style={style}>
      {children && (
        <span className={`ui-divider-inner-text ${plain ? 'ui-divider-plain' : ''}`}>
          {children}
        </span>
      )}
    </div>
  );
};

export default Divider;

