'use client';

import React, { useState, useRef, useEffect } from 'react';
import './ui.css';

export interface TooltipProps {
  title: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip: React.FC<TooltipProps> = ({
  title,
  placement = 'top',
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    setPosition({ top, left });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [open, placement]);

  const handleMouseEnter = () => {
    if (!isControlled) {
      setInternalOpen(true);
    }
    onOpenChange?.(true);
  };

  const handleMouseLeave = () => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };

  const trigger = React.cloneElement(children as React.ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = (children as any).ref;
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && typeof childRef === 'object' && 'current' in childRef) {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      const props = (children as React.ReactElement<any>).props;
      if (props && typeof props.onMouseEnter === 'function') {
        props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      const props = (children as React.ReactElement<any>).props;
      if (props && typeof props.onMouseLeave === 'function') {
        props.onMouseLeave(e);
      }
    },
  });

  if (!title) {
    return children;
  }

  return (
    <>
      {trigger}
      {open && (
        <div
          ref={tooltipRef}
          className={`ui-tooltip ui-tooltip-${placement}`}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div className="ui-tooltip-inner">{title}</div>
        </div>
      )}
    </>
  );
};

export default Tooltip;
