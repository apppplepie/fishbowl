'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGetJson } from '@/lib/apiClient';

export type Option = { id: string; name: string };

export function getOptionsFromMap(map: Record<string, string>, keyword: string): Option[] {
    const k = keyword.trim().toLowerCase();
    let list = Object.entries(map).map(([id, name]) => ({ id, name }));
    if (k) list = list.filter(({ name }) => name.toLowerCase().includes(k));
    return list.sort((a, b) => {
        const na = parseInt(a.id, 10);
        const nb = parseInt(b.id, 10);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.id.localeCompare(b.id);
    });
}

type Props = {
    // 二选一：提供 map（id->name）或 options（数组）
    optionsMap?: Record<string, string>;
    options?: Option[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
    className?: string;
    // 是否允许输入无匹配时创建（可选扩展）
    allowCreate?: boolean;
};

export default function TagSearchPicker({
    optionsMap,
    options,
    selectedIds,
    onChange,
    placeholder = '输入以搜索',
    className,
    allowCreate = false,
}: Props) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const [inputValue, setInputValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

    // 当 selectedIds 改变时滚动到末尾并清除高亮
    useEffect(() => {
        setActiveIndex(null);
        const el = scrollRef.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, [selectedIds]);

    // 高亮变化时滚入可见区
    useEffect(() => {
        if (activeIndex === null) {
            const el = scrollRef.current;
            if (el) el.scrollLeft = el.scrollWidth;
        } else {
            tagRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [activeIndex]);

    // 构建候选项数组：options 时按输入字符模糊匹配 name，optionsMap 时用 getOptionsFromMap
    const allOptions: Option[] = options
        ? (() => {
            const k = inputValue.trim().toLowerCase();
            const list = k
                ? options.filter((o) => o.name.toLowerCase().includes(k))
                : options;
            return [...list].sort((a, b) => a.name.localeCompare(b.name));
        })()
        : optionsMap
            ? getOptionsFromMap(optionsMap, inputValue)
            : [];

    // 过滤掉已选，只取最接近的一条：优先前缀匹配，再按名称排序
    const lineOptions = allOptions.filter((o) => !selectedIds.includes(o.id));
    const k = inputValue.trim().toLowerCase();
    const sortedForClosest =
        k && lineOptions.length > 1
            ? [...lineOptions].sort((a, b) => {
                  const aPrefix = a.name.toLowerCase().startsWith(k) ? 0 : 1;
                  const bPrefix = b.name.toLowerCase().startsWith(k) ? 0 : 1;
                  if (aPrefix !== bPrefix) return aPrefix - bPrefix;
                  return a.name.localeCompare(b.name);
              })
            : lineOptions;
    const singleOption = sortedForClosest.length > 0 ? sortedForClosest[0] : null; // 下拉只显示这一条
    const showDropdown = focused && (inputValue.trim() !== '' ? true : lineOptions.length > 0);
    const noMatch = inputValue.trim() !== '' && lineOptions.length === 0; // 有输入但无匹配时显示「无匹配项」

    const addTag = (id: string) => {
        if (selectedIds.includes(id)) return;
        onChange([...selectedIds, id]);
        setInputValue('');
        setActiveIndex(null);
    };

    const removeTag = (id: string) => {
        onChange(selectedIds.filter((s) => s !== id));
    };

    // 下拉用 Portal 挂到 body，需同时判断焦点是否移入下拉内
    const handleWrapBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        if (wrapRef.current?.contains(e.relatedTarget as Node | null)) return;
        if (dropdownRef.current?.contains(e.relatedTarget as Node | null)) return;
        setFocused(false);
        setActiveIndex(null);
        setInputValue('');
    };

    // Portal 下拉定位：脱离 box1 层叠上下文，避免被 box2 遮住
    useEffect(() => {
        if (!showDropdown) {
            setDropdownRect(null);
            return;
        }
        const update = () => {
            if (wrapRef.current) {
                const r = wrapRef.current.getBoundingClientRect();
                setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
            }
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [showDropdown]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowLeft') {
            if (inputValue === '' && selectedIds.length > 0) {
                e.preventDefault();
                setActiveIndex((prev) =>
                    prev === null ? selectedIds.length - 1 : Math.max(0, prev - 1),
                );
            }
            return;
        }

        if (e.key === 'ArrowRight') {
            if (activeIndex !== null) {
                e.preventDefault();
                setActiveIndex(activeIndex >= selectedIds.length - 1 ? null : activeIndex + 1);
            }
            return;
        }

        if (e.key === 'Backspace') {
            if (activeIndex !== null) {
                e.preventDefault();
                const nextIndex =
                    selectedIds.length > 1 ? Math.min(activeIndex, selectedIds.length - 2) : null;
                removeTag(selectedIds[activeIndex]);
                setActiveIndex(nextIndex);
                return;
            }
            if (!inputValue && selectedIds.length > 0) {
                e.preventDefault();
                removeTag(selectedIds[selectedIds.length - 1]);
                return;
            }
        }

        if (e.key === 'Escape') {
            setActiveIndex(null);
            return;
        }

        if (activeIndex !== null && e.key.length === 1) {
            setActiveIndex(null);
        }

        if (e.key === 'Enter') {
            if (inputValue.trim() && singleOption) {
                e.preventDefault();
                addTag(singleOption.id);
            } else if (inputValue.trim() && allowCreate) {
                // 如果允许创建并且输入不为空，按需要把输入作为 id（或根据你业务生成 id）
                e.preventDefault();
                const newId = inputValue.trim();
                addTag(newId);
            } else if (inputValue.trim()) {
                e.preventDefault();
                setInputValue('');
            }
        }
    };

    return (
        <div
            ref={wrapRef}
            className={
                'relative pl-3 pr-3 py-2 bg-slate-50 border border-transparent rounded-lg ' +
                'transition-all min-h-[40px] flex items-center cursor-text ' +
                (focused ? 'bg-white border-primary/30 ring-2 ring-primary/10 ' : '') +
                (className ?? '')
            }
            onFocus={() => setFocused(true)}
            onBlur={handleWrapBlur}
            onClick={() => {
                setActiveIndex(null);
                inputRef.current?.focus();
            }}
        >
            {/* 横向滚动区：标签 + 输入框 */}
            <div
                ref={scrollRef}
                className="flex flex-nowrap items-center gap-1 flex-1 min-w-0 overflow-x-auto overflow-y-hidden"
            >
                {selectedIds.map((id, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <span
                            key={id}
                            ref={(el) => {
                                tagRefs.current[index] = el;
                            }}
                            className={
                                'tag-search-picker-pill inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-xs font-medium select-none cursor-pointer transition-all ' +
                                (isActive
                                    ? 'bg-primary text-white ring-2 ring-primary/40 '
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 ')
                            }
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setActiveIndex(index);
                                inputRef.current?.focus();
                            }}
                        >
                            {/* 如果提供 optionsMap，优先使用名称，否则显示 id */}
                            {optionsMap?.[id] ?? options?.find((o) => o.id === id)?.name ?? id}
                            <span
                                tabIndex={-1}
                                className={
                                    'tag-search-picker-pill-close ml-0.5 leading-none opacity-60 hover:opacity-100 focus:outline-none ' +
                                    (isActive ? 'text-white' : 'text-slate-500')
                                }
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTag(id);
                                    inputRef.current?.focus();
                                }}
                            >
                                ×
                            </span>
                        </span>
                    );
                })}

                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 py-0.5 px-1 h-6"
                    placeholder={selectedIds.length === 0 ? placeholder : ''}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setActiveIndex(null);
                    }}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* 下拉候选列表：Portal 到 body，避免被 box2 遮挡 */}
            {showDropdown && dropdownRect && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className={
                            'tag-search-picker-dropdown ' +
                            (className?.includes('tag-search-picker-transparent') ? 'tag-search-picker-dropdown-transparent' : '')
                        }
                        style={{
                            position: 'fixed',
                            top: dropdownRect.top,
                            left: dropdownRect.left,
                            minWidth: dropdownRect.width,
                            zIndex: 1050,
                        }}
                    >
                        <ul className="tag-search-picker-dropdown-list py-1 rounded-lg overflow-hidden" role="listbox">
                            {noMatch ? (
                                <li className="px-3 py-2 text-sm text-slate-400 select-none">无匹配项</li>
                            ) : singleOption ? (
                                <li
                                    key={singleOption.id}
                                    role="option"
                                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/10 cursor-pointer"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        addTag(singleOption.id);
                                    }}
                                >
                                    {singleOption.name}
                                </li>
                            ) : null}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
}

// --- 与项目标签 API 对接的包装：value/onChange 使用标签名（string[]），与书柜/文章等保持一致 ---
type TagItem = { id: string; name: string };

type TagSearchPickerWithTagsProps = {
    value: string[];
    onChange: (names: string[]) => void;
    placeholder?: string;
    className?: string;
};

export function TagSearchPickerWithTags({
    value,
    onChange,
    placeholder = '输入以搜索标签',
    className,
}: TagSearchPickerWithTagsProps) {
    const [options, setOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiGetJson<{ success?: boolean; tags?: TagItem[] }>('/api/tags', {
                    requiresAuth: false,
                });
                if (cancelled) return;
                if (data?.success && Array.isArray(data.tags)) {
                    setOptions(data.tags.map((t) => ({ id: t.id, name: t.name })));
                }
            } catch (e) {
                if (!cancelled) console.error('加载标签失败:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const idToName = React.useMemo(() => {
        const m: Record<string, string> = {};
        options.forEach((o) => {
            m[o.id] = o.name;
        });
        return m;
    }, [options]);

    const nameToId = React.useMemo(() => {
        const m: Record<string, string> = {};
        options.forEach((o) => {
            m[o.name] = o.id;
        });
        return m;
    }, [options]);

    const selectedIds = React.useMemo(() => {
        return value.map((name) => nameToId[name] ?? name);
    }, [value, nameToId]);

    const handleChange = (ids: string[]) => {
        const names = ids.map((id) => idToName[id] ?? id);
        onChange(names);
    };

    if (loading) {
        return (
            <div
                className={
                    'relative pl-3 pr-3 py-2 bg-slate-50 border border-transparent rounded-lg min-h-[40px] flex items-center text-slate-400 text-sm ' +
                    (className ?? '')
                }
            >
                加载标签…
            </div>
        );
    }

    return (
        <TagSearchPicker
            options={options}
            selectedIds={selectedIds}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
        />
    );
}