'use client';

import React from 'react';
import './ui.css';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      defaultChecked,
      disabled = false,
      indeterminate = false,
      onChange,
      children,
      className = '',
      style,
      ...restProps
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false);
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalChecked(e.target.checked);
      }
      onChange?.(e);
    };

    return (
      <label
        className={`ui-checkbox-wrapper ${disabled ? 'ui-checkbox-disabled' : ''} ${className}`}
        style={style}
      >
        <span className={`ui-checkbox ${isChecked ? 'ui-checkbox-checked' : ''} ${indeterminate ? 'ui-checkbox-indeterminate' : ''}`}>
          <input
            ref={ref}
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            onChange={handleChange}
            className="ui-checkbox-input"
            {...restProps}
          />
          <span className="ui-checkbox-inner" />
        </span>
        {children && <span className="ui-checkbox-label">{children}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
