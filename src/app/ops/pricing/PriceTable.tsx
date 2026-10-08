'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plane, Ship, Truck, Save, RotateCcw, Search, Info, Tag, ClipboardPaste } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Loader, Segmented, EmptyState, StatGrid, Stat } from '@/components/ops/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/lib/auth';

type Mode = 'air' | 'sea' | 'road';
interface Location { id: string; name: string; type: string; parent_id: string | null; is_active: boolean }
type RateRow = Record<string, unknown> & { origin_id: string; destination_id: string };
interface Category { id: string; name: string; icon?: string; price_adjustment_pct: number | string; handling_fee: number | string; allowed_modes: unknown; is_active: boolean | number }

const MODES: { value: Mode; label: string; icon: typeof Plane }[] = [
    { value: 'air', label: 'Air', icon: Plane },
    { value: 'sea', label: 'Sea', icon: Ship },
    { value: 'road', label: 'Road', icon: Truck },
];
const DEFAULT_DAYS: Record<Mode, number> = { air: 7, sea: 30, road: 14 };

const key = (o: string, d: string) => `${o}|${d}`;
const num = (v: unknown) => Number(v) || 0;
const fmt = (n: number) => (n ? String(Math.round(n * 100) / 100) : '');
const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/** How the table reads its prices: what most routes in this mode already use */
export const inferRule = (rows: RateRow[], mode: Mode): { type: 'upto' | 'per_kg'; upto: number } => {
    const counts = new Map<string, number>();
    rows.filter(r => num(r[`${mode}_rate_per_kg`]) > 0).forEach(r => {
        const k = r[`${mode}_rate_type`] === 'upto' ? `upto:${num(r[`${mode}_upto_weight`])}` : 'per_kg';
        counts.set(k, (counts.get(k) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!top) return { type: 'upto', upto: 5 };
    return top === 'per_kg' ? { type: 'per_kg', upto: 5 } : { type: 'upto', upto: Number(top.split(':')[1]) || 5 };
};

/** Does a route follow the table's rule? (Others were set up individually on the Locations tab) */
const followsRule = (r: RateRow, mode: Mode, rule: { type: string; upto: number }) => {
    const amount = num(r[`${mode}_rate_per_kg`]);
    if (!amount) return true;
    if (rule.type === 'per_kg') return r[`${mode}_rate_type`] !== 'upto';
    if (r[`${mode}_rate_type`] !== 'upto' || num(r[`${mode}_upto_weight`]) !== rule.upto) return false;
    const extra = num(r[`${mode}_extra_per_kg`]);
    return !extra || Math.abs(extra - amount / rule.upto) < 0.011;
};

export default function PriceTable() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('manage_zones');
    const [locations, setLocations] = useState<Location[]>([]);
    const [rows, setRows] = useState<RateRow[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<Mode>('air');
    const [rule, setRule] = useState<{ type: 'upto' | 'per_kg'; upto: number }>({ type: 'upto', upto: 5 });
    const [edits, setEdits] = useState<Record<string, string>>({});      // cell key → typed value
    const [dayEdits, setDayEdits] = useState<Record<string, string>>({}); // destination id → typed days
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const table = useRef<HTMLTableElement>(null);

    const load = useCallback(async () => {
        const [l, r, c] = await Promise.all([api.get('/locations'), api.get('/locations/rates/all'), api.get('/admin/categories').catch(() => null)]);
        setLocations(l.data.data);
        setRows(r.data.data);
        if (c) setCategories(c.data.data.categories || []);
        return r.data.data as RateRow[];
    }, []);

    useEffect(() => {
        load().then(r => setRule(inferRule(r, 'air'))).catch(() => toast.error('Could not load prices')).finally(() => setLoading(false));
    }, [load]);

    const savedRule = useMemo(() => inferRule(rows, mode), [rows, mode]);
    const ruleChanged = rule.type !== savedRule.type || (rule.type === 'upto' && rule.upto !== savedRule.upto);
    const dirtyCount = Object.keys(edits).length + Object.keys(dayEdits).length;

    // Unsaved prices: warn before leaving the page
    useEffect(() => {
        if (!dirtyCount && !ruleChanged) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirtyCount, ruleChanged]);

    // Switching table with unsaved prices asks first (in a modal)
    const [pendingMode, setPendingMode] = useState<Mode | null>(null);
    const applyMode = (m: Mode) => { setEdits({}); setDayEdits({}); setMode(m); setRule(inferRule(rows, m)); setPendingMode(null); };
    const switchMode = (m: Mode) => {
        if (m === mode) return;
        if (dirtyCount || ruleChanged) setPendingMode(m);
        else applyMode(m);
    };

    // Columns: pickup points by country; rows: destination cities by country
    const byName = (a: Location, b: Location) => a.name.localeCompare(b.name);
    const countryOf = (l: Location) => locations.find(c => c.id === l.parent_id)?.name || '';
    const origins = useMemo(() => locations.filter(l => l.type === 'origin' && l.parent_id)
        .sort((a, b) => countryOf(a).localeCompare(countryOf(b)) || byName(a, b)), [locations]); // eslint-disable-line react-hooks/exhaustive-deps
    const destGroups = useMemo(() => {
        const q = search.trim().toLowerCase();
        return locations.filter(l => l.type === 'destination_country').sort(byName).map(country => ({
            country,
            cities: locations.filter(l => l.type === 'destination_city' && l.parent_id === country.id && (!q || l.name.toLowerCase().includes(q) || country.name.toLowerCase().includes(q))).sort(byName),
        })).filter(g => g.cities.length);
    }, [locations, search]);
    const originCountries = useMemo(() => {
        const out: { name: string; span: number }[] = [];
        origins.forEach(o => { const n = countryOf(o); if (out.at(-1)?.name === n) out.at(-1)!.span++; else out.push({ name: n, span: 1 }); });
        return out;
    }, [origins]); // eslint-disable-line react-hooks/exhaustive-deps

    const rowMap = useMemo(() => new Map(rows.map(r => [key(r.origin_id, r.destination_id), r])), [rows]);
    const savedValue = (o: string, d: string) => fmt(num(rowMap.get(key(o, d))?.[`${mode}_rate_per_kg`]));
    const cellValue = (o: string, d: string) => edits[key(o, d)] ?? savedValue(o, d);
    const savedDays = (d: string) => {
        const ds = [...new Set(rows.filter(r => r.destination_id === d && num(r[`${mode}_rate_per_kg`]) > 0).map(r => num(r[`${mode}_days`])))];
        return ds.length === 1 ? String(ds[0]) : '';
    };
    const mixedDays = (d: string) => new Set(rows.filter(r => r.destination_id === d && num(r[`${mode}_rate_per_kg`]) > 0).map(r => num(r[`${mode}_days`]))).size > 1;

    const setCell = (o: string, d: string, value: string) => {
        const k = key(o, d);
        const clean = value.replace(/[^\d.]/g, '');
        setEdits(e => {
            const next = { ...e };
            if (clean === savedValue(o, d)) delete next[k]; else next[k] = clean;
            return next;
        });
    };

    // Paste a block copied from Excel/Sheets, starting at this cell (rows follow the table as shown)
    const onPaste = (e: React.ClipboardEvent, rowIdx: number, colIdx: number, cities: Location[]) => {
        const text = e.clipboardData.getData('text');
        if (!/[\t\n]/.test(text)) return; // a single value: let the input handle it
        e.preventDefault();
        const lines = text.replace(/\r/g, '').split('\n').filter((l, i, a) => l || i < a.length - 1);
        let count = 0;
        lines.forEach((line, r) => line.split('\t').forEach((v, c) => {
            const city = cities[rowIdx + r], origin = origins[colIdx + c];
            if (!city || !origin) return;
            setCell(origin.id, city.id, v.trim());
            count++;
        }));
        toast.success(`Pasted ${count} price${count === 1 ? '' : 's'}. Review, then save.`);
    };

    // Enter / arrow keys move between cells like a spreadsheet
    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const moves: Record<string, [number, number]> = { Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
        const input = e.currentTarget;
        if (e.key === 'ArrowRight' && input.selectionStart !== input.value.length) return;
        if (e.key === 'ArrowLeft' && input.selectionStart !== 0) return;
        const step = moves[e.key] || (e.key === 'ArrowRight' ? [0, 1] : e.key === 'ArrowLeft' ? [0, -1] : null);
        if (!step) return;
        e.preventDefault();
        const r = Number(input.dataset.r) + step[0], c = Number(input.dataset.c) + step[1];
        table.current?.querySelector<HTMLInputElement>(`input[data-r="${r}"][data-c="${c}"]`)?.focus();
    };

    const discard = () => { setEdits({}); setDayEdits({}); setRule(savedRule); };

    const save = async () => {
        // A new rule changes how every price in this mode is read, so every priced cell is saved with it
        const cellKeys = new Set(Object.keys(edits));
        if (ruleChanged) rows.filter(r => num(r[`${mode}_rate_per_kg`]) > 0).forEach(r => cellKeys.add(key(r.origin_id, r.destination_id)));
        const cells = [...cellKeys].map(k => {
            const [origin_id, destination_id] = k.split('|');
            const v = edits[k] ?? savedValue(origin_id, destination_id);
            return { origin_id, destination_id, amount: v === '' ? null : Number(v) };
        });
        const days = Object.fromEntries(Object.entries(dayEdits).filter(([, v]) => v !== '').map(([d, v]) => [d, Number(v)]));
        setSaving(true);
        try {
            const res = await api.post('/locations/rates/grid', { mode, rule, cells, days });
            const fresh = await load();
            setEdits({}); setDayEdits({}); setRule(inferRule(fresh, mode));
            toast.success(res.data.message);
        } catch (err) {
            toast.error(errMsg(err, 'Could not save the prices'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader label="Loading prices…" />;

    const allCities = locations.filter(l => l.type === 'destination_city');
    const shownCities = destGroups.flatMap(g => g.cities); // on-screen order, for keyboard moves and pasting
    const pricedRoutes = rows.filter(r => num(r[`${mode}_rate_per_kg`]) > 0).length;
    const unpricedCities = allCities.filter(c => !rows.some(r => r.destination_id === c.id && num(r[`${mode}_rate_per_kg`]) > 0)).length;
    const custom = rows.filter(r => !followsRule(r, mode, savedRule)).length;
    const modeLabel = MODES.find(m => m.value === mode)!.label.toLowerCase();

    if (!origins.length || !allCities.length) {
        return <Panel><EmptyState icon={Info} title="Add your locations first" text="Add pickup points and destination cities on the Locations tab, then price them here." action={<Link href="/ops/pricing?tab=locations" className="btn btn-primary">Locations</Link>} /></Panel>;
    }

    return (
        <>
            <ConfirmDialog
                open={!!pendingMode}
                title="Discard unsaved changes?"
                message={<>You have prices on the <strong>{modeLabel}</strong> table that aren’t saved. Switching to {MODES.find(m => m.value === pendingMode)?.label.toLowerCase()} will discard them.</>}
                confirmLabel="Discard and switch"
                cancelLabel="Keep editing"
                danger
                onConfirm={() => pendingMode && applyMode(pendingMode)}
                onClose={() => setPendingMode(null)}
            />
            <StatGrid cols={3}>
                <Stat icon={MODES.find(m => m.value === mode)!.icon} label={`Priced ${modeLabel} routes`} value={pricedRoutes} tone="brand" />
                <Stat icon={Info} label={`Cities with no ${modeLabel} price`} value={unpricedCities} tone={unpricedCities ? 'warning' : 'success'} hint="Customers are asked to request a quote" />
                <Stat icon={Tag} label="Categories" value={categories.filter(c => !!c.is_active).length} hint={<Link href="/ops/categories">Adjust prices by category</Link>} />
            </StatGrid>

            <div className="opt-bar">
                <Segmented value={mode} onChange={switchMode} options={MODES.map(m => ({
                    value: m.value,
                    label: <><m.icon size={14} /> {m.label}</>,
                    count: rows.filter(r => num(r[`${m.value}_rate_per_kg`]) > 0).length,
                }))} />
                <label className="opt-search">
                    <Search size={16} />
                    <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a city or country…" aria-label="Find a city" />
                </label>
            </div>

            <div className="opt-rule">
                <span>Each price is</span>
                <select className="input" value={rule.type} disabled={!canEdit} onChange={e => setRule({ ...rule, type: e.target.value as 'upto' | 'per_kg' })} aria-label="How prices work">
                    <option value="upto">a flat price for the first</option>
                    <option value="per_kg">a price per kg</option>
                </select>
                {rule.type === 'upto' && <>
                    <input className="input" type="number" min={1} max={1000} value={rule.upto} disabled={!canEdit}
                        onChange={e => setRule({ ...rule, upto: Math.max(1, Number(e.target.value) || 1) })} aria-label="Kilograms covered" />
                    <span>kg, then the same rate for each extra kg.</span>
                </>}
                <span className="opt-example">
                    {rule.type === 'upto'
                        ? <>e.g. <b>$10</b> → {rule.upto} kg costs $10, {rule.upto * 2} kg costs ${20}</>
                        : <>e.g. <b>$2</b> → 10 kg costs $20</>}
                </span>
            </div>
            {ruleChanged && <p className="opt-warn">Changing this changes what every {modeLabel} price means. All priced {modeLabel} routes will be saved with the new rule.</p>}

            <Panel flush>
                <div className="opt-scroll">
                    <table className="opt-table" ref={table}>
                        <thead>
                            <tr>
                                <th rowSpan={2} className="opt-sticky opt-corner">Deliver to ↓ &nbsp;·&nbsp; Pick up from →</th>
                                <th rowSpan={2} className="opt-days-h" title="Transit time for this destination">Days</th>
                                {originCountries.map(c => <th key={c.name} colSpan={c.span} className="opt-group-h">{c.name}</th>)}
                            </tr>
                            <tr>{origins.map(o => <th key={o.id} className="opt-origin-h">{o.name}</th>)}</tr>
                        </thead>
                        {destGroups.map(({ country, cities }) => (
                            <tbody key={country.id}>
                                <tr className="opt-country-row"><th colSpan={origins.length + 2} className="opt-sticky">{country.name} <small>{cities.length} {cities.length === 1 ? 'city' : 'cities'}</small></th></tr>
                                {cities.map(city => {
                                    const rowIndex = shownCities.indexOf(city);
                                    const days = dayEdits[city.id] ?? savedDays(city.id);
                                    return (
                                        <tr key={city.id}>
                                            <th className="opt-sticky opt-city">{city.name}{!city.is_active && <small> (hidden)</small>}</th>
                                            <td className={`opt-days${dayEdits[city.id] !== undefined ? ' dirty' : ''}`}>
                                                <input inputMode="numeric" value={days} disabled={!canEdit} placeholder={mixedDays(city.id) ? 'mixed' : String(DEFAULT_DAYS[mode])}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/\D/g, '');
                                                        setDayEdits(d => { const n = { ...d }; if (v === savedDays(city.id)) delete n[city.id]; else n[city.id] = v; return n; });
                                                    }} aria-label={`${city.name} transit days`} />
                                            </td>
                                            {origins.map((o, ci) => {
                                                const k = key(o.id, city.id);
                                                const row = rowMap.get(k);
                                                const own = row && !followsRule(row, mode, savedRule);
                                                return (
                                                    <td key={o.id} className={`opt-cell${edits[k] !== undefined ? ' dirty' : ''}${own ? ' own' : ''}`}
                                                        title={own ? 'This route has its own pricing (set on the Locations tab). Typing here switches it to the table’s rule.' : `${o.name} → ${city.name}`}>
                                                        <input
                                                            inputMode="decimal"
                                                            value={cellValue(o.id, city.id)}
                                                            placeholder="—"
                                                            disabled={!canEdit}
                                                            data-r={rowIndex}
                                                            data-c={ci}
                                                            onChange={e => setCell(o.id, city.id, e.target.value)}
                                                            onPaste={e => onPaste(e, rowIndex, ci, shownCities)}
                                                            onKeyDown={onKeyDown}
                                                            onFocus={e => e.target.select()}
                                                            aria-label={`${modeLabel} price from ${o.name} to ${city.name}`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        ))}
                    </table>
                </div>
            </Panel>

            <div className="opt-legend">
                <span><i className="opt-swatch empty" /> — no price: customers are asked to request a quote</span>
                <span><i className="opt-swatch dirty" /> changed, not saved yet</span>
                {custom > 0 && <span><i className="opt-swatch own" /> has its own pricing ({custom}), edit on the Locations tab</span>}
                <span><ClipboardPaste size={13} /> Paste a block from Excel into any cell · Enter and arrow keys move between cells</span>
            </div>

            {canEdit && (dirtyCount > 0 || ruleChanged) && (
                <div className="opt-savebar">
                    <span><b>{dirtyCount}</b> unsaved change{dirtyCount === 1 ? '' : 's'}{ruleChanged ? ' · new pricing rule' : ''}</span>
                    <button type="button" className="btn btn-secondary" onClick={discard} disabled={saving}><RotateCcw size={15} /> Discard</button>
                    <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                        {saving ? <div className="spinner" /> : <><Save size={15} /> Save prices</>}
                    </button>
                </div>
            )}

            <CategorySummary categories={categories} />
        </>
    );
}

// How each category changes the table's price (edited on the Categories page)
function CategorySummary({ categories }: { categories: Category[] }) {
    if (!categories.length) return null;
    const modes = (c: Category) => {
        try { const m = typeof c.allowed_modes === 'string' ? JSON.parse(c.allowed_modes) : c.allowed_modes; return Array.isArray(m) && m.length ? m : null; } catch { return null; }
    };
    return (
        <Panel collapsible defaultOpen={false} title="How categories change the price" subtitle="The table price × the category’s multiplier, plus its handling fee per piece" icon={Tag}
            actions={<Link href="/ops/categories" className="btn btn-secondary btn-sm">Edit categories</Link>}>
            <div className="opt-cats">
                {categories.map(c => {
                    const mult = 1 + num(c.price_adjustment_pct) / 100;
                    const fee = num(c.handling_fee);
                    const m = modes(c);
                    return (
                        <div key={c.id} className={`opt-cat${c.is_active ? '' : ' off'}`}>
                            <span className="opt-cat-icon">{c.icon || '📦'}</span>
                            <span className="opt-cat-text">
                                <strong>{c.name}</strong>
                                <small>{m ? `By ${m.join(', ')}` : 'Any transport'}{c.is_active ? '' : ' · disabled'}</small>
                            </span>
                            <span className="opt-cat-price">
                                <b className={mult === 1 ? '' : mult > 1 ? 'up' : 'down'}>×{mult.toFixed(2)}</b>
                                {fee > 0 && <small>+${fee.toFixed(2)}/piece</small>}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}
