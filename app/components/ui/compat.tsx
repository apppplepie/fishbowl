'use client';

import React, {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import BaseButton from './Button';
import type { ButtonProps as BaseButtonProps } from './Button';
import BaseInput from './Input';
import BaseModal from './Modal';
import BaseCheckbox from './Checkbox';
import BaseTooltip from './Tooltip';
import BaseDivider from './Divider';
import BaseSpace from './Space';
import BaseTag from './Tag';
import { message } from './message';

export { message };
export type UploadFile = {
  uid: string;
  name: string;
  status?: 'uploading' | 'done' | 'error' | 'removed';
  url?: string;
  thumbUrl?: string;
  originFileObj?: File;
  percent?: number;
  response?: any;
  [key: string]: any;
};
export type UploadProps = {
  fileList?: UploadFile[];
  onChange?: (info: { file?: UploadFile; fileList: UploadFile[]; event?: any }) => void;
  beforeUpload?: (file: File, fileList: File[]) => boolean | symbol | Promise<boolean | symbol>;
  customRequest?: (options: any) => void;
  [key: string]: any;
};
export type InputRef = HTMLInputElement;
export type GetRef<T> = T extends React.ForwardRefExoticComponent<React.RefAttributes<infer R>> ? R : any;

export type MenuItem = {
  key?: React.Key;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: (info: { key: string; domEvent: React.MouseEvent }) => void;
  children?: MenuItem[];
  type?: 'divider' | 'group';
};
export type MenuProps = {
  items?: MenuItem[];
  onClick?: (info: { key: string; domEvent: React.MouseEvent }) => void;
  [key: string]: any;
};

type CompatButtonProps = BaseButtonProps & { shape?: string; ghost?: boolean; [key: string]: any };
export const Button: React.FC<CompatButtonProps> = ({ children, shape: _shape, ghost: _ghost, ...props }) => (
  <BaseButton {...props}>{children}</BaseButton>
);
export const Input = BaseInput;
export const Modal: any = BaseModal;
export const Checkbox: any = BaseCheckbox;
export const Tooltip: any = BaseTooltip;
export const Divider: any = BaseDivider;
export const Tag: any = BaseTag;

const Compact: React.FC<any> = ({ children, style, className = '' }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'stretch', ...style }}>{children}</div>
);
export const Space: any = Object.assign(
  (props: any) => <BaseSpace {...props} />,
  { Compact },
);

type FormRule = {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (rule: FormRule, value: any) => void | Promise<void>;
  [key: string]: any;
};
type FormRuleFactory = (form: FormInstance<any>) => FormRule;
type FormValues = Record<string, any>;
export type FormInstance<T = any> = {
  getFieldsValue: () => T;
  getFieldValue: (name: string) => any;
  setFieldsValue: (values: Partial<T>) => void;
  setFieldValue: (name: string, value: any) => void;
  resetFields: () => void;
  validateFields: () => Promise<T>;
  submit: () => void;
  __subscribe: (listener: () => void) => () => void;
  __rules: Map<string, Array<FormRule | FormRuleFactory>>;
  __bind: (callbacks: { onFinish?: (values: T) => void; onFinishFailed?: (error: any) => void }) => void;
  __setInitial: (values: Partial<T>) => void;
};

function createFormInstance<T = any>(): FormInstance<T> {
  let values: FormValues = {};
  let initialValues: FormValues = {};
  let callbacks: { onFinish?: (values: T) => void; onFinishFailed?: (error: any) => void } = {};
  const listeners = new Set<() => void>();
  const rules = new Map<string, Array<FormRule | FormRuleFactory>>();
  const notify = () => listeners.forEach((listener) => listener());
  const instance: FormInstance<T> = {
    getFieldsValue: () => ({ ...values }) as T,
    getFieldValue: (name) => values[name],
    setFieldsValue: (next) => { values = { ...values, ...next }; notify(); },
    setFieldValue: (name, value) => { values = { ...values, [name]: value }; notify(); },
    resetFields: () => { values = { ...initialValues }; notify(); },
    validateFields: async () => {
      const errors: Array<{ name: string; errors: string[] }> = [];
      for (const [name, fieldRules] of rules) {
        const value = values[name];
        for (const item of fieldRules) {
          const rule = typeof item === 'function' ? item(instance) : item;
          try {
            const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
            if (rule.required && empty) throw new Error(rule.message || '此项为必填项');
            if (!empty && rule.min != null && String(value).length < rule.min) throw new Error(rule.message || `至少输入 ${rule.min} 个字符`);
            if (!empty && rule.max != null && String(value).length > rule.max) throw new Error(rule.message || `最多输入 ${rule.max} 个字符`);
            if (!empty && rule.pattern && !rule.pattern.test(String(value))) throw new Error(rule.message || '格式不正确');
            if (rule.validator) await rule.validator(rule, value);
          } catch (error) {
            errors.push({ name, errors: [error instanceof Error ? error.message : String(error)] });
            break;
          }
        }
      }
      if (errors.length) throw { errorFields: errors, values: { ...values } };
      return { ...values } as T;
    },
    submit: () => {
      instance.validateFields()
        .then((validValues) => callbacks.onFinish?.(validValues))
        .catch((error) => callbacks.onFinishFailed?.(error));
    },
    __subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    __rules: rules,
    __bind: (next) => { callbacks = next; },
    __setInitial: (next) => {
      initialValues = { ...initialValues, ...next };
      values = { ...next, ...values };
      notify();
    },
  };
  return instance;
}

const FormContext = createContext<FormInstance<any> | null>(null);

const FormRoot = <T,>({
  form,
  initialValues,
  onFinish,
  onFinishFailed,
  children,
  component,
  style,
  className,
}: any) => {
  const fallback = useMemo(() => createFormInstance<T>(), []);
  const instance = form || fallback;
  useEffect(() => instance.__bind({ onFinish, onFinishFailed }), [instance, onFinish, onFinishFailed]);
  useEffect(() => { if (initialValues) instance.__setInitial(initialValues); }, [instance, initialValues]);
  const content = <FormContext.Provider value={instance}>{children}</FormContext.Provider>;
  if (component === false) return content;
  return <form className={className} style={style} onSubmit={(event) => { event.preventDefault(); instance.submit(); }}>{content}</form>;
};

type FormItemProps = {
  name?: string;
  label?: React.ReactNode;
  rules?: Array<FormRule | FormRuleFactory>;
  valuePropName?: string;
  noStyle?: boolean;
  extra?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
};
const FormItem: React.FC<FormItemProps> = ({ name, label, rules = [], valuePropName = 'value', noStyle, extra, children, style, className = '' }) => {
  const form = useContext(FormContext);
  const [, rerender] = useState(0);
  useEffect(() => form?.__subscribe(() => rerender((value) => value + 1)), [form]);
  useEffect(() => {
    if (!form || name == null) return;
    form.__rules.set(String(name), rules);
    return () => { form.__rules.delete(String(name)); };
  }, [form, name, rules]);

  let control = children;
  if (form && name != null && isValidElement(children)) {
    const fieldName = String(name);
    const childProps = (children as React.ReactElement<any>).props;
    const eventName = valuePropName === 'checked' ? 'onChange' : 'onChange';
    const fieldValue = form.getFieldValue(fieldName);
    control = cloneElement(children as React.ReactElement<any>, {
      ...(fieldValue !== undefined ? { [valuePropName]: fieldValue } : {}),
      [eventName]: (...args: any[]) => {
        const first = args[0];
        const value = valuePropName === 'checked'
          ? (first?.target ? first.target.checked : first)
          : (first?.target ? first.target.value : first);
        form.setFieldValue(fieldName, value);
        childProps[eventName]?.(...args);
      },
    });
  }
  if (noStyle) return <>{control}</>;
  return (
    <div className={`lite-form-item ${className}`} style={{ marginBottom: 18, ...style }}>
      {label != null && <label style={{ display: 'block', marginBottom: 7, fontWeight: 600, fontSize: 14 }}>{label}</label>}
      {control}
      {extra && <div style={{ marginTop: 5, color: '#777', fontSize: 12 }}>{extra}</div>}
    </div>
  );
};

const useForm = <T = any,>(existing?: FormInstance<T>): [FormInstance<T>] => {
  const [form] = useState(() => existing || createFormInstance<T>());
  return [form];
};
const useWatch = (name: string, form?: FormInstance<any>) => {
  const contextForm = useContext(FormContext);
  const instance = form || contextForm;
  const [, rerender] = useState(0);
  useEffect(() => instance?.__subscribe(() => rerender((value) => value + 1)), [instance]);
  return instance?.getFieldValue(name);
};
type FormComponent = {
  <T = any>(props: any): React.ReactElement;
  Item: React.FC<FormItemProps>;
  useForm: typeof useForm;
  useWatch: typeof useWatch;
};
export const Form = Object.assign(FormRoot, { Item: FormItem, useForm, useWatch }) as FormComponent;

type OptionValue = string | number;
const SelectOption: React.FC<any> = () => null;
const collectOptions = (children: React.ReactNode, options: any[] = []) => {
  const result = [...options];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) result.push({ value: (child.props as any).value, label: (child.props as any).children });
  });
  return result;
};
export type SelectProps<T = any> = {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  options?: Array<{ label: React.ReactNode; value: T; disabled?: boolean }>;
  children?: React.ReactNode;
  [key: string]: any;
};
const SelectRoot = forwardRef<any, SelectProps<any>>(({ value, defaultValue, onChange, options = [], children, placeholder, allowClear, mode, style, className = '', disabled, onBlur, onFocus, ...rest }, ref) => {
  const choices = collectOptions(children, options);
  const multiple = mode === 'multiple' || mode === 'tags';
  const current = value ?? defaultValue ?? (multiple ? [] : '');
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(event.target.selectedOptions).map((item) => choices.find((choice) => String(choice.value) === item.value)?.value ?? item.value);
      onChange?.(selected);
    } else {
      const raw = event.target.value;
      onChange?.(choices.find((choice) => String(choice.value) === raw)?.value ?? raw);
    }
  };
  return (
    <select
      ref={ref}
      value={multiple ? (current || []).map(String) : String(current ?? '')}
      onChange={handleChange}
      multiple={multiple}
      disabled={disabled}
      onBlur={onBlur}
      onFocus={onFocus}
      className={`lite-select ${className}`}
      style={{ minHeight: 34, border: '1px solid rgba(0,0,0,.18)', borderRadius: 8, padding: '6px 10px', background: 'rgba(255,255,255,.82)', ...style }}
      {...rest}
    >
      {(placeholder || allowClear) && <option value="">{placeholder || '请选择'}</option>}
      {choices.map((option, index) => <option key={`${String(option.value)}-${index}`} value={String(option.value)}>{typeof option.label === 'string' || typeof option.label === 'number' ? option.label : String(option.value)}</option>)}
    </select>
  );
});
SelectRoot.displayName = 'Select';
export const Select: any = Object.assign(SelectRoot, { Option: SelectOption });

type SegmentedProps<T extends OptionValue> = { options?: any[]; value?: T; defaultValue?: T; onChange?: (value: T) => void; block?: boolean; style?: React.CSSProperties; className?: string; [key: string]: any };
export const Segmented = <T extends OptionValue>({ options = [], value, defaultValue, onChange, block, style, className = '' }: SegmentedProps<T>) => {
  const normalized = options.map((option: any) => typeof option === 'object' ? option : { label: option, value: option });
  const [internal, setInternal] = useState(defaultValue ?? normalized[0]?.value);
  const selected = value ?? internal;
  return <div className={className} style={{ display: 'flex', width: block ? '100%' : undefined, padding: 3, gap: 3, borderRadius: 9, background: 'rgba(0,0,0,.06)', ...style }}>
    {normalized.map((option: any) => <button key={String(option.value)} type="button" disabled={option.disabled} onClick={() => { setInternal(option.value); onChange?.(option.value as T); }} style={{ flex: block ? 1 : undefined, border: 0, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', background: selected === option.value ? '#fff' : 'transparent', boxShadow: selected === option.value ? '0 1px 4px rgba(0,0,0,.14)' : 'none' }}>{option.label}</button>)}
  </div>;
};

export const Dropdown: React.FC<any> = ({ children, menu, placement }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <div ref={ref} style={{ display: 'inline-block', position: 'relative' }}>
    <span onClick={() => setOpen((value) => !value)}>{children}</span>
    {open && <div style={{ position: 'absolute', zIndex: 1100, minWidth: 160, top: 'calc(100% + 6px)', ...(placement?.includes('Right') ? { right: 0 } : { left: 0 }), padding: 6, borderRadius: 9, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,.18)' }}>
      {(menu?.items || []).map((item: MenuItem, index: number) => item.type === 'divider' ? <hr key={index} /> : <button key={String(item.key ?? index)} type="button" disabled={item.disabled} onClick={(event) => { item.onClick?.({ key: String(item.key ?? index), domEvent: event }); menu?.onClick?.({ key: String(item.key ?? index), domEvent: event }); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, padding: '8px 10px', borderRadius: 6, background: 'transparent', color: item.danger ? '#d4380d' : 'inherit', cursor: 'pointer', textAlign: 'left' }}>{item.icon}{item.label}</button>)}
    </div>}
  </div>;
};

export const Menu: React.FC<MenuProps> = ({ items = [], onClick, mode = 'vertical', selectedKeys = [], style, className = '' }: MenuProps) => (
  <nav className={className} style={{ display: 'flex', flexDirection: mode === 'horizontal' ? 'row' : 'column', gap: 4, ...style }}>
    {items.map((item: MenuItem, index) => item.type === 'divider' ? <hr key={index} /> : <button key={String(item.key ?? index)} type="button" disabled={item.disabled} onClick={(event) => { const info = { key: String(item.key ?? index), domEvent: event }; item.onClick?.(info); onClick?.(info); }} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 0, borderRadius: 8, padding: '8px 10px', color: item.danger ? '#d4380d' : 'inherit', background: selectedKeys.includes(String(item.key)) ? 'rgba(22,119,255,.12)' : 'transparent', cursor: 'pointer' }}>{item.icon}{item.label}</button>)}
  </nav>
);

export const Drawer: React.FC<any> = ({ open, onClose, title, children, placement = 'right', width = 378, height = 'auto', styles = {}, bodyStyle, className = '', closable = true }) => {
  if (!open) return null;
  const vertical = placement === 'top' || placement === 'bottom';
  const panelStyle: React.CSSProperties = vertical
    ? { left: 0, right: 0, [placement]: 0, height }
    : { top: 0, bottom: 0, [placement]: 0, width };
  return <div className={className} style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.38)', ...styles.mask }} />
    <aside style={{ position: 'absolute', display: 'flex', flexDirection: 'column', maxWidth: '100vw', maxHeight: '100vh', background: '#fff', boxShadow: '0 0 30px rgba(0,0,0,.22)', ...panelStyle, ...styles.wrapper }}>
      {(title != null || closable) && <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.08)' }}><strong>{title}</strong>{closable && <button type="button" onClick={onClose} aria-label="关闭" style={{ border: 0, background: 'transparent', fontSize: 22 }}>×</button>}</header>}
      <div style={{ flex: 1, overflow: 'auto', padding: 18, ...bodyStyle, ...styles.body }}>{children}</div>
    </aside>
  </div>;
};

export const Avatar: React.FC<any> = ({ src, icon, children, size = 32, style, className = '' }) => (
  <span className={className} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e8e8e8', ...style }}>
    {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (icon || children)}
  </span>
);

export const Image: React.FC<React.ImgHTMLAttributes<HTMLImageElement> & { preview?: boolean; fallback?: string }> = ({ preview: _preview, fallback, onError, ...props }) => {
  const [failed, setFailed] = useState(false);
  return <img {...props} src={failed && fallback ? fallback : props.src} onError={(event) => { setFailed(true); onError?.(event); }} />;
};

export const Alert: React.FC<any> = ({ message: title, title: titleProp, description, type = 'info', showIcon, icon, style, className = '' }) => (
  <div role="alert" className={className} style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', background: type === 'error' ? '#fff2f0' : type === 'warning' ? '#fffbe6' : '#e6f4ff', ...style }}>
    <div style={{ display: 'flex', gap: 8, fontWeight: 600 }}>{showIcon && (icon || 'ⓘ')}{title ?? titleProp}</div>
    {description && <div style={{ marginTop: 5, opacity: .8 }}>{description}</div>}
  </div>
);

const TypographyTitle: React.FC<any> = ({ level = 1, children, ...props }) => React.createElement(`h${Math.min(6, Math.max(1, level))}`, props, children);
const TypographyText: React.FC<any> = ({ children, type, strong, ...props }) => React.createElement(strong ? 'strong' : 'span', { ...props, style: { color: type === 'secondary' ? '#777' : undefined, ...props.style } }, children);
const TypographyParagraph: React.FC<any> = ({ children, ...props }) => <p {...props}>{children}</p>;
export const Typography: any = { Title: TypographyTitle, Text: TypographyText, Paragraph: TypographyParagraph };

type CompatCardProps = React.HTMLAttributes<HTMLElement> & { title?: React.ReactNode; extra?: React.ReactNode; cover?: React.ReactNode; bodyStyle?: React.CSSProperties; styles?: Record<string, React.CSSProperties>; hoverable?: boolean; bordered?: boolean; size?: 'small' | 'default' };
export const Card: React.FC<CompatCardProps> = ({ children, title, extra, cover, bodyStyle, styles = {}, hoverable, bordered: _bordered, size: _size, ...props }) => (
  <section {...props} style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,.86)', boxShadow: hoverable ? '0 5px 18px rgba(0,0,0,.08)' : undefined, ...props.style }}>
    {cover}{(title || extra) && <header style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,.08)', ...styles.header }}>{title}{extra}</header>}
    <div style={{ padding: 16, ...bodyStyle, ...styles.body }}>{children}</div>
  </section>
);

export const Row: React.FC<any> = ({ children, gutter = 0, style, ...props }) => {
  const gap = Array.isArray(gutter) ? gutter[0] : gutter;
  return <div {...props} style={{ display: 'flex', flexWrap: 'wrap', gap, ...style }}>{children}</div>;
};
export const Col: React.FC<any> = ({ children, xs = 24, style, ...props }) => <div {...props} style={{ flex: `1 1 ${Math.min(100, (xs / 24) * 100)}%`, ...style }}>{children}</div>;

export const InputNumber = forwardRef<HTMLInputElement, any>(({ onChange, ...props }, ref) => <input ref={ref} type="number" {...props} onChange={(event) => onChange?.(event.target.value === '' ? null : Number(event.target.value))} style={{ minHeight: 34, border: '1px solid rgba(0,0,0,.18)', borderRadius: 8, padding: '6px 10px', ...props.style }} />);
InputNumber.displayName = 'InputNumber';
type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & { checked?: boolean; onChange?: (checked: boolean) => void };
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, ...props }) => <button type="button" role="switch" aria-checked={checked} {...props} onClick={() => onChange?.(!checked)} style={{ width: 42, height: 24, border: 0, borderRadius: 20, padding: 3, background: checked ? '#1677ff' : '#aaa', ...props.style }}><span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: checked ? 'translateX(18px)' : 'none', transition: 'transform .2s' }} /></button>;

export type TableColumn<T> = {
  title?: React.ReactNode;
  dataIndex?: keyof T | string;
  key?: React.Key;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  onCell?: (record: T) => Record<string, any>;
  width?: number | string;
  [key: string]: any;
};
export type TableProps<T = any> = { columns?: TableColumn<T>[]; dataSource?: T[]; rowKey?: keyof T | ((record: T) => React.Key); pagination?: { showTotal?: (total: number, range: [number, number]) => React.ReactNode; [key: string]: any } | false; [key: string]: any };
export const Table = <T,>({ columns = [], dataSource = [], rowKey = 'key' as keyof T, components = {}, rowClassName, bordered, pagination, ...props }: TableProps<T>) => {
  const RowComponent = components?.body?.row || 'tr';
  const CellComponent = components?.body?.cell || 'td';
  return <div style={{ overflowX: 'auto' }}><table {...props} style={{ width: '100%', borderCollapse: 'collapse', ...props.style }}><thead><tr>{columns.map((column, index) => <th key={String(column.key ?? column.dataIndex ?? index)} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(0,0,0,.14)', width: column.width }}>{column.title}</th>)}</tr></thead><tbody>{dataSource.map((record, rowIndex) => { const key = typeof rowKey === 'function' ? rowKey(record) : (record as any)[rowKey]; return <RowComponent key={String(key ?? rowIndex)} record={record} index={rowIndex} className={typeof rowClassName === 'function' ? rowClassName(record, rowIndex) : rowClassName}>{columns.map((column, columnIndex) => { const value = column.dataIndex == null ? undefined : (record as any)[column.dataIndex]; const cellProps = column.onCell?.(record) || {}; return <CellComponent key={String(column.key ?? column.dataIndex ?? columnIndex)} {...cellProps} style={{ padding: 10, borderBottom: '1px solid rgba(0,0,0,.08)', ...cellProps.style }}>{column.render ? column.render(value, record, rowIndex) : value as React.ReactNode}</CellComponent>; })}</RowComponent>; })}</tbody></table></div>;
};

type AutoCompleteProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect'> & { options?: any[]; onSearch?: (value: string) => void; onSelect?: (value: string) => void; onChange?: (value: string) => void; children?: React.ReactNode; notFoundContent?: React.ReactNode };
export const AutoComplete = forwardRef<HTMLInputElement, AutoCompleteProps>(({ options = [], onSearch, onSelect, onChange, value, children, style, ...props }, ref) => {
  const id = useMemo(() => `autocomplete-${Math.random().toString(36).slice(2)}`, []);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value);
    onChange?.(event.target.value);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSelect?.(event.currentTarget.value);
    }
    props.onKeyDown?.(event);
  };
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<any>, {
        ref,
        list: id,
        value: value ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          handleChange(event);
          (children as React.ReactElement<any>).props.onChange?.(event);
        },
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
          handleKeyDown(event);
          (children as React.ReactElement<any>).props.onKeyDown?.(event);
        },
      })
    : <input ref={ref} list={id} value={value ?? ''} {...props} onChange={handleChange} onKeyDown={handleKeyDown} style={{ width: '100%', minHeight: 34, border: '1px solid rgba(0,0,0,.18)', borderRadius: 8, padding: '6px 10px' }} />;
  return <div style={style}>{control}<datalist id={id}>{options.map((option: any, index: number) => <option key={index} value={String(option.value ?? option.label)} />)}</datalist></div>;
});
AutoComplete.displayName = 'AutoComplete';

const flattenTree = (nodes: any[] = [], depth = 0): any[] => nodes.flatMap((node) => [{ ...node, __depth: depth }, ...flattenTree(node.children, depth + 1)]);
export const TreeSelect: React.FC<any> = ({ treeData = [], value, onChange, placeholder, allowClear, style, open, onOpenChange, dropdownRender, treeTitleRender: _treeTitleRender, treeLine: _treeLine, showSearch: _showSearch, filterTreeNode: _filterTreeNode, treeDefaultExpandAll: _treeDefaultExpandAll, ...props }) => {
  const choices = flattenTree(treeData);
  return <div style={{ position: 'relative', ...style }}><select value={value ?? ''} onChange={(event) => onChange?.(event.target.value || undefined)} onFocus={() => onOpenChange?.(true)} onBlur={() => setTimeout(() => onOpenChange?.(false), 100)} style={{ width: '100%', minHeight: 34, border: '1px solid rgba(0,0,0,.18)', borderRadius: 8, padding: '6px 10px', background: '#fff' }} {...props}>{(placeholder || allowClear) && <option value="">{placeholder || '请选择'}</option>}{choices.map((node) => <option key={String(node.value ?? node.key)} value={String(node.value ?? node.key)}>{`${'　'.repeat(node.__depth)}${typeof node.title === 'string' ? node.title : node.label ?? node.value}`}</option>)}</select>{open && dropdownRender && <div style={{ position: 'absolute', zIndex: 1000, left: 0, right: 0, top: '100%', background: '#fff', padding: 8, border: '1px solid rgba(0,0,0,.12)', boxShadow: '0 8px 20px rgba(0,0,0,.12)' }}>{dropdownRender(<div />)}</div>}</div>;
};

const LIST_IGNORE = Symbol('LIST_IGNORE');
export const Upload: React.FC<UploadProps> & { LIST_IGNORE: symbol } = Object.assign(({ children, fileList = [], onChange, beforeUpload, customRequest, multiple, accept, maxCount, disabled, showUploadList = true, listType, ...props }: UploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const choose = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const next: UploadFile[] = [];
    for (const file of selected) {
      const verdict = beforeUpload ? await beforeUpload(file, selected) : true;
      if (verdict === LIST_IGNORE) continue;
      const item: UploadFile = { uid: `${Date.now()}-${Math.random()}`, name: file.name, status: verdict === false ? undefined : 'uploading', originFileObj: file };
      next.push(item);
      if (verdict !== false && customRequest) customRequest({ file, onSuccess: (response: any) => { item.status = 'done'; onChange?.({ file: item, fileList: [...fileList, ...next], event: response }); }, onError: (error: any) => { item.status = 'error'; onChange?.({ file: item, fileList: [...fileList, ...next], event: error }); } });
    }
    const merged = maxCount ? [...fileList, ...next].slice(-maxCount) : [...fileList, ...next];
    onChange?.({ file: next[0], fileList: merged });
    event.target.value = '';
  };
  return <div className={`lite-upload lite-upload-${listType || 'text'}`} {...props}><input ref={inputRef} type="file" hidden multiple={multiple} accept={accept} disabled={disabled} onChange={choose} /><div role="button" tabIndex={0} onClick={() => !disabled && inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter') inputRef.current?.click(); }} style={{ display: 'inline-block', cursor: disabled ? 'not-allowed' : 'pointer' }}>{children}</div>{showUploadList !== false && fileList.length > 0 && <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>{fileList.map((file: UploadFile) => <div key={file.uid} style={{ fontSize: 12 }}>{file.name}</div>)}</div>}</div>;
}, { LIST_IGNORE });
