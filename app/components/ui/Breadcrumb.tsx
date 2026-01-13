'use client';

import React from 'react';
import './ui.css';

export interface BreadcrumbItemProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  className?: string;
}

export interface BreadcrumbProps {
  items?: Array<{
    title: React.ReactNode;
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
  }>;
  separator?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  href,
  onClick,
  children,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
  };

  if (href) {
    return (
      <a href={href} className={`ui-breadcrumb-link ${className}`} onClick={handleClick}>
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <span className={`ui-breadcrumb-link ${className}`} onClick={handleClick}>
        {children}
      </span>
    );
  }

  return <span className={`ui-breadcrumb-item ${className}`}>{children}</span>;
};

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = '/',
  children,
  className = '',
  style,
}) => {
  const breadcrumbClasses = ['ui-breadcrumb', className].filter(Boolean).join(' ');

  // 如果提供了 items，使用 items 渲染
  if (items) {
    return (
      <nav className={breadcrumbClasses} style={style}>
        <ol className="ui-breadcrumb-list">
          {items.map((item, index) => (
            <li key={index} className="ui-breadcrumb-item-wrapper">
              {index > 0 && <span className="ui-breadcrumb-separator">{separator}</span>}
              <BreadcrumbItem href={item.href} onClick={item.onClick}>
                {item.title}
              </BreadcrumbItem>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // 否则使用 children（兼容 Ant Design 的用法）
  return (
    <nav className={breadcrumbClasses} style={style}>
      <ol className="ui-breadcrumb-list">{children}</ol>
    </nav>
  );
};

(Breadcrumb as any).Item = BreadcrumbItem;

export default Breadcrumb;

