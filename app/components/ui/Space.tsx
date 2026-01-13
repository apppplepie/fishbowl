'use client';

import React from 'react';
import './ui.css';

export interface SpaceProps {
  size?: 'small' | 'middle' | 'large' | number;
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
  const getSize = () => {
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
    gap: split ? undefined : `${spaceSize}px`,
    alignItems: align,
  };

  const childrenArray = React.Children.toArray(children);

  if (split) {
    return (
      <div className={spaceClasses} style={spaceStyle}>
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="ui-space-split" style={{ margin: `0 ${spaceSize / 2}px` }}>
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

export default Space;

