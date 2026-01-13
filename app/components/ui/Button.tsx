'use client';

import React from 'react';
import './ui.css';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  size?: 'small' | 'middle' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
  danger?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      type = 'default',
      size = 'middle',
      loading = false,
      disabled = false,
      icon,
      block = false,
      danger = false,
      htmlType = 'button',
      className = '',
      style,
      children,
      onClick,
      ...restProps
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const buttonClasses = [
      'ui-button',
      `ui-button-${type}`,
      `ui-button-${size}`,
      loading && 'ui-button-loading',
      block && 'ui-button-block',
      danger && 'ui-button-danger',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={htmlType}
        className={buttonClasses}
        style={style}
        disabled={isDisabled}
        onClick={onClick}
        {...restProps}
      >
        {loading && (
          <span className="ui-button-loading-icon">
            <svg
              viewBox="0 0 1024 1024"
              width="1em"
              height="1em"
              fill="currentColor"
              style={{ animation: 'ui-spin 1s linear infinite' }}
            >
              <path d="M512 1024c-69.1 0-136.2-13.5-199.3-40.2C251.7 958 197 921 150 874c-47-47-84-101.7-109.8-162.7C13.5 648.2 0 581.1 0 512c0-19.9 16.1-36 36-36s36 16.1 36 36c0 59.4 11.6 117 34.6 171.3 22.2 52.4 54 99.5 95 140.5 41 41 88.1 72.8 140.5 95C396.1 904.4 453.6 916 513 916c59.4 0 117-11.6 171.3-34.6 52.4-22.2 99.5-54 140.5-95 41-41 72.8-88.1 95-140.5C942.4 629 954 571.4 954 512c0-59.4-11.6-117-34.6-171.3-22.2-52.4-54-99.5-95-140.5s-88.1-72.8-140.5-95C629 81.6 571.4 70 512 70c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.2C772.3 66 827 103 874 150c47 47 84 101.7 109.8 162.7 26.7 63.1 40.2 130.2 40.2 199.3s-13.5 136.2-40.2 199.3C958 772.3 921 827 874 874c-47 47-101.7 84-162.7 109.8C648.2 1010.5 581.1 1024 512 1024z" />
            </svg>
          </span>
        )}
        {icon && !loading && <span className="ui-button-icon">{icon}</span>}
        {children && <span className="ui-button-text">{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

