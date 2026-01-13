'use client';

import React, { useState, useEffect } from 'react';
import './ui.css';

export interface FloatButtonProps {
  icon?: React.ReactNode;
  type?: 'default' | 'primary';
  tooltip?: string | { title: string; placement?: 'left' | 'right' | 'top' | 'bottom' };
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  badge?: React.ReactNode;
}

const FloatButton: React.FC<FloatButtonProps> = ({
  icon,
  type = 'default',
  tooltip,
  onClick,
  style,
  className = '',
  children,
  badge,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipText = typeof tooltip === 'string' ? tooltip : tooltip?.title;
  const tooltipPlacement = typeof tooltip === 'object' ? tooltip.placement || 'left' : 'left';

  const buttonClasses = [
    'ui-float-button',
    `ui-float-button-${type}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const buttonStyle: React.CSSProperties = {
    ...style,
  };

  return (
    <div
      className={buttonClasses}
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={() => tooltipText && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {badge && <span className="ui-float-button-badge">{badge}</span>}
      {icon || children}
      {showTooltip && tooltipText && (
        <div className={`ui-float-button-tooltip ui-float-button-tooltip-${tooltipPlacement}`}>
          {tooltipText}
        </div>
      )}
    </div>
  );
};

// FloatButton.Group
export interface FloatButtonGroupProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: React.ReactNode;
  trigger?: 'click' | 'hover';
  type?: 'default' | 'primary';
  tooltip?: string | { title: string; placement?: 'left' | 'right' | 'top' | 'bottom' };
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

const FloatButtonGroup: React.FC<FloatButtonGroupProps> = ({
  open: controlledOpen,
  onOpenChange,
  icon,
  trigger = 'click',
  type = 'primary',
  tooltip,
  style,
  className = '',
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const newOpen = !open;
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      if (isControlled) {
        onOpenChange?.(true);
      } else {
        setInternalOpen(true);
      }
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      if (isControlled) {
        onOpenChange?.(false);
      } else {
        setInternalOpen(false);
      }
    }
  };

  const groupClasses = [
    'ui-float-button-group',
    open && 'ui-float-button-group-open',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const groupStyle: React.CSSProperties = {
    ...style,
    ...(style?.insetInlineEnd !== undefined && {
      right: style.insetInlineEnd,
      insetInlineEnd: undefined,
    }),
  };

  return (
    <div
      className={groupClasses}
      style={groupStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FloatButton
        icon={icon}
        type={type}
        tooltip={tooltip}
        onClick={trigger === 'click' ? handleToggle : undefined}
      />
      <div className="ui-float-button-group-actions">
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return (
              <div
                key={index}
                className="ui-float-button-group-item"
                style={{
                  transitionDelay: `${index * 30}ms`,
                }}
              >
                {child}
              </div>
            );
          }
          return child;
        })}
      </div>
    </div>
  );
};

// FloatButton.BackTop
export interface FloatButtonBackTopProps {
  visibilityHeight?: number;
  onClick?: () => void;
  tooltip?: string | { title: string; placement?: 'left' | 'right' | 'top' | 'bottom' };
  style?: React.CSSProperties;
  className?: string;
}

const FloatButtonBackTop: React.FC<FloatButtonBackTopProps> = ({
  visibilityHeight = 400,
  onClick,
  tooltip = '返回顶部',
  style,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setVisible(scrollTop > visibilityHeight);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [visibilityHeight]);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    onClick?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <FloatButton
      icon={
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      }
      type="primary"
      tooltip={tooltip}
      onClick={handleClick}
      style={style}
      className={className}
    />
  );
};

// 将 Group 和 BackTop 附加到 FloatButton
const FloatButtonWithGroup = FloatButton as typeof FloatButton & {
  Group: typeof FloatButtonGroup;
  BackTop: typeof FloatButtonBackTop;
};

(FloatButtonWithGroup as any).Group = FloatButtonGroup;
(FloatButtonWithGroup as any).BackTop = FloatButtonBackTop;

export default FloatButtonWithGroup;

