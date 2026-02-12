'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { MessageList } from '@/app/chat/components/MessageList';
import { ChatInput } from '@/app/chat/components/ChatInput';
import {
  deepseekService,
  type ConversationListItem,
} from '@/app/chat/services/deepseekService';
import { Message, Role } from '@/app/chat/types';
import { Sparkles, Menu, X, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/app/chat/utils/cn';
import { useAuth } from '@/app/hooks/useAuth';

function App() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

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
    setIsSidebarOpen(false);
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

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    deepseekService.resetSession();
    setIsSidebarOpen(false);
  };

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
    [currentConversationId]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
             <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <Sparkles size={18} fill="currentColor" />
             </div>
             Chat
           </div>
           <button 
             onClick={() => setIsSidebarOpen(false)}
             className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
           >
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pl-2">
            History
          </div>
          <div className="space-y-1">
            <button
              onClick={handleNewChat}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-lg truncate transition-colors border",
                currentConversationId === null
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-100"
              )}
            >
              New chat
            </button>
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg border transition-colors",
                  currentConversationId === String(c.id)
                    ? "bg-primary/10 border-primary/20"
                    : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
              >
                <button
                  type="button"
                  onClick={() => loadConversation(String(c.id))}
                  className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate text-slate-700"
                >
                  {c.name || `Chat ${c.id}`}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(e, String(c.id))}
                  className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-r-lg transition-colors"
                  title="删除对话"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {conversations.length === 0 && (
            <p className="text-sm text-slate-400 pl-2 italic mt-2">No conversations yet.</p>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <PlusCircle size={16} />
            New chat
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-30 sticky top-0">
           <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
             >
               <Menu size={20} />
             </button>
             <h1 className="font-semibold text-slate-800">
DeepSeek
            </h1>
           </div>
           
           <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="New chat"
              >
                <PlusCircle size={20} />
              </button>
           </div>
        </header>

        {/* Messages */}
        <MessageList messages={messages} isLoading={isLoading} userAvatar={user?.avatar_base64} />

        {/* Input */}
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;
