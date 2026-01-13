'use client';

import React from 'react';
import './ui.css';

export interface SkeletonProps {
  active?: boolean;
  loading?: boolean;
  title?: boolean | { width?: number | string };
  paragraph?: boolean | { rows?: number; width?: number | string | Array<number | string> };
  avatar?: boolean | { size?: 'large' | 'small' | 'default'; shape?: 'circle' | 'square' };
  round?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  active = false,
  loading = true,
  title = true,
  paragraph = true,
  avatar = false,
  round = false,
  children,
  className = '',
  style,
}) => {
  if (!loading && children) {
    return <>{children}</>;
  }

  const skeletonClasses = [
    'ui-skeleton',
    active && 'ui-skeleton-active',
    round && 'ui-skeleton-round',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderTitle = () => {
    if (!title) return null;
    const width = typeof title === 'object' ? title.width : undefined;
    return (
      <div
        className="ui-skeleton-title"
        style={width ? { width: typeof width === 'number' ? `${width}px` : width } : {}}
      />
    );
  };

  const renderParagraph = () => {
    if (!paragraph) return null;
    const config = typeof paragraph === 'object' ? paragraph : {};
    const rows = config.rows || 3;
    const widths = Array.isArray(config.width)
      ? config.width
      : config.width
        ? [config.width]
        : undefined;

    return (
      <div className="ui-skeleton-paragraph">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="ui-skeleton-paragraph-line"
            style={
              widths && widths[index]
                ? {
                    width:
                      typeof widths[index] === 'number'
                        ? `${widths[index]}px`
                        : widths[index],
                  }
                : {}
            }
          />
        ))}
      </div>
    );
  };

  const renderAvatar = () => {
    if (!avatar) return null;
    const config = typeof avatar === 'object' ? avatar : {};
    const size = config.size || 'default';
    const shape = config.shape || 'circle';

    return (
      <div
        className={`ui-skeleton-avatar ui-skeleton-avatar-${size} ui-skeleton-avatar-${shape}`}
      />
    );
  };

  return (
    <div className={skeletonClasses} style={style}>
      {renderAvatar()}
      <div className="ui-skeleton-content">
        {renderTitle()}
        {renderParagraph()}
      </div>
    </div>
  );
};

// Skeleton.Button
export interface SkeletonButtonProps {
  active?: boolean;
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  active = false,
  size = 'middle',
  block = false,
  className = '',
  style,
}) => {
  const buttonClasses = [
    'ui-skeleton-button',
    `ui-skeleton-button-${size}`,
    active && 'ui-skeleton-active',
    block && 'ui-skeleton-button-block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={buttonClasses} style={style} />;
};

const SkeletonWithButton = Skeleton as typeof Skeleton & {
  Button: typeof SkeletonButton;
};
(SkeletonWithButton as any).Button = SkeletonButton;

export default SkeletonWithButton;

