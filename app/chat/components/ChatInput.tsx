import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
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
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="border-t border-slate-100 bg-white/80 backdrop-blur-md p-4 pb-6 sm:p-6 z-10 sticky bottom-0">
      <div className="max-w-4xl mx-auto relative">
        <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1.5 shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入框"
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-slate-800 placeholder:text-slate-400 resize-none py-2 pl-2 max-h-[120px] min-h-[32px] text-base leading-relaxed"
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
                ? "text-primary hover:text-primary/80 cursor-pointer"
                : "text-slate-400 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
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
  );
};
