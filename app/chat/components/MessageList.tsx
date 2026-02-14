import React, { useEffect, useRef } from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { Bot, AlertCircle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageRow = React.memo(({ message }: { message: Message }) => (
  <div
    className={`flex w-full ${message.role === Role.User ? 'justify-end' : 'justify-start'}`}
  >
    <div className="max-w-[90%] sm:max-w-[80%]">
      <div
        className={`px-4 py-3 rounded-xl shadow-sm overflow-hidden min-w-0 text-black ${
          message.role === Role.User
            ? 'bg-slate-100 border border-slate-200 rounded-tr-none'
            : 'bg-white border border-slate-100 rounded-tl-none'
        } ${message.isError ? 'bg-red-50 border-red-200 text-red-800' : ''}`}
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
));
MessageRow.displayName = 'MessageRow';

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollRef = useRef(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    const isStreaming = !!last?.isStreaming;

    if (isStreaming) {
      // 流式时节流滚动，并用 auto 避免重复的 smooth 动画导致卡顿/发烫
      const now = Date.now();
      if (now - lastScrollRef.current >= 100) {
        if (scrollRafRef.current != null) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }
        lastScrollRef.current = now;
        scrollToBottom('auto');
      } else if (scrollRafRef.current == null) {
        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          lastScrollRef.current = Date.now();
          scrollToBottom('auto');
        });
      }
    } else {
      scrollToBottom('smooth');
    }

    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messages, isLoading]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-[100px] space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full pt-[300px] text-black">
           <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 bg-transparent">
              <Bot size={32} className="text-black" />
           </div>
           <p className="text-sm font-medium">开始对话</p>
        </div>
      )}

      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}

      {isLoading && !(messages.length > 0 && messages[messages.length - 1].role === Role.Model && messages[messages.length - 1].isStreaming) && (
        <div className="flex justify-start w-full">
          <div className="max-w-[90%] sm:max-w-[80%] px-4 py-3 bg-white border border-slate-100 rounded-xl rounded-tl-none shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
