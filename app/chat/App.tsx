'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MessageList } from '@/app/chat/components/MessageList';
import { ChatInput } from '@/app/chat/components/ChatInput';
import {
  deepseekService,
  type ConversationListItem,
} from '@/app/chat/services/deepseekService';
import { Message, Role } from '@/app/chat/types';
import { useAuth } from '@/app/hooks/useAuth';
import { useHeader } from '@/app/contexts/HeaderContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';

const ChatSidebar = dynamic(
  () => import('@/app/components/sidebar/ChatSidebar').then((m) => m.default),
  { ssr: false }
);
const ChatSidebarButton = dynamic(
  () => import('@/app/components/sidebar/ChatSidebar').then((m) => m.ChatSidebarButton),
  { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

function App() {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const { setLeftContent } = useHeader();
  const { setConfig } = usePageShell();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    deepseekService.getConversations().then(setConversations).catch(console.error);
  }, [user]);

  const loadConversation = useCallback(async (id: string) => {
    const list = await deepseekService.getMessages(id);
    setMessages(
      list.map((m) => ({
        id: String(m.id),
        role: m.role === 'assistant' ? Role.Model : Role.User,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
      }))
    );
    setCurrentConversationId(id);
    setDrawerVisible(false);
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: Role.User,
        content: text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const { stream, conversationId } = await deepseekService.sendMessageStream(
          text,
          currentConversationId
        );
        if (conversationId) {
          setCurrentConversationId(conversationId);
          setConversations((prev) => {
            const has = prev.some((c) => String(c.id) === conversationId);
            if (has) return prev;
            return [{ id: Number(conversationId), name: null, summary: null, turn_count: 0, updated_at: new Date().toISOString() }, ...prev];
          });
        }

        const botMessageId = (Date.now() + 1).toString();
        const botMessage: Message = {
          id: botMessageId,
          role: Role.Model,
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };

        setMessages((prev) => [...prev, botMessage]);

        let accumulatedText = '';

        for await (const chunk of stream) {
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
          )
        );

        if (conversationId) {
          deepseekService.getConversations().then(setConversations).catch(console.error);
        }
      } catch (error) {
        console.error('Chat Error', error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: Role.Model,
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentConversationId]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    deepseekService.resetSession();
    setDrawerVisible(false);
  }, []);

  const handleDeleteConversation = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await deepseekService.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => String(c.id) !== id));
        if (currentConversationId === id) handleNewChat();
      } catch (err) {
        console.error(err);
      }
    },
    [currentConversationId, handleNewChat]
  );

  useEffect(() => {
    setLeftContent(
      <ChatSidebarButton
        onClick={() => setDrawerVisible(true)}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((p) => !p)}
      />
    );
    return () => setLeftContent(null);
  }, [setLeftContent, sidebarExpanded]);

  useEffect(() => {
    setConfig((prev: { sidebarExpanded?: boolean; sidebarWidth?: number }) => ({
      ...prev,
      sidebarExpanded: !isMobile ? sidebarExpanded : false,
      sidebarWidth: 280,
    }));
    return () =>
      setConfig((prev: { sidebarExpanded?: boolean; sidebarWidth?: number }) => ({
        ...prev,
        sidebarExpanded: false,
        sidebarWidth: 0,
      }));
  }, [setConfig, isMobile, sidebarExpanded]);

  return (
    <div
      className="flex flex-col overflow-hidden bg-transparent text-slate-900 font-sans"
      style={{ minHeight: 'calc(100vh - 45px)' }}
    >
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={loadConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        visible={drawerVisible}
        expanded={sidebarExpanded}
        onClose={() => setDrawerVisible(false)}
        onExpandedChange={setSidebarExpanded}
      />

      <main className="flex-1 flex flex-col min-h-0 w-full">
        <MessageList messages={messages} isLoading={isLoading} />
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          leftOffset={!isMobile && sidebarExpanded ? 280 : 0}
        />
      </main>
    </div>
  );
}

export default App;
