'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { List, PlusCircle, Trash2 } from 'lucide-react';
import { useResponsive } from '@/app/hooks/useResponsive';
import './sidebar.css';

export interface ConversationListItem {
  id: number;
  name: string | null;
  summary: string | null;
  turn_count: number;
  updated_at: string;
}

export interface ChatSidebarProps {
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (e: React.MouseEvent, id: string) => void;
  visible?: boolean;
  expanded?: boolean;
  onClose?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  drawerSize?: number;
}

function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  visible = false,
  expanded = false,
  onClose,
  onExpandedChange,
  drawerSize = 280,
}: ChatSidebarProps) {
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (!isMobile) return;
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, visible]);

  const handleNewChat = () => {
    if (isMobile && onClose) onClose();
    onNewChat();
  };

  const handleSelect = (id: string) => {
    if (isMobile && onClose) onClose();
    onSelectConversation(id);
  };

  const renderContent = () => (
    <>
      <div className="unified-navigator-drawer-wrap" style={{ padding: '12px 0' }}>
        <div className="chat-sidebar-list">
          <div className="sidebar-tree">
            <button
              type="button"
              className={`sidebar-tree-node sidebar-tree-node-article${currentConversationId === null ? ' active' : ''}`}
              onClick={handleNewChat}
            >
              <span className="sidebar-tree-chevron-placeholder" />
              <span className="sidebar-tree-icon">
                <PlusCircle size={16} />
              </span>
              <span className="sidebar-tree-label">New chat</span>
            </button>
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`sidebar-tree-node sidebar-tree-node-article chat-sidebar-item${currentConversationId === String(c.id) ? ' active' : ''}`}
              >
                <span className="sidebar-tree-chevron-placeholder" />
                <span className="sidebar-tree-icon" style={{ opacity: 0 }} />
                <button
                  type="button"
                  className="sidebar-tree-label"
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: 0, font: 'inherit' }}
                  onClick={() => handleSelect(String(c.id))}
                >
                  {c.name || `Chat ${c.id}`}
                </button>
                <button
                  type="button"
                  className="chat-sidebar-delete"
                  onClick={(e) => onDeleteConversation(e, String(c.id))}
                  title="删除对话"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {conversations.length === 0 && (
            <p className="sidebar-empty" style={{ padding: '16px 12px', margin: 0, fontSize: 13 }}>
              No conversations yet.
            </p>
          )}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    const mobileDrawer = (
      <>
        {visible && (
          <div
            className="sidebar-backdrop"
            role="button"
            tabIndex={0}
            aria-label="关闭"
            onClick={onClose || (() => {})}
            onKeyDown={(e) => e.key === 'Escape' && (onClose || (() => {}))()}
          />
        )}
        <div
          className={`sidebar-drawer ${visible ? 'sidebar-drawer-open' : ''}`}
          style={{ width: drawerSize }}
        >
          {renderContent()}
        </div>
      </>
    );
    return typeof document !== 'undefined'
      ? createPortal(mobileDrawer, document.body)
      : mobileDrawer;
  }

  const desktopSidebar = (
    <div
      className={`unified-navigator-sidebar${expanded ? ' is-expanded' : ''}`}
    >
      {expanded && (
        <div className="unified-navigator-sidebar-inner">
          {renderContent()}
        </div>
      )}
    </div>
  );
  return typeof document !== 'undefined'
    ? createPortal(desktopSidebar, document.body)
    : desktopSidebar;
}

export function ChatSidebarButton({
  onClick,
  onToggle,
}: {
  onClick?: () => void;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const { isMobile } = useResponsive();

  return (
    <button
      type="button"
      className="unified-navigator-btn"
      aria-label={isMobile ? '打开菜单' : '切换侧边栏'}
      onClick={isMobile ? (onClick ?? (() => {})) : (onToggle ?? (() => {}))}
    >
      <List size={20} />
    </button>
  );
}

export default React.memo(ChatSidebar);
