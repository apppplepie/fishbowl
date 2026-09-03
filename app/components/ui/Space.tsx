'use client';

import React from 'react';
import './ui.css';

export interface SpaceProps {
  size?: 'small' | 'middle' | 'large' | number | [number, number];
  direction?: 'horizontal' | 'vertical';
  align?: 'start' | 'end' | 'center' | 'baseline';
  wrap?: boolean;
  split?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Space: React.FC<SpaceProps> = ({
  size = 'small',
  direction = 'horizontal',
  align,
  wrap = false,
  split,
  children,
  className = '',
  style,
}) => {
  const getSize = (): number | [number, number] => {
    if (Array.isArray(size)) {
      return size;
    }
    if (typeof size === 'number') {
      return size;
    }
    switch (size) {
      case 'small':
        return 8;
      case 'middle':
        return 16;
      case 'large':
        return 24;
      default:
        return 8;
    }
  };

  const spaceSize = getSize();
  const [horizontalSize, verticalSize] = Array.isArray(spaceSize) ? spaceSize : [spaceSize, spaceSize];

  const spaceClasses = [
    'ui-space',
    `ui-space-${direction}`,
    wrap && 'ui-space-wrap',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const spaceStyle: React.CSSProperties = {
    ...style,
    gap: split ? undefined : Array.isArray(spaceSize) 
      ? `${verticalSize}px ${horizontalSize}px` 
      : `${spaceSize}px`,
    alignItems: align,
  };

  const childrenArray = React.Children.toArray(children);

  if (split) {
    return (
      <div className={spaceClasses} style={spaceStyle}>
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="ui-space-split" style={{ margin: `0 ${horizontalSize / 2}px` }}>
                {split}
              </span>
            )}
            <span className="ui-space-item">{child}</span>
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={spaceClasses} style={spaceStyle}>
      {childrenArray.map((child, index) => (
        <span key={index} className="ui-space-item">
          {child}
        </span>
      ))}
    </div>
  );
};

/**
 * Space.Compact - 紧凑排列容器（子元素紧贴、等高拉伸）
 */
const Compact: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style, className = '' }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'stretch', ...style }}>
    {children}
  </div>
);

export default Object.assign(Space, { Compact });

