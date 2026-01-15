import React from 'react';

export interface FakeGlassCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const FakeGlassCard: React.FC<FakeGlassCardProps> = ({
  children,
  className = '',
  interactive = false,
}) => {
  return (
    <div
      className={`
        relative
        bg-white/25
        border border-white/40
        shadow-[0_10px_30px_rgba(0,0,0,0.08)]
        rounded-3xl
        transition-all duration-300 ease-out
        ${interactive ? 'hover:bg-white/30 hover:shadow-[0_14px_40px_rgba(0,0,0,0.12)] cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* 顶部高光 */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl
        bg-gradient-to-b from-white/40 via-white/10 to-transparent" />

      {children}
    </div>
  );
};

