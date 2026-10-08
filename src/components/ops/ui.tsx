'use client';

// Shared building blocks for the operations portal, so every page has the same look:
// page header, stat cards, panels, tables, badges, toolbars, empty states, pagination and modals.

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Search, X, type LucideIcon } from 'lucide-react';
import './ops-ui.css';

// ── Page ─────────────────────────────────────────────────────────────────────
export function OpsPage({ title, subtitle, actions, back, children, narrow }: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    back?: { href?: string; label: string; onClick?: () => void };
    children: React.ReactNode;
    narrow?: boolean;
}) {
    return (
        <div className={`o-page fade-in${narrow ? ' narrow' : ''}`}>
            {back && (back.onClick
                ? <button type="button" className="o-back" onClick={back.onClick}><ArrowLeft size={15} /> {back.label}</button>
                : <Link href={back.href || '/ops'} className="o-back"><ArrowLeft size={15} /> {back.label}</Link>)}
            <header className="o-page-head">
                <div style={{ minWidth: 0 }}>
                    <h1>{title}</h1>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                {actions && <div className="o-page-actions">{actions}</div>}
            </header>
            {children}
        </div>
    );
}

// ── Stats ────────────────────────────────────────────────────────────────────
export function StatGrid({ children, cols }: { children: React.ReactNode; cols?: number }) {
    return <div className="o-stats" style={cols ? { ['--o-cols' as string]: cols } : undefined}>{children}</div>;
}

export function Stat({ icon: Icon, label, value, tone = 'neutral', hint, href, onClick, active }: {
    icon: LucideIcon; label: string; value: React.ReactNode; tone?: Tone; hint?: React.ReactNode;
    href?: string; onClick?: () => void; active?: boolean;
}) {
    const body = (
        <>
            <span className={`o-stat-icon tone-${tone}`}><Icon size={21} /></span>
            <span className="o-stat-text">
                <strong>{value}</strong>
                <small>{label}</small>
                {hint && <em>{hint}</em>}
            </span>
        </>
    );
    const cls = `o-stat${active ? ' active' : ''}`;
    if (href) return <Link href={href} className={cls}>{body}</Link>;
    if (onClick) return <button type="button" className={cls} onClick={onClick}>{body}</button>;
    return <div className={cls}>{body}</div>;
}

// ── Panels ───────────────────────────────────────────────────────────────────
export function Panel({ title, subtitle, icon: Icon, actions, children, flush, className = '', collapsible, defaultOpen = true }: {
    title?: React.ReactNode; subtitle?: React.ReactNode; icon?: LucideIcon; actions?: React.ReactNode;
    children: React.ReactNode; flush?: boolean; className?: string;
    /** Click the header to show or hide the body; actions (e.g. Save) stay visible either way */
    collapsible?: boolean; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const bodyId = useId();
    const shown = !collapsible || open;
    const heading = (
        <>
            {Icon && <span className="o-panel-icon"><Icon size={17} /></span>}
            <div>
                {title && <h2>{title}</h2>}
                {subtitle && <p>{subtitle}</p>}
            </div>
        </>
    );
    return (
        <section className={`o-panel${flush ? ' flush' : ''}${collapsible ? ' collapsible' : ''}${shown ? '' : ' collapsed'} ${className}`}>
            {(title || actions) && (
                <div className="o-panel-head">
                    {collapsible ? (
                        <button type="button" className="o-panel-title o-panel-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
                            <ChevronDown size={18} className="o-panel-chevron" />
                            {heading}
                        </button>
                    ) : (
                        <div className="o-panel-title">{heading}</div>
                    )}
                    {actions && <div className="o-panel-actions">{actions}</div>}
                </div>
            )}
            <div className="o-panel-body" id={bodyId} hidden={!shown}>{children}</div>
        </section>
    );
}

// ── Toolbar & inputs ─────────────────────────────────────────────────────────
export function Toolbar({ children }: { children: React.ReactNode }) {
    return <div className="o-toolbar">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div className="o-search">
            <Search size={16} />
            <input className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
            {value && <button type="button" onClick={() => onChange('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
    );
}

export function Field({ label, hint, error, children, full }: { label: string; hint?: string; error?: string; children: React.ReactNode; full?: boolean }) {
    return (
        <label className={`o-field${full ? ' full' : ''}`}>
            <span className="o-field-label">{label}</span>
            {children}
            {error ? <span className="o-field-error">{error}</span> : hint ? <span className="o-field-hint">{hint}</span> : null}
        </label>
    );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode; count?: number }[] }) {
    return (
        <div className="o-segmented" role="tablist">
            {options.map(o => (
                <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
                    {o.label}{o.count !== undefined && <em>{o.count}</em>}
                </button>
            ))}
        </div>
    );
}

// Page-level tabs (underlined), e.g. Support tickets | Website enquiries
export function Tabs<T extends string>({ value, onChange, tabs, label }: {
    value: T; onChange: (v: T) => void; label?: string;
    tabs: { value: T; label: string; icon?: LucideIcon; count?: number; alert?: boolean }[];
}) {
    return (
        <div className="o-tabs" role="tablist" aria-label={label}>
            {tabs.map(({ value: v, label: l, icon: Icon, count, alert }) => (
                <button key={v} type="button" role="tab" aria-selected={v === value} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
                    {Icon && <Icon size={16} />}
                    <span>{l}</span>
                    {count !== undefined && <em className={alert && count > 0 ? 'alert' : ''}>{count}</em>}
                </button>
            ))}
        </div>
    );
}

// ── Status badges ────────────────────────────────────────────────────────────
export type Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

const STATUS_TONES: Record<string, Tone> = {
    // shipments
    draft: 'neutral', pending: 'warning', confirmed: 'info', picked_up: 'violet', in_transit: 'brand',
    out_for_delivery: 'violet', delivered: 'success', cancelled: 'danger', failed: 'danger',
    // tickets / enquiries
    open: 'warning', new: 'brand', in_progress: 'info', resolved: 'success', closed: 'neutral',
    // priorities
    low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger',
    // accounts
    active: 'success', inactive: 'neutral', suspended: 'danger', enabled: 'success', disabled: 'neutral',
};

export function StatusBadge({ status, label, tone }: { status: string; label?: string; tone?: Tone }) {
    const t = tone || STATUS_TONES[status] || 'neutral';
    return <span className={`o-badge tone-${t}`}>{label || status.replace(/_/g, ' ')}</span>;
}

// ── Tables ───────────────────────────────────────────────────────────────────
export function Table({ children, minWidth }: { children: React.ReactNode; minWidth?: number }) {
    return (
        <div className="o-table-wrap">
            <table className="o-table" style={minWidth ? { minWidth } : undefined}>{children}</table>
        </div>
    );
}

// ── States ───────────────────────────────────────────────────────────────────
export function Loader({ label = 'Loading…' }: { label?: string }) {
    return (
        <div className="o-loader" role="status">
            <div className="spinner" />
            <span>{label}</span>
        </div>
    );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
    return (
        <div className="o-empty">
            <span className="o-empty-icon"><Icon size={26} /></span>
            <h3>{title}</h3>
            {text && <p>{text}</p>}
            {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
        </div>
    );
}

export function Pager({ page, pages, total, onChange, noun = 'results' }: { page: number; pages: number; total?: number; onChange: (p: number) => void; noun?: string }) {
    if (pages <= 1) return null;
    return (
        <div className="o-pager">
            <span>{total !== undefined ? `${total.toLocaleString()} ${noun}` : ''}</span>
            <div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
                <span>Page <b>{page}</b> of {pages}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page"><ChevronRight size={16} /></button>
            </div>
        </div>
    );
}

// ── Misc ─────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
    const initials = (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    return <span className="o-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}

export function KeyValues({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
    return (
        <dl className="o-kv">
            {rows.map(([k, v], i) => (
                <div key={i}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>
            ))}
        </dl>
    );
}

/** Right-hand slide-over for longer forms. Sits under Modal, so a dialog can open on top of it. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 980 }: {
    open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode;
    children: React.ReactNode; footer?: React.ReactNode; width?: number;
}) {
    const [closing, setClosing] = useState(false);
    // Slide out before unmounting
    const close = () => {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 180);
    };
    useEffect(() => {
        if (!open) return;
        // Escape closes the drawer only when no dialog is open on top of it
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.o-modal-backdrop')) close(); };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!open) return null;
    const host = (typeof document !== 'undefined' && (document.querySelector('.ops-shell') || document.body)) || null;
    const panel = (
        <div className={`o-drawer-backdrop${closing ? ' closing' : ''}`} onClick={close}>
            <aside className="o-drawer" role="dialog" aria-modal="true" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
                <div className="o-modal-head">
                    <div>
                        <h2>{title}</h2>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
                </div>
                <div className="o-drawer-body">{children}</div>
                {footer && <div className="o-modal-foot">{footer}</div>}
            </aside>
        </div>
    );
    return host ? createPortal(panel, host) : panel;
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 560 }: {
    open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode;
    children: React.ReactNode; footer?: React.ReactNode; width?: number;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    // Render at the shell root so the dialog sits above the sticky top bar and sidebar
    const host = (typeof document !== 'undefined' && (document.querySelector('.ops-shell') || document.body)) || null;
    const dialog = (
        <div className="o-modal-backdrop" onClick={onClose}>
            <div className="o-modal" role="dialog" aria-modal="true" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
                <div className="o-modal-head">
                    <div>
                        <h2>{title}</h2>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>
                <div className="o-modal-body">{children}</div>
                {footer && <div className="o-modal-foot">{footer}</div>}
            </div>
        </div>
    );
    return host ? createPortal(dialog, host) : dialog;
}

export const money = (n: number | string | null | undefined) =>
    `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d?: string | null, withTime = false) =>
    d ? new Date(d).toLocaleString('en-KE', withTime
        ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Download rows as a CSV file
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
}
