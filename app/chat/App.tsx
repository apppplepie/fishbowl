'use client';

import React, { useState, useCallback } from 'react';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { deepseekService } from './services/deepseekService';
import { Message, Role } from './types';
import { Sparkles, Trash2, Menu, X, PlusCircle } from 'lucide-react';
import { cn } from './utils/cn';
import { useAuth } from '@/app/hooks/useAuth';

function App() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const stream = await deepseekService.sendMessageStream(text);
      
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
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

    } catch (error) {
      console.error("Chat Error", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: Role.Model,
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearChat = () => {
    setMessages([]);
    deepseekService.resetSession();
    setIsSidebarOpen(false);
  };

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
          {messages.length > 0 ? (
             <div className="space-y-1">
                <button className="w-full text-left px-3 py-2 text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg truncate transition-colors border border-slate-100">
                  {messages[0].content}
                </button>
             </div>
          ) : (
            <p className="text-sm text-slate-400 pl-2 italic">No messages yet.</p>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
           <button 
             onClick={handleClearChat}
             className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
           >
             <Trash2 size={16} />
             Clear Conversation
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
                onClick={handleClearChat}
                className="lg:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear Chat"
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
