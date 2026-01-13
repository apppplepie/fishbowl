'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { setConfirmModalState } from './Modal';

/**
 * ConfirmModalProvider - 为 Modal.confirm 提供状态管理
 * 需要在根组件中包裹，以便 Modal.confirm 可以正常工作
 */
export const ConfirmModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setConfirmModalState({ open, config, setOpen, setConfig });
    return () => {
      setConfirmModalState(null);
    };
  }, [open, config]);

  const handleOk = async () => {
    if (config?.onOk) {
      await config.onOk();
    }
  };

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel();
    }
    setOpen(false);
  };

  const okType = config?.okType || 'primary';
  const okButtonProps = {
    ...config?.okButtonProps,
    className: okType === 'danger' ? 'ui-button-danger' : '',
  };

  return (
    <>
      {children}
      {config && (
        <Modal
          open={open}
          title={
            config.icon ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {config.icon}
                {config.title}
              </div>
            ) : (
              config.title
            )
          }
          onOk={handleOk}
          onCancel={handleCancel}
          okText={config.okText || '确定'}
          cancelText={config.cancelText || '取消'}
          okButtonProps={okButtonProps}
          cancelButtonProps={config.cancelButtonProps}
        >
          {config.content}
        </Modal>
      )}
    </>
  );
};

