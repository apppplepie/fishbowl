import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  /** 侧边栏展开时的左边距（用于 fixed 与内容区对齐） */
  leftOffset?: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, leftOffset = 0 }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const text = input.trim().slice(0, 3000);
    if (text && !isLoading) {
      onSend(text);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div
      className="bg-black fixed z-10"
      style={{
        position: 'fixed',  // 只需要写一次
        bottom: 0,
        left: 0,           // 左边从0开始，覆盖整个屏幕宽
        right: 0,
      }}
    >
      {/* 内容区域 - 通过内边距来适配侧边栏 */}
      <div 
        className="p-4 pb-6 sm:p-6"
        style={{
          marginLeft: leftOffset,  // 用 margin 而不是 left
        }}
      >
        <div className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 shadow-lg">
            <style dangerouslySetInnerHTML={{ __html: `
              .chat-input-textarea::-webkit-scrollbar { display: none; }
              .chat-input-textarea { scrollbar-width: none; -ms-overflow-style: none; }
            ` }} />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 3000))}
              onKeyDown={handleKeyDown}
              placeholder="输入框（3000 字以内）"
              maxLength={3000}
              className="chat-input-textarea w-full bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 placeholder:text-slate-500 resize-none py-2 pl-2 max-h-[120px] min-h-[32px] text-base leading-relaxed overflow-y-auto"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-transparent transition-colors",
                input.trim() && !isLoading
                  ? "text-slate-900 hover:text-slate-700 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
              )}
            </button>
          </div>
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 transition-opacity duration-300 pointer-events-none">
            {/* Optional helper hint if needed in future */}
          </div>
        </div>
      </div>
    </div>
  );
};
