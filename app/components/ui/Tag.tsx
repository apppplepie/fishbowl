'use client';

import React from 'react';
import './ui.css';

export interface TagProps {
  color?: string;
  closable?: boolean;
  onClose?: (e?: React.MouseEvent) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Tag: React.FC<TagProps> = ({
  color,
  closable = false,
  onClose,
  children,
  className = '',
  style,
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose(e);
    }
  };

  const tagClasses = ['ui-tag', color && `ui-tag-${color}`, className]
    .filter(Boolean)
    .join(' ');

  const tagStyle: React.CSSProperties = {
    ...style,
    ...(color && !color.startsWith('#') && !color.startsWith('rgb')
      ? {}
      : { backgroundColor: color, borderColor: color, color: '#fff' }),
  };

  return (
    <span className={tagClasses} style={tagStyle}>
      <span className="ui-tag-text">{children}</span>
      {closable && (
        <span className="ui-tag-close" onClick={handleClose}>
          <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
            <path d="M563.8 512l262.5-262.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L518.5 466.7 256 204.2c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L471.2 512 210.7 772.5c-12.5 12.5-12.5 32.8 0 45.3 6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4L518.5 557.3 781 819.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.3L563.8 512z" />
          </svg>
        </span>
      )}
    </span>
  );
};

export default Tag;

