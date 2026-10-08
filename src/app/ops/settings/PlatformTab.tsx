'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Calculator, Clock, MapPin, Settings2, Save, RotateCcw, Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Loader, EmptyState, SearchInput } from '@/components/ops/ui';
import type { LucideIcon } from 'lucide-react';

type Setting = { key: string; value: string; type: 'number' | 'string' | 'boolean' | 'json'; label?: string; description?: string; group: string };

const MASK = '••••••••••••••••';

// Website content (landing) and Branding have their own tabs
const HIDDEN_GROUPS = new Set(['landing', 'branding', 'internal']);
// Prices are always USD, so the currency isn't a setting anyone should change
// currency is fixed (USD); company name and website address are edited under Settings → Business
const HIDDEN_KEYS = new Set(['currency', 'company_name', 'site_url']);

const GROUP_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
    general: { label: 'General', description: 'Other platform options', icon: Building2 },
    fees: { label: 'Pricing & fees', description: 'Base rates, surcharges and tax', icon: Calculator },
    delivery: { label: 'Delivery times', description: 'Transit days used in estimates', icon: Clock },
    google_maps: { label: 'Maps & addresses', description: 'Address search and precise locations', icon: MapPin },
};
const groupMeta = (g: string) => GROUP_META[g] || { label: g.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), description: '', icon: Settings2 };
const GROUP_ORDER = ['general', 'fees', 'delivery', 'google_maps'];

// "Minimum Charge (KES)" → label "Minimum Charge", unit "KES"
const splitLabel = (s: Setting) => {
    const raw = s.label || s.key.replace(/_/g, ' ');
    const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    let label = m ? m[1] : raw;
    let unit = m ? m[2] : '';
    if (!unit && s.type === 'number') {
        if (/_days$/.test(s.key)) unit = 'days';
        else if (/multiplier/.test(s.key)) unit = '×';
        else if (/divisor/.test(s.key)) unit = 'cm³/kg';
    }
    label = label.replace(/^\w/, c => c.toUpperCase());
    return { label, unit };
};

const isSecret = (s: Setting) => s.value === MASK || /api_key|secret|password|token/.test(s.key);

function Control({ s, value, onChange, disabled }: { s: Setting; value: string; onChange: (v: string) => void; disabled: boolean }) {
    const [reveal, setReveal] = useState(false);
    const { unit } = splitLabel(s);

    if (s.type === 'boolean') {
        return (
            <label className="oset-switch">
                <input type="checkbox" checked={value === 'true'} disabled={disabled} onChange={e => onChange(e.target.checked ? 'true' : 'false')} />
                <span aria-hidden="true" />
                <em>{value === 'true' ? 'On' : 'Off'}</em>
            </label>
        );
    }

    if (isSecret(s)) {
        const saved = s.value === MASK;
        return (
            <div className="oset-affix oset-control">
                <span className="pre"><Lock size={13} /></span>
                <input
                    className="input"
                    type={reveal ? 'text' : 'password'}
                    autoComplete="off"
                    disabled={disabled}
                    value={value === MASK ? '' : value}
                    placeholder={saved ? 'Saved — type a new value to replace' : 'Not set'}
                    onChange={e => onChange(e.target.value || (saved ? MASK : ''))}
                />
                <button type="button" onClick={() => setReveal(r => !r)} aria-label={reveal ? 'Hide' : 'Show'}>{reveal ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
        );
    }

    if (s.type === 'json') {
        return <textarea className="input oset-control" rows={4} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} />;
    }

    const input = (
        <input
            className="input"
            type={s.type === 'number' ? 'number' : s.key.includes('email') ? 'email' : s.key.includes('url') ? 'url' : 'text'}
            step={s.type === 'number' ? 'any' : undefined}
            disabled={disabled}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            style={{ textAlign: s.type === 'number' ? 'right' : 'left' }}
        />
    );
    return unit ? <div className="oset-affix oset-control">{input}<span>{unit}</span></div> : <div className="oset-control">{input}</div>;
}

// Pricing rules (fees, surcharges, delivery times) are edited on the Pricing page, not here
export const PRICING_GROUPS = ['fees', 'delivery'];

/** groups: show only these setting groups (Pricing → Rules); by default everything except the pricing ones */
export default function PlatformTab({ canEdit, groups: only }: { canEdit: boolean; groups?: string[] }) {
    const [settings, setSettings] = useState<Record<string, Setting[]>>({});
    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState('');
    const [dirty, setDirty] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState('');

    const load = useCallback(() => api.get('/admin/settings')
        .then(r => {
            const all: Record<string, Setting[]> = r.data.data.settings || {};
            const visible = Object.fromEntries(Object.entries(all)
                .map(([g, list]) => [g, list.filter(x => !HIDDEN_KEYS.has(x.key))] as const)
                .filter(([g, list]) => !HIDDEN_GROUPS.has(g) && list.length && (only ? only.includes(g) : !PRICING_GROUPS.includes(g))));
            setSettings(visible);
            setGroup(g => g || GROUP_ORDER.find(k => visible[k]) || Object.keys(visible)[0] || '');
        })
        .catch(() => toast.error('Could not load settings'))
        .finally(() => setLoading(false)), [only]); // callers pass a constant list, so this loads once

    useEffect(() => { load(); }, [load]);

    const groups = useMemo(() => Object.keys(settings).sort((a, b) => {
        const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }), [settings]);
    const all = useMemo(() => Object.values(settings).flat(), [settings]);
    const dirtyCount = Object.keys(dirty).length;

    const q = query.trim().toLowerCase();
    const shown = q
        ? all.filter(s => `${s.label} ${s.key} ${s.description || ''}`.toLowerCase().includes(q))
        : settings[group] || [];

    const onChange = (key: string, val: string) => {
        const original = all.find(s => s.key === key)?.value;
        setDirty(d => {
            const next = { ...d };
            if (String(original ?? '') === val) delete next[key]; else next[key] = val;
            return next;
        });
    };

    const save = async () => {
        for (const [key, val] of Object.entries(dirty)) {
            const s = all.find(x => x.key === key);
            if (s?.type === 'number' && (val === '' || Number.isNaN(Number(val)))) { toast.error(`${splitLabel(s).label} must be a number`); return; }
            if (s?.type === 'json') { try { JSON.parse(val); } catch { toast.error(`${splitLabel(s).label} isn’t valid JSON`); return; } }
        }
        setSaving(true);
        try {
            await api.put('/admin/settings', { updates: dirty });
            toast.success(`${dirtyCount} setting${dirtyCount === 1 ? '' : 's'} saved`);
            setDirty({});
            await load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader label="Loading settings…" />;
    if (!groups.length) return <Panel><EmptyState icon={Settings2} title="No settings found" /></Panel>;

    const meta = groupMeta(group);

    return (
        <>
            <div className="oset-layout">
                <div className="o-stack oset-side" style={{ gap: '0.75rem' }}>
                    <SearchInput value={query} onChange={setQuery} placeholder="Find a setting…" />
                    <nav className="oset-groups" aria-label="Setting groups">
                        {groups.map(g => {
                            const m = groupMeta(g);
                            const changed = (settings[g] || []).filter(s => dirty[s.key] !== undefined).length;
                            return (
                                <button key={g} type="button" className={g === group && !q ? 'active' : ''} onClick={() => { setGroup(g); setQuery(''); }}>
                                    <span className="oset-group-icon"><m.icon size={17} /></span>
                                    <span className="oset-group-text"><strong>{m.label}</strong>{m.description && <small>{m.description}</small>}</span>
                                    {changed > 0 && <em>{changed}</em>}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <Panel
                    title={q ? `Results for “${query.trim()}”` : meta.label}
                    subtitle={q ? `${shown.length} matching setting${shown.length === 1 ? '' : 's'}` : meta.description}
                    icon={q ? undefined : meta.icon}
                >
                    {shown.length === 0 ? <EmptyState icon={Settings2} title="No settings match" text="Try a different word." /> : (
                        <div className="oset-list">
                            {shown.map(s => {
                                const { label } = splitLabel(s);
                                const value = dirty[s.key] ?? s.value;
                                return (
                                    <div key={s.key} className={`oset-row${dirty[s.key] !== undefined ? ' changed' : ''}`}>
                                        <div>
                                            <p className="oset-label">{label}{q && <span className="oset-tag">{groupMeta(s.group).label}</span>}</p>
                                            {s.description && <p className="oset-desc">{s.description}</p>}
                                        </div>
                                        <Control s={s} value={value} disabled={!canEdit} onChange={v => onChange(s.key, v)} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            </div>

            {canEdit && dirtyCount > 0 && (
                <div className="oset-savebar" role="status">
                    <p><i aria-hidden="true" /> {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}</p>
                    <div className="o-row" style={{ gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => setDirty({})} disabled={saving}><RotateCcw size={15} /> Discard</button>
                        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner" /> : <><Save size={15} /> Save changes</>}</button>
                    </div>
                </div>
            )}
        </>
    );
}
