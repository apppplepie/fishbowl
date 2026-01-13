'use client';

import React, { forwardRef } from 'react';
import './ui.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  size?: 'small' | 'middle' | 'large';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  allowClear?: boolean;
  onClear?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'middle',
      prefix,
      suffix,
      allowClear = false,
      onClear,
      className = '',
      style,
      value,
      onChange,
      ...restProps
    },
    ref
  ) => {
    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix || (allowClear && value);
    const showClear = allowClear && value && !restProps.disabled;

    const inputClasses = [
      'ui-input',
      `ui-input-${size}`,
      hasPrefix && 'ui-input-has-prefix',
      hasSuffix && 'ui-input-has-suffix',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <span className={inputClasses} style={style}>
        {prefix && <span className="ui-input-prefix">{prefix}</span>}
        <input
          ref={ref}
          className="ui-input-inner"
          value={value}
          onChange={onChange}
          {...restProps}
        />
        {hasSuffix && (
          <span className="ui-input-suffix">
            {showClear && (
              <span className="ui-input-clear" onClick={handleClear}>
                <svg
                  viewBox="0 0 1024 1024"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path d="M563.8 512l262.5-262.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L518.5 466.7 256 204.2c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L471.2 512 210.7 772.5c-12.5 12.5-12.5 32.8 0 45.3 6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4L518.5 557.3 781 819.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.3L563.8 512z" />
                </svg>
              </span>
            )}
            {suffix}
          </span>
        )}
      </span>
    );
  }
);

Input.displayName = 'Input';

// Password Input
export interface PasswordProps extends Omit<InputProps, 'type'> {
  visibilityToggle?: boolean;
}

const Password = forwardRef<HTMLInputElement, PasswordProps>(
  ({ visibilityToggle = true, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    const toggleVisibility = () => {
      setVisible(!visible);
    };

    const suffix = visibilityToggle ? (
      <span className="ui-input-password-toggle" onClick={toggleVisibility}>
        {visible ? (
          <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
            <path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 0 0 0 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z" />
          </svg>
        ) : (
          <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
            <path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 0 0 0 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z" />
            <path d="M508 624a48.01 48.01 0 0 0 48-48c0-26.5-21.5-48-48-48s-48 21.5-48 48 21.5 48 48 48zm0-272a176 176 0 0 1 176 176c0 97.2-78.8 176-176 176s-176-78.8-176-176c0-97.2 78.8-176 176-176zm448 176c0-97.2-78.8-176-176-176-97.2 0-176 78.8-176 176 0 97.2 78.8 176 176 176 97.2 0 176-78.8 176-176z" />
          </svg>
        )}
      </span>
    ) : undefined;

    return <Input ref={ref} type={visible ? 'text' : 'password'} suffix={suffix} {...props} />;
  }
);

Password.displayName = 'Input.Password';

// TextArea
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: 'small' | 'middle' | 'large';
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  showCount?: boolean;
  allowClear?: boolean;
  onClear?: () => void;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      size = 'middle',
      autoSize,
      showCount = false,
      allowClear = false,
      onClear,
      className = '',
      style,
      value,
      onChange,
      maxLength,
      ...restProps
    },
    ref
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (ref || textareaRef) as React.RefObject<HTMLTextAreaElement>;

    React.useEffect(() => {
      if (autoSize && combinedRef.current) {
        const textarea = combinedRef.current;
        textarea.style.height = 'auto';
        const minRows = typeof autoSize === 'object' ? autoSize.minRows || 1 : 1;
        const maxRows = typeof autoSize === 'object' ? autoSize.maxRows : undefined;
        const lineHeight = 22; // 估算行高
        const minHeight = minRows * lineHeight;
        const scrollHeight = textarea.scrollHeight;
        const newHeight = maxRows
          ? Math.min(scrollHeight, maxRows * lineHeight)
          : scrollHeight;
        textarea.style.height = `${Math.max(minHeight, newHeight)}px`;
      }
    }, [value, autoSize]);

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    };

    const currentLength = typeof value === 'string' ? value.length : 0;
    const showClearIcon = allowClear && value && !restProps.disabled;

    const textareaClasses = [
      'ui-textarea',
      `ui-textarea-${size}`,
      showCount && 'ui-textarea-show-count',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={textareaClasses} style={style}>
        <textarea
          ref={combinedRef}
          className="ui-textarea-inner"
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          {...restProps}
        />
        {(showClearIcon || showCount) && (
          <span className="ui-textarea-suffix">
            {showClearIcon && (
              <span className="ui-textarea-clear" onClick={handleClear}>
                <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                  <path d="M563.8 512l262.5-262.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L518.5 466.7 256 204.2c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L471.2 512 210.7 772.5c-12.5 12.5-12.5 32.8 0 45.3 6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4L518.5 557.3 781 819.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.3L563.8 512z" />
                </svg>
              </span>
            )}
            {showCount && (
              <span className="ui-textarea-count">
                {currentLength}
                {maxLength && ` / ${maxLength}`}
              </span>
            )}
          </span>
        )}
      </span>
    );
  }
);

TextArea.displayName = 'Input.TextArea';

// 将 Password 和 TextArea 附加到 Input
(Input as any).Password = Password;
(Input as any).TextArea = TextArea;

export default Input;

