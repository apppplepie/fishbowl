'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './ui.css';

interface MessageConfig {
  top?: number;
  duration?: number;
  maxCount?: number;
}

interface MessageItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  content: string | React.ReactNode;
  duration?: number;
  key?: string;
}

let messageConfig: MessageConfig = {
  top: 24,
  duration: 3,
  maxCount: 3,
};

let messageList: MessageItem[] = [];
let listeners: Array<() => void> = [];

type MessageContent = 
  | string 
  | React.ReactNode 
  | { 
      content: string | React.ReactNode; 
      key?: string; 
      duration?: number;
    };

const notify = () => {
  listeners.forEach(listener => listener());
};

const addMessage = (item: MessageItem) => {
  // 如果有 key，先移除相同 key 的消息
  if (item.key) {
    messageList = messageList.filter(msg => msg.key !== item.key);
  }

  messageList.push(item);

  // 限制最大数量
  if (messageConfig.maxCount && messageList.length > messageConfig.maxCount) {
    messageList = messageList.slice(-messageConfig.maxCount);
  }

  notify();

  // 自动移除
  if (item.duration !== 0 && item.type !== 'loading') {
    const duration = item.duration ?? messageConfig.duration ?? 3;
    setTimeout(() => {
      removeMessage(item.id);
    }, duration * 1000);
  }
};

const removeMessage = (id: string) => {
  messageList = messageList.filter(msg => msg.id !== id);
  notify();
};

const MessageContainer: React.FC = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => {
      forceUpdate({});
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  if (messageList.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="ui-message-container"
      style={{
        top: `${messageConfig.top ?? 24}px`,
      }}
    >
      {messageList.map(msg => (
        <MessageItem key={msg.id} message={msg} onClose={() => removeMessage(msg.id)} />
      ))}
    </div>,
    document.body
  );
};

const MessageItem: React.FC<{ message: MessageItem; onClose: () => void }> = ({
  message,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 触发进入动画
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return (
          <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66.3 66.3L512 578.3l-99.1 99.1-66.3-66.3L445.7 512l-99.1-99.1 66.3-66.3L512 445.7l99.1-99.1 66.3 66.3L578.3 512l99.1 99.1z" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
            <path d="M512 64L64 896h896L512 64zm0-64c35.3 0 68.1 19.1 85.3 50.1l448 832c17.2 31 17.2 69.1 0 100.1-17.2 31-50 50.1-85.3 50.1H64c-35.3 0-68.1-19.1-85.3-50.1-17.2-31-17.2-69.1 0-100.1l448-832C443.9 19.1 476.7 0 512 0z" />
            <path d="M512 320c-17.7 0-32 14.3-32 32v256c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32zm0 384c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z" />
          </svg>
        );
      case 'info':
        return (
          <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 0 1 0-96 48.01 48.01 0 0 1 0 96z" />
          </svg>
        );
      case 'loading':
        return (
          <svg
            viewBox="0 0 1024 1024"
            width="16"
            height="16"
            fill="currentColor"
            style={{ animation: 'ui-spin 1s linear infinite' }}
          >
            <path d="M512 1024c-69.1 0-136.2-13.5-199.3-40.2C251.7 958 197 921 150 874c-47-47-84-101.7-109.8-162.7C13.5 648.2 0 581.1 0 512c0-19.9 16.1-36 36-36s36 16.1 36 36c0 59.4 11.6 117 34.6 171.3 22.2 52.4 54 99.5 95 140.5 41 41 88.1 72.8 140.5 95C396.1 904.4 453.6 916 513 916c59.4 0 117-11.6 171.3-34.6 52.4-22.2 99.5-54 140.5-95 41-41 72.8-88.1 95-140.5C942.4 629 954 571.4 954 512c0-59.4-11.6-117-34.6-171.3-22.2-52.4-54-99.5-95-140.5s-88.1-72.8-140.5-95C629 81.6 571.4 70 512 70c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.2C772.3 66 827 103 874 150c47 47 84 101.7 109.8 162.7 26.7 63.1 40.2 130.2 40.2 199.3s-13.5 136.2-40.2 199.3C958 772.3 921 827 874 874c-47 47-101.7 84-162.7 109.8C648.2 1010.5 581.1 1024 512 1024z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const messageClasses = [
    'ui-message',
    `ui-message-${message.type}`,
    visible && 'ui-message-visible',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={messageClasses}>
      <span className="ui-message-icon">{getIcon()}</span>
      <span className="ui-message-content">
        {typeof message.content === 'string' ? message.content : message.content}
      </span>
      {message.type !== 'loading' && (
        <button className="ui-message-close" onClick={handleClose}>
          <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
            <path d="M563.8 512l262.5-262.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L518.5 466.7 256 204.2c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L471.2 512 210.7 772.5c-12.5 12.5-12.5 32.8 0 45.3 6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4L518.5 557.3 781 819.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.3L563.8 512z" />
          </svg>
        </button>
      )}
    </div>
  );
};

// 初始化 Message 容器
let containerInitialized = false;
const initContainer = () => {
  if (typeof window !== 'undefined' && !containerInitialized) {
    containerInitialized = true;
    const container = document.createElement('div');
    container.id = 'ui-message-root';
    document.body.appendChild(container);
  }
};

if (typeof window !== 'undefined') {
  initContainer();
}

const showMessage = (
  type: 'success' | 'error' | 'warning' | 'info' | 'loading',
  content: MessageContent,
  duration?: number
): any => {
  let messageContent: string | React.ReactNode;
  let messageKey: string | undefined;
  let messageDuration: number | undefined = duration;

  if (typeof content === 'object' && content !== null && 'content' in content) {
    messageContent = content.content;
    messageKey = content.key;
    messageDuration = content.duration ?? duration;
  } else {
    messageContent = content;
  }

  const id = messageKey || `msg-${Date.now()}-${Math.random()}`;
  addMessage({
    id,
    type,
    content: messageContent,
    duration: messageDuration,
    key: messageKey,
  });

  if (type === 'loading') {
    return {
      success: (successContent: string | React.ReactNode | { content: string | React.ReactNode; key?: string }) => {
        removeMessage(id);
        if (typeof successContent === 'object' && successContent !== null && 'content' in successContent) {
          showMessage('success', successContent.content, successContent.key ? undefined : messageConfig.duration);
        } else {
          showMessage('success', successContent);
        }
      },
      error: (errorContent: string | React.ReactNode | { content: string | React.ReactNode; key?: string }) => {
        removeMessage(id);
        if (typeof errorContent === 'object' && errorContent !== null && 'content' in errorContent) {
          showMessage('error', errorContent.content, errorContent.key ? undefined : messageConfig.duration);
        } else {
          showMessage('error', errorContent);
        }
      },
    };
  }
};

export const message = {
  success: (content: MessageContent, duration?: number) => {
    showMessage('success', content, duration);
  },
  error: (content: MessageContent, duration?: number) => {
    showMessage('error', content, duration);
  },
  warning: (content: MessageContent, duration?: number) => {
    showMessage('warning', content, duration);
  },
  info: (content: MessageContent, duration?: number) => {
    showMessage('info', content, duration);
  },
  loading: (content: MessageContent, duration?: number): any => {
    return showMessage('loading', content, duration);
  },
  config: (config: MessageConfig) => {
    messageConfig = { ...messageConfig, ...config };
  },
  destroy: () => {
    messageList = [];
    notify();
  },
};

// 导出 MessageContainer 供在根组件中使用
export { MessageContainer };

