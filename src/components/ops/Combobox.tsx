'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export type ComboOption = { value: string; label: string; hint?: string; icon?: React.ReactNode; group?: string };

/**
 * A select with a search box: click to open, type to filter, arrows + Enter to pick, Esc to close.
 * `emptyOption` adds a first choice for "no value" (e.g. "Anywhere"); `allowCustom` lets the typed text be used.
 */
export default function Combobox({ value, onChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyOption, allowCustom, invalid, id, onFocus, searchable = true }: {
    value: string;
    onChange: (value: string) => void;
    options: ComboOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyOption?: { label: string; hint?: string };
    allowCustom?: boolean;
    invalid?: boolean;
    id?: string;
    onFocus?: () => void;
    /** Short lists (e.g. priority) don't need a search box */
    searchable?: boolean;
}) {
    const auto = useId();
    const listId = `${id || auto}-list`;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [up, setUp] = useState(false);   // open above the box when there's no room below
    const pop = useRef<HTMLDivElement>(null);
    const root = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLUListElement>(null);

    const selected = options.find(o => o.value === value);

    // What's shown: the empty choice, matches (grouped), then "use what I typed"
    const items = useMemo(() => {
        const q = query.trim().toLowerCase();
        const seen = new Set<string>();
        const matches = options.filter(o => {
            if (seen.has(o.value)) return false;
            seen.add(o.value);
            return !q || o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q);
        })
            // Names starting with the search first
            .sort((a, b) => (q ? Number(!a.label.toLowerCase().startsWith(q)) - Number(!b.label.toLowerCase().startsWith(q)) : 0));
        const out: (ComboOption & { kind?: 'empty' | 'custom' })[] = [];
        if (emptyOption && !q) out.push({ value: '', label: emptyOption.label, hint: emptyOption.hint, kind: 'empty' });
        out.push(...matches.slice(0, 200));
        if (allowCustom && q && !options.some(o => o.label.toLowerCase() === q)) out.push({ value: query.trim(), label: `Use “${query.trim()}”`, kind: 'custom' });
        return out;
    }, [options, query, emptyOption, allowCustom]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // Keep the highlighted row in view
    useEffect(() => {
        list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const openList = () => {
        setQuery('');
        const at = items.findIndex(o => o.value === value);
        setActive(Math.max(0, at));
        // Room below the box (less a sticky footer, e.g. a slider's Save bar)?
        const r = root.current?.getBoundingClientRect();
        if (r) setUp(window.innerHeight - r.bottom < 340 && r.top > window.innerHeight - r.bottom);
        setOpen(true);
        onFocus?.();
        setTimeout(() => (searchable ? search.current : pop.current)?.focus(), 0);
    };
    const pick = (v: string) => { onChange(v); setOpen(false); };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(items.length - 1, i + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) pick(items[active].value); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        else if (e.key === 'Tab') setOpen(false);
    };

    let lastGroup: string | undefined;
    return (
        <div className={`ocb${open ? ' open' : ''}`} ref={root}>
            <button type="button" id={id} className={`input ocb-trigger${invalid ? ' error' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={e => { if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); } }}>
                {selected?.icon && <span className="ocb-icon">{selected.icon}</span>}
                <span className={`ocb-value${!value ? ' placeholder' : ''}`}>
                    {selected ? selected.label : value || (emptyOption ? emptyOption.label : placeholder)}
                </span>
                {value && emptyOption && (
                    <span role="button" tabIndex={-1} className="ocb-clear" aria-label="Clear" onClick={e => { e.stopPropagation(); onChange(''); }}><X size={14} /></span>
                )}
                <ChevronDown size={16} className="ocb-chev" />
            </button>

            {open && (
                // Fields wrap their input in a <label>: stop clicks in the list from also "clicking" the box (which reopened it)
                <div ref={pop} className={`ocb-pop${up ? ' up' : ''}`} tabIndex={-1} onKeyDown={searchable ? undefined : onKey}
                    onClick={e => { if (!(e.target as HTMLElement).closest('input')) e.preventDefault(); }}>
                    {searchable && (
                        <label className="ocb-search">
                            <Search size={15} />
                            <input ref={search} value={query} placeholder={searchPlaceholder} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey}
                                role="combobox" aria-expanded aria-controls={listId} aria-activedescendant={`${listId}-${active}`} autoComplete="off" spellCheck={false} />
                        </label>
                    )}
                    <ul className="ocb-list" role="listbox" id={listId} ref={list}>
                        {items.length === 0 && <li className="ocb-none">No matches</li>}
                        {items.map((o, i) => {
                            const header = o.group && o.group !== lastGroup && !o.kind ? o.group : null;
                            if (!o.kind) lastGroup = o.group;
                            return (
                                <li key={`${o.kind || 'o'}-${o.value}`} role="presentation">
                                    {header && <p className="ocb-group">{header}</p>}
                                    <div role="option" id={`${listId}-${i}`} data-i={i} aria-selected={o.value === value}
                                        className={`ocb-opt${i === active ? ' active' : ''}${o.kind ? ` ${o.kind}` : ''}`}
                                        onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o.value)}>
                                        {o.icon && <span className="ocb-icon">{o.icon}</span>}
                                        <span className="ocb-opt-text">
                                            <span>{o.label}</span>
                                            {o.hint && <small>{o.hint}</small>}
                                        </span>
                                        {o.value === value && !o.kind && <Check size={15} className="ocb-tick" />}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
