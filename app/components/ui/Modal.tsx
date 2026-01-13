'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ui.css';

export interface ModalProps {
  open?: boolean;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode | null;
  onCancel?: () => void;
  onOk?: () => void;
  centered?: boolean;
  width?: number | string;
  maskClosable?: boolean;
  closable?: boolean;
  destroyOnClose?: boolean;
  getContainer?: HTMLElement | (() => HTMLElement) | false;
  styles?: {
    body?: React.CSSProperties;
    mask?: React.CSSProperties;
  };
  className?: string;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const Modal: React.FC<ModalProps> = ({
  open = false,
  title,
  children,
  footer,
  onCancel,
  onOk,
  centered = false,
  width = 520,
  maskClosable = true,
  closable = true,
  destroyOnClose = false,
  getContainer,
  styles = {},
  className = '',
  okText = '确定',
  cancelText = '取消',
  okButtonProps,
  cancelButtonProps,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleMaskClick = (e: React.MouseEvent) => {
    if (maskClosable && e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const getContainerElement = (): HTMLElement => {
    if (getContainer === false) {
      return document.body;
    }
    if (typeof getContainer === 'function') {
      return getContainer();
    }
    if (getContainer instanceof HTMLElement) {
      return getContainer;
    }
    return document.body;
  };

  if (!mounted || (!open && destroyOnClose)) {
    return null;
  }

  const defaultFooter = (
    <>
      <button
        className="ui-button ui-button-default"
        onClick={handleClose}
        {...cancelButtonProps}
      >
        {cancelText}
      </button>
      <button
        className="ui-button ui-button-primary"
        onClick={onOk}
        {...okButtonProps}
      >
        {okText}
      </button>
    </>
  );

  const modalContent = open ? (
    <div
      className={`ui-modal-mask ${className}`}
      style={styles.mask}
      onClick={handleMaskClick}
    >
      <div
        className={`ui-modal-wrap ${centered ? 'ui-modal-centered' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="ui-modal"
          style={{ width: typeof width === 'number' ? `${width}px` : width }}
          ref={containerRef}
        >
          {closable && (
            <button className="ui-modal-close" onClick={handleClose}>
              <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
                <path d="M563.8 512l262.5-262.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L518.5 466.7 256 204.2c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L471.2 512 210.7 772.5c-12.5 12.5-12.5 32.8 0 45.3 6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4L518.5 557.3 781 819.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.3L563.8 512z" />
              </svg>
            </button>
          )}
          {title && <div className="ui-modal-header">{title}</div>}
          <div className="ui-modal-body" style={styles.body}>
            {children}
          </div>
          {footer !== null && (
            <div className="ui-modal-footer">
              {footer === undefined ? defaultFooter : footer}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const container = getContainerElement();
  return createPortal(modalContent, container);
};

// Modal.confirm 静态方法
// 使用状态管理来显示确认对话框
let confirmModalState: {
  open: boolean;
  config: any;
  setOpen: (open: boolean) => void;
  setConfig: (config: any) => void;
} | null = null;

export const setConfirmModalState = (state: typeof confirmModalState) => {
  confirmModalState = state;
};

// 定义一个静态 confirm 方法
// @ts-ignore
(Modal as any).confirm = (config: {
  title?: React.ReactNode;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'default' | 'dashed' | 'text' | 'link' | 'danger';
  okButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) => {
  if (!confirmModalState) {
    console.warn('Modal.confirm requires ConfirmModalProvider to be mounted');
    return {
      destroy: () => {},
      update: () => {},
    };
  }

  const handleOk = async () => {
    if (config.onOk) {
      await config.onOk();
    }
    confirmModalState!.setOpen(false);
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    confirmModalState!.setOpen(false);
  };

  confirmModalState.setConfig({
    ...config,
    onOk: handleOk,
    onCancel: handleCancel,
  });
  confirmModalState.setOpen(true);

  return {
    destroy: () => {
      confirmModalState!.setOpen(false);
    },
    update: (newConfig: any) => {
      confirmModalState!.setConfig({ ...config, ...newConfig });
    },
  };
};

const ModalWithConfirm = Modal as typeof Modal & {
  confirm: (config: {
    title?: React.ReactNode;
    content?: React.ReactNode;
    icon?: React.ReactNode;
    onOk?: () => void | Promise<void>;
    onCancel?: () => void;
    okText?: string;
    cancelText?: string;
    okType?: 'primary' | 'default' | 'dashed' | 'text' | 'link' | 'danger';
    okButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  }) => {
    destroy: () => void;
    update: (config: any) => void;
  };
};

export default ModalWithConfirm;

