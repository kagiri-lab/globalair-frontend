'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calculator, Plane, Ship, Truck, AlertTriangle, Calendar, Weight, Plus, Save, MapPin, Flag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Panel, Field, Segmented, Loader, Drawer, money } from '@/components/ops/ui';
import { useAuth } from '@/lib/auth';
import { inferRule } from './PriceTable';

type Mode = 'air' | 'sea' | 'road';
interface Location { id: string; name: string; type: string; parent_id: string | null }
interface Category { id: string; name: string; icon?: string; is_active: boolean | number }
interface Quote {
    total_price: number; chargeable_weight: number; estimated_days: number;
    breakdown: { key: string; label: string; detail?: string; amount: number }[];
}

// What a customer would pay for a route, category and weight, with the working shown
export default function PriceChecker() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        origin_id: '', destination_id: '', transport_mode: 'air' as Mode, shipment_type: 'standard',
        category_id: '', weight_kg: '10', quantity: '1', length_cm: '', width_cm: '', height_cm: '', declared_value: '',
        is_fragile: false, is_hazardous: false, requires_refrigeration: false,
    });
    const [quote, setQuote] = useState<Quote | null>(null);
    const [problem, setProblem] = useState<{ message: string; noRate?: boolean; modes?: Mode[] } | null>(null);
    const [rates, setRates] = useState<Record<string, unknown>[]>([]);
    const [busy, setBusy] = useState(false);
    const [adding, setAdding] = useState(false);   // the "Add price" slide-over
    const [recheck, setRecheck] = useState(0);     // re-price after a price is added
    const { hasPermission } = useAuth();
    const canPrice = hasPermission('manage_zones');

    useEffect(() => {
        Promise.all([api.get('/locations'), api.get('/admin/categories'), api.get('/locations/rates/all')]).then(([l, c, r]) => {
            const locs: Location[] = l.data.data;
            const cats: Category[] = (c.data.data.categories || []).filter((x: Category) => !!x.is_active);
            const routes: Record<string, unknown>[] = r.data.data;
            setLocations(locs);
            setCategories(cats);
            setRates(routes);
            // Open on a route that has an air price, so the first thing staff see is a real price
            const priced = routes.find(x => Number(x.air_rate_per_kg) > 0);
            setForm(f => ({
                ...f,
                origin_id: String(priced?.origin_id || locs.find(x => x.type === 'origin' && x.parent_id)?.id || ''),
                destination_id: String(priced?.destination_id || locs.find(x => x.type === 'destination_city')?.id || ''),
                category_id: cats.find(x => /general/i.test(x.name))?.id || cats[0]?.id || '',
            }));
        }).finally(() => setLoading(false));
    }, []);

    const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
    const countryOf = (l: Location) => locations.find(c => c.id === l.parent_id)?.name || '';
    const group = (type: string) => {
        const map = new Map<string, Location[]>();
        locations.filter(l => l.type === type && l.parent_id).sort((a, b) => a.name.localeCompare(b.name))
            .forEach(l => map.set(countryOf(l), [...(map.get(countryOf(l)) || []), l]));
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    };

    // Re-price as the form changes
    const formKey = JSON.stringify([form, recheck]);
    useEffect(() => {
        if (!form.origin_id || !form.destination_id || !form.category_id || !(Number(form.weight_kg) > 0)) { setQuote(null); setProblem(null); return; }
        let cancelled = false;
        const t = setTimeout(async () => {
            setBusy(true);
            try {
                const res = await api.post('/shipments/quote', {
                    origin_id: form.origin_id, destination_id: form.destination_id, transport_mode: form.transport_mode, shipment_type: form.shipment_type,
                    items: [{
                        category_id: form.category_id, description: 'Price check', weight_kg: Number(form.weight_kg), quantity: Number(form.quantity) || 1,
                        length_cm: Number(form.length_cm) || undefined, width_cm: Number(form.width_cm) || undefined, height_cm: Number(form.height_cm) || undefined,
                        declared_value: Number(form.declared_value) || undefined,
                        is_fragile: form.is_fragile, is_hazardous: form.is_hazardous, requires_refrigeration: form.requires_refrigeration,
                    }],
                });
                if (!cancelled) { setQuote(res.data.data); setProblem(null); }
            } catch (err) {
                if (!cancelled) {
                    setQuote(null);
                    const d = (err as { response?: { data?: { code?: string; message?: string; available_modes?: Mode[] } } }).response?.data;
                    setProblem({ message: d?.message || 'Couldn’t price this shipment', noRate: d?.code === 'NO_RATE', modes: d?.available_modes });
                }
            } finally {
                if (!cancelled) setBusy(false);
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
    }, [formKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const origins = useMemo(() => group('origin'), [locations]); // eslint-disable-line react-hooks/exhaustive-deps
    // Destinations with a price from the chosen pickup point in the chosen mode
    const priced = useMemo(() => new Set(rates
        .filter(r => r.origin_id === form.origin_id && Number(r[`${form.transport_mode}_rate_per_kg`]) > 0)
        .map(r => String(r.destination_id))), [rates, form.origin_id, form.transport_mode]);
    const destinations = useMemo(() => group('destination_city'), [locations]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return <Loader label="Loading…" />;

    return (
        <div className="opc-layout">
            <Panel title="Shipment" icon={Calculator}>
                <div className="o-stack">
                    <div className="o-form-grid">
                        <Field label="Pick up from">
                            <select className="input" value={form.origin_id} onChange={e => set({ origin_id: e.target.value })}>
                                {origins.map(([country, list]) => <optgroup key={country} label={country}>{list.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>)}
                            </select>
                        </Field>
                        <Field label="Deliver to">
                            <select className="input" value={form.destination_id} onChange={e => set({ destination_id: e.target.value })}>
                                {destinations.map(([country, list]) => <optgroup key={country} label={country}>{list.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}{priced.has(l.id) ? '' : ` (no ${form.transport_mode} price)`}</option>
                                ))}</optgroup>)}
                            </select>
                        </Field>
                    </div>
                    <div className="o-form-grid">
                        <div>
                            <span className="o-field-label">Transport</span>
                            <Segmented value={form.transport_mode} onChange={v => set({ transport_mode: v })} options={[
                                { value: 'air', label: <><Plane size={14} /> Air</> }, { value: 'sea', label: <><Ship size={14} /> Sea</> }, { value: 'road', label: <><Truck size={14} /> Road</> },
                            ]} />
                        </div>
                        <Field label="Service">
                            <select className="input" value={form.shipment_type} onChange={e => set({ shipment_type: e.target.value })}>
                                <option value="standard">Standard</option>
                                <option value="express">Express</option>
                                <option value="overnight">Overnight</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Category">
                        <select className="input" value={form.category_id} onChange={e => set({ category_id: e.target.value })}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
                        </select>
                    </Field>
                    <div className="opc-measures">
                        <Field label="Weight each (kg)"><input type="number" min="0" step="0.1" className="input" value={form.weight_kg} onChange={e => set({ weight_kg: e.target.value })} /></Field>
                        <Field label="Pieces"><input type="number" min="1" className="input" value={form.quantity} onChange={e => set({ quantity: e.target.value })} /></Field>
                        <Field label="L (cm)"><input type="number" min="0" className="input" value={form.length_cm} onChange={e => set({ length_cm: e.target.value })} /></Field>
                        <Field label="W (cm)"><input type="number" min="0" className="input" value={form.width_cm} onChange={e => set({ width_cm: e.target.value })} /></Field>
                        <Field label="H (cm)"><input type="number" min="0" className="input" value={form.height_cm} onChange={e => set({ height_cm: e.target.value })} /></Field>
                    </div>
                    <div className="o-form-grid">
                        <Field label="Declared value (USD)" hint="Only needed for some categories">
                            <input type="number" min="0" className="input" value={form.declared_value} onChange={e => set({ declared_value: e.target.value })} />
                        </Field>
                        <div className="opc-flags">
                            <span className="o-field-label">Handling</span>
                            <div>
                                {([['is_fragile', 'Fragile'], ['is_hazardous', 'Hazardous'], ['requires_refrigeration', 'Cold chain']] as const).map(([k, label]) => (
                                    <label key={k} className={form[k] ? 'on' : ''}><input type="checkbox" checked={form[k]} onChange={e => set({ [k]: e.target.checked })} /> {label}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>

            <Panel title="Price" icon={Calculator}>
                {busy && !quote ? <Loader /> : quote ? (
                    <div className="opc-result">
                        <div className="opc-total">
                            <span>Customer pays</span>
                            <strong>{money(quote.total_price)}</strong>
                        </div>
                        <div className="opc-meta">
                            <span><Weight size={14} /> {quote.chargeable_weight} kg chargeable</span>
                            <span><Calendar size={14} /> about {quote.estimated_days} days</span>
                        </div>
                        <ul className="opc-lines">
                            {quote.breakdown.map(l => (
                                <li key={l.key}><span>{l.label}{l.detail && <small>{l.detail}</small>}</span><b>{money(l.amount)}</b></li>
                            ))}
                        </ul>
                        <p className="o-field-hint">Worked out the same way as the customer’s booking form and the ops booking form.</p>
                        {canPrice && (
                            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setAdding(true)}>
                                <Plus size={14} /> Edit prices for this route
                            </button>
                        )}
                    </div>
                ) : problem ? (
                    <div className="opc-problem">
                        <AlertTriangle size={18} />
                        {problem.noRate ? (
                            <div>
                                <p><b>No {form.transport_mode} price for this route.</b> Customers see “request a quote” here.</p>
                                <p>
                                    {problem.modes?.length
                                        ? <>It is priced for {problem.modes.map((m, i) => (
                                            <span key={m}>{i ? ' and ' : ''}<button type="button" className="opc-link" onClick={() => set({ transport_mode: m })}>{m}</button></span>
                                        ))}. </>
                                        : null}
                                    {!canPrice && <Link href="/ops/pricing">See the price table</Link>}
                                </p>
                                {canPrice && (
                                    <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: '0.6rem' }} onClick={() => setAdding(true)}>
                                        <Plus size={14} /> Add prices for this route
                                    </button>
                                )}
                            </div>
                        ) : <p>{problem.message}</p>}
                    </div>
                ) : (
                    <p className="o-muted">Choose a route, category and weight to see the price.</p>
                )}
            </Panel>

            {adding && (
                <AddPriceDrawer
                    origin={locations.find(l => l.id === form.origin_id)}
                    destination={locations.find(l => l.id === form.destination_id)}
                    mode={form.transport_mode}
                    rates={rates}
                    onClose={() => setAdding(false)}
                    onSaved={async () => {
                        const r = await api.get('/locations/rates/all');
                        setRates(r.data.data);
                        setAdding(false);
                        setRecheck(n => n + 1);
                    }}
                />
            )}
        </div>
    );
}

// ── Add or change this route's prices (air, sea and road) without leaving the checker ──
const MODE_META: { value: Mode; label: string; icon: typeof Plane }[] = [
    { value: 'air', label: 'Air', icon: Plane },
    { value: 'sea', label: 'Sea', icon: Ship },
    { value: 'road', label: 'Road', icon: Truck },
];
const DEFAULT_DAYS: Record<Mode, number> = { air: 7, sea: 30, road: 14 };
const fmt = (n: number) => (n ? String(Math.round(n * 100) / 100) : '');

function AddPriceDrawer({ origin, destination, mode: focusMode, rates, onClose, onSaved }: {
    origin?: Location; destination?: Location; mode: Mode; rates: Record<string, unknown>[];
    onClose: () => void; onSaved: () => void;
}) {
    const route = rates.find(r => r.origin_id === origin?.id && r.destination_id === destination?.id);
    // Each mode keeps the price table's own rule, so new prices read like every other route
    const rules = useMemo(() => Object.fromEntries(MODE_META.map(m => [m.value, inferRule(rates as never, m.value)])) as Record<Mode, ReturnType<typeof inferRule>>, [rates]);
    // Transit days are per city in the table (shared by all its pickup points)
    const cityDays = useMemo(() => Object.fromEntries(MODE_META.map(m => {
        const ds = [...new Set(rates.filter(r => r.destination_id === destination?.id && Number(r[`${m.value}_rate_per_kg`]) > 0).map(r => Number(r[`${m.value}_days`])))];
        return [m.value, ds.length === 1 ? ds[0] : null];
    })) as Record<Mode, number | null>, [rates, destination]);
    const saved = Object.fromEntries(MODE_META.map(m => [m.value, fmt(Number(route?.[`${m.value}_rate_per_kg`]) || 0)])) as Record<Mode, string>;

    const [amounts, setAmounts] = useState<Record<Mode, string>>(saved);
    const [days, setDays] = useState<Record<Mode, string>>(() => Object.fromEntries(MODE_META.map(m => [m.value, cityDays[m.value] ? String(cityDays[m.value]) : ''])) as Record<Mode, string>);
    const [saving, setSaving] = useState(false);

    if (!origin || !destination) return null;

    const changedModes = MODE_META.map(m => m.value).filter(m =>
        amounts[m] !== saved[m] || (amounts[m] && days[m] && Number(days[m]) !== cityDays[m]));

    const save = async () => {
        for (const m of changedModes) {
            const d = Number(days[m]);
            if (days[m] && !(d >= 1 && d <= 365)) { toast.error(`${m[0].toUpperCase() + m.slice(1)}: transit days must be between 1 and 365`); return; }
        }
        if (!changedModes.length) { onClose(); return; }
        setSaving(true);
        try {
            // One save per transport mode (the price table saves a mode at a time)
            for (const m of changedModes) {
                const d = Number(days[m]);
                await api.post('/locations/rates/grid', {
                    mode: m, rule: rules[m],
                    cells: amounts[m] !== saved[m] ? [{ origin_id: origin.id, destination_id: destination.id, amount: amounts[m] === '' ? null : Number(amounts[m]) }] : [],
                    days: amounts[m] && days[m] && d !== cityDays[m] ? { [destination.id]: d } : {},
                });
            }
            toast.success(`Prices saved: ${origin.name} → ${destination.name}`);
            onSaved();
        } catch (err) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not save the prices');
            setSaving(false);
        }
    };

    return (
        <Drawer open width={620} onClose={onClose}
            title={route ? 'Prices for this route' : 'Add prices for this route'}
            subtitle="Saved to the price table. Leave a mode empty if you don’t offer it here; customers can then request a quote."
            footer={<>
                <span className="oap-changes">{changedModes.length ? `${changedModes.length} mode${changedModes.length === 1 ? '' : 's'} changed` : 'No changes yet'}</span>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !changedModes.length}>
                    {saving ? <div className="spinner" /> : <><Save size={15} /> Save prices</>}
                </button>
            </>}>
            <div className="oap">
                <div className="oap-route">
                    <span><MapPin size={14} /> From</span><strong>{origin.name}</strong>
                    <span><Flag size={14} /> To</span><strong>{destination.name}</strong>
                </div>

                {MODE_META.map(({ value: m, label, icon: Icon }) => {
                    const rule = rules[m];
                    const value = Number(amounts[m]) || 0;
                    const changed = amounts[m] !== saved[m];
                    return (
                        <section key={m} className={`oap-mode${value > 0 ? ' on' : ''}${changed ? ' changed' : ''}${m === focusMode ? ' focus' : ''}`}>
                            <header>
                                <span className="oap-mode-icon"><Icon size={18} /></span>
                                <strong>{label}</strong>
                                <small>{saved[m] ? (changed ? (amounts[m] ? 'Changing price' : 'Removing price') : 'Has a price') : changed && amounts[m] ? 'New price' : 'No price'}</small>
                            </header>
                            <div className="oap-mode-fields">
                                <Field label={rule.type === 'upto' ? `Price for the first ${rule.upto} kg (USD)` : 'Price per kg (USD)'}>
                                    <input className="input oap-amount" inputMode="decimal" autoFocus={m === focusMode} value={amounts[m]} placeholder="No price"
                                        onChange={e => setAmounts(a => ({ ...a, [m]: e.target.value.replace(/[^\d.]/g, '') }))}
                                        onKeyDown={e => { if (e.key === 'Enter') save(); }} aria-label={`${label} price`} />
                                </Field>
                                <Field label="Transit (days)">
                                    <input className="input" inputMode="numeric" value={days[m]} placeholder={String(DEFAULT_DAYS[m])} disabled={!value}
                                        onChange={e => setDays(d => ({ ...d, [m]: e.target.value.replace(/\D/g, '') }))} aria-label={`${label} transit days`} />
                                </Field>
                            </div>
                            {value > 0 && (
                                <p className="oap-example">
                                    {rule.type === 'upto'
                                        ? <>Up to {rule.upto} kg <b>{money(value)}</b> · 10 kg <b>{money(value * Math.max(1, 10 / rule.upto))}</b> · 50 kg <b>{money(value * Math.max(1, 50 / rule.upto))}</b></>
                                        : <>10 kg <b>{money(value * 10)}</b> · 50 kg <b>{money(value * 50)}</b></>}
                                    {cityDays[m] && days[m] && Number(days[m]) !== cityDays[m] && <span className="oap-note"> · new days apply to every pickup point delivering to {destination.name} by {m}</span>}
                                </p>
                            )}
                        </section>
                    );
                })}
                <p className="o-field-hint">Examples are before the minimum charge, category, service level and handling.</p>
            </div>
        </Drawer>
    );
}
