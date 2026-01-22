'use client';

import React, { forwardRef } from 'react';
import './ui.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  size?: 'small' | 'middle' | 'large';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  allowClear?: boolean;
  onClear?: () => void;
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
      onPressEnter,
      onKeyDown,
      ...restProps
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onPressEnter) {
        onPressEnter(e);
      }
      onKeyDown?.(e);
    };
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

    // 从 restProps 中排除 onPressEnter，因为它不是原生 input 的属性
    const inputProps = { ...restProps };
    delete (inputProps as any).onPressEnter;

    return (
      <span className={inputClasses} style={style}>
        {prefix && <span className="ui-input-prefix">{prefix}</span>}
        <input
          ref={ref}
          className="ui-input-inner"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          {...inputProps}
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

// Search Input
export interface SearchProps extends Omit<InputProps, 'type'> {
  enterButton?: React.ReactNode | boolean;
  loading?: boolean;
  onSearch?: (value: string, event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLInputElement>) => void;
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Search = forwardRef<HTMLInputElement, SearchProps>(
  ({ enterButton = false, loading = false, onSearch, onPressEnter, ...props }, ref) => {
    const [searchValue, setSearchValue] = React.useState(String(props.value || ''));

    React.useEffect(() => {
      if (props.value !== undefined) {
        setSearchValue(String(props.value));
      }
    }, [props.value]);

    const handleSearch = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLInputElement>) => {
      if (onSearch) {
        onSearch(searchValue, e);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch(e);
      }
      if (onPressEnter) {
        onPressEnter(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const renderEnterButton = () => {
      if (!enterButton) return null;

      const buttonContent = loading ? (
        <span className="ui-input-search-loading">
          <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
            <path d="M512 1024c-69.1 0-136.2-13.5-199.3-40.2C251.7 958 197 921.6 151.2 873c-15.5-16.5-30.4-33.9-44.3-52.4-41.2-55-70.9-118.5-87.7-186.7C6.3 631.2 0 574.1 0 512s6.3-119.2 19.2-181.9c16.8-68.2 46.5-131.7 87.7-186.7 13.9-18.5 28.8-35.9 44.3-52.4C197 42.4 251.7 6 308.7 1.2 371.8-25.5 438.9-39 508-39c69.1 0 136.2 13.5 199.3 40.2 57 8.8 111.7 45.2 157.5 93.8 15.5 16.5 30.4 33.9 44.3 52.4 41.2 55 70.9 118.5 87.7 186.7C1017.7 392.8 1024 449.9 1024 512s-6.3 119.2-19.2 181.9c-16.8 68.2-46.5 131.7-87.7 186.7-13.9 18.5-28.8 35.9-44.3 52.4C825 981.6 770.3 1018 713.3 1022.8 650.2 1049.5 583.1 1063 514 1063zM512 85c-56.6 0-112.1 11.2-164.7 33.2-50.5 21.1-96.4 51.4-135.7 89.7-13.2 13-25.4 26.9-36.4 41.5-32.8 43.7-56.8 94.8-70.8 149.5C90.6 436.8 85 473.9 85 512s5.6 75.2 14.4 111.1c14 54.7 38 105.8 70.8 149.5 11 14.6 23.2 28.5 36.4 41.5 39.3 38.3 85.2 68.6 135.7 89.7C399.9 925.8 455.4 937 512 937c56.6 0 112.1-11.2 164.7-33.2 50.5-21.1 96.4-51.4 135.7-89.7 13.2-13 25.4-26.9 36.4-41.5 32.8-43.7 56.8-94.8 70.8-149.5C933.4 587.2 939 550.1 939 512s-5.6-75.2-14.4-111.1c-14-54.7-38-105.8-70.8-149.5-11-14.6-23.2-28.5-36.4-41.5-39.3-38.3-85.2-68.6-135.7-89.7C624.1 96.2 568.6 85 512 85z"/>
          </svg>
        </span>
      ) : enterButton === true ? (
        <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
          <path d="M909.6 854.5L649.9 594.8c-6.3-6.3-14.7-9.8-23.6-9.8s-17.3 3.5-23.6 9.8L114.4 854.5c-8.2 8.2-12.8 19.1-12.8 30.7 0 11.6 4.6 22.5 12.8 30.7 8.2 8.2 19.1 12.8 30.7 12.8h726.6c11.6 0 22.5-4.6 30.7-12.8 8.2-8.2 12.8-19.1 12.8-30.7 0-11.6-4.6-22.5-12.8-30.7zM512 640c70.7 0 133.8-25.9 184.9-77.1 51.2-51.2 77.1-114.3 77.1-184.9S748.1 193.1 696.9 144C645.8 92.9 582.7 67 512 67s-133.8 25.9-184.9 77.1C275.9 194.1 250 257.2 250 328c0 70.7 25.9 133.8 77.1 184.9C378.2 614.1 441.3 640 512 640z"/>
        </svg>
      ) : (
        enterButton
      );

      return (
        <span className="ui-input-search-button" onClick={handleSearch}>
          {buttonContent}
        </span>
      );
    };

    return (
      <span className="ui-input-search">
        <Input
          ref={ref}
          {...props}
          value={searchValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          suffix={renderEnterButton()}
        />
      </span>
    );
  }
);

Search.displayName = 'Input.Search';

// 定义复合组件接口
interface InputComponent extends React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>> {
  Password: typeof Password;
  TextArea: typeof TextArea;
  Search: typeof Search;
}

// 将 Password、TextArea 和 Search 附加到 Input
(Input as any).Password = Password;
(Input as any).TextArea = TextArea;
(Input as any).Search = Search;

const InputWithComponents = Input as InputComponent;

export default InputWithComponents;

