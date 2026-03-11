'use client';

import React, { useRef } from 'react';

export interface TransparentSearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

/**
 * 自定义透明搜索框：半透明白底 + 加粗黑字，与标签搜索框统一。
 * 不依赖 antd，避免被其样式覆盖。
 */
export default function TransparentSearchInput({
  value,
  onChange,
  placeholder = '搜索标题或摘要...',
  allowClear = true,
  className,
}: TransparentSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 40,
        paddingLeft: 12,
        paddingRight: 12,
        background: 'rgba(255, 255, 255, 0.3)',
        border: 'none',
        borderRadius: 8,
        boxShadow: 'none',
        outline: 'none',
        transition: 'background 0.2s',
      }}
      onFocus={(e) => {
        const el = e.currentTarget;
        if (el) el.style.background = 'rgba(255, 255, 255, 0.4)';
      }}
      onBlur={(e) => {
        const el = e.currentTarget;
        if (el) el.style.background = 'rgba(255, 255, 255, 0.3)';
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          height: 24,
          padding: '0 4px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 14,
          fontWeight: 600,
          color: '#000',
          lineHeight: '24px',
        }}
        className="transparent-search-input-inner"
      />
      {allowClear && value ? (
        <button
          type="button"
          aria-label="清除"
          onClick={() => {
            onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
            inputRef.current?.focus();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            marginLeft: 4,
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            color: 'rgba(0, 0, 0, 0.45)',
            fontSize: 14,
            cursor: 'pointer',
            lineHeight: 1,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
