import React, { useEffect, useRef } from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { Bot, User, RefreshCw, AlertCircle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  /** 当前登录用户头像（base64 或 data URL），未传则显示默认图标 */
  userAvatar?: string | null;
}

function avatarSrc(avatar: string): string {
  return avatar.startsWith("data:") ? avatar : `data:image/jpeg;base64,${avatar}`;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, userAvatar }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
           <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={32} className="text-slate-400" />
           </div>
           <p className="text-sm font-medium">开始对话</p>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex w-full ${message.role === Role.User ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`flex max-w-[90%] sm:max-w-[80%] gap-3 ${message.role === Role.User ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                message.role === Role.User
                  ? "bg-slate-200 text-slate-600"
                  : "bg-white border border-slate-200 text-primary shadow-sm"
              }`}
            >
              {message.role === Role.User ? (
                userAvatar?.trim() ? (
                  <img src={avatarSrc(userAvatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} />
                )
              ) : (
                <Bot size={16} />
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`px-4 py-3 rounded-2xl shadow-sm overflow-hidden min-w-0 text-black ${
                message.role === Role.User
                  ? "bg-slate-100 border border-slate-200 rounded-tr-none"
                  : "bg-white border border-slate-100 rounded-tl-none"
              } ${message.isError ? "bg-red-50 border-red-200 text-red-800" : ""}`}
            >
              {message.isError ? (
                 <div className="flex items-center gap-2">
                   <AlertCircle size={16} />
                   <span>{message.content}</span>
                 </div>
              ) : (
                <MarkdownRenderer 
                  content={message.content} 
                  className="prose-slate prose-p:text-black prose-headings:text-black prose-li:text-black"
                />
              )}
              
            </div>
          </div>
        </div>
      ))}

      {isLoading && !(messages.length > 0 && messages[messages.length - 1].role === Role.Model && messages[messages.length - 1].isStreaming) && (
        <div className="flex justify-start w-full">
           <div className="flex flex-row gap-3 max-w-[90%] sm:max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-primary shadow-sm flex items-center justify-center">
                 <Bot size={16} />
              </div>
              <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                 <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                 <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
              </div>
           </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};