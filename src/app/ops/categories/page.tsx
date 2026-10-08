'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    Tag, Plus, Trash2, ShieldCheck, Layers, DollarSign, Plane, Ship, Truck, Snowflake, AlertTriangle, Wine, Receipt, HardHat, ChevronRight, Eye, EyeOff, X,
    ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
    OpsPage, StatGrid, Stat, Panel, SearchInput, Segmented, Loader, EmptyState, Modal, Field, Drawer, Pager,
} from '@/components/ops/ui';

const ICONS = ['📦', '📱', '💻', '👗', '👟', '📄', '🥦', '🍎', '🛋️', '📚', '🔧', '🚗', '💊', '🩺', '⚙️', '🧴', '🎮', '🌿', '💎', '🧪', '🏗️', '🖨️', '🎁', '🧊'];

const MODES = [
    { value: 'air', label: 'Air', icon: Plane },
    { value: 'sea', label: 'Sea', icon: Ship },
    { value: 'road', label: 'Road', icon: Truck },
] as const;

const emptyForm = {
    name: '', description: '', icon: '📦', min_weight_kg: '0.1', max_weight_kg: '',
    price_adjustment_pct: '0', handling_fee: '0', allowed_modes: ['air', 'sea', 'road'] as string[],
    default_fragile: false, default_hazardous: false, default_refrigeration: false, requires_declared_value: false,
    requires_special_handling: false, is_active: true,
};
type Form = typeof emptyForm & { id?: string };

const parseModes = (v: unknown): string[] | null => {
    try { const list = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(list) && list.length ? list : null; } catch { return null; }
};
const num = (v: unknown) => Number(v) || 0;
const money = (n: number) => `$${n.toFixed(2)}`;
const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const PAGE_SIZE = 25;

// The table price × this, e.g. 20% → ×1.20
const multiplier = (pct: unknown) => 1 + num(pct) / 100;

export default function AdminCategoriesPage() {
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage_categories');
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [mode, setMode] = useState('');          // only categories that can go by this transport
    const [handling, setHandling] = useState('');  // only categories with this rule
    const [pricing, setPricing] = useState('');    // adjusted | table
    const [sort, setSort] = useState<'name' | 'price' | 'weight' | 'updated'>('name');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);
    const [form, setForm] = useState<Form | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toggling, setToggling] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const load = () => api.get('/admin/categories')
        .then(r => setCategories(r.data.data.categories))
        .catch(() => toast.error('Could not load categories'))
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const openAdd = () => setForm({ ...emptyForm });
    const openEdit = (cat: any) => setForm({
        ...emptyForm,
        id: cat.id, name: cat.name, description: cat.description ?? '', icon: cat.icon || '📦',
        min_weight_kg: cat.min_weight_kg ?? '', max_weight_kg: cat.max_weight_kg ?? '',
        price_adjustment_pct: String(num(cat.price_adjustment_pct)), handling_fee: String(num(cat.handling_fee)),
        allowed_modes: parseModes(cat.allowed_modes) || ['air', 'sea', 'road'],
        default_fragile: !!cat.default_fragile, default_hazardous: !!cat.default_hazardous, default_refrigeration: !!cat.default_refrigeration,
        requires_declared_value: !!cat.requires_declared_value, requires_special_handling: !!cat.requires_special_handling, is_active: !!cat.is_active,
    });

    const save = async () => {
        if (!form) return;
        if (!form.name.trim()) { toast.error('Give the category a name'); return; }
        if (!form.allowed_modes.length) { toast.error('Allow at least one transport mode'); return; }
        const min = form.min_weight_kg === '' ? null : Number(form.min_weight_kg);
        const max = form.max_weight_kg === '' ? null : Number(form.max_weight_kg);
        if (min !== null && max !== null && max < min) { toast.error('The maximum weight is below the minimum'); return; }
        setProcessing(true);
        const { id, ...rest } = form;
        const payload = {
            ...rest,
            name: form.name.trim(),
            price_adjustment_pct: num(form.price_adjustment_pct),
            handling_fee: num(form.handling_fee),
            min_weight_kg: min,
            max_weight_kg: max,
        };
        try {
            if (id) await api.patch(`/admin/categories/${id}`, payload);
            else await api.post('/admin/categories', payload);
            toast.success(id ? `${payload.name} saved` : `${payload.name} created`);
            setForm(null);
            load();
        } catch (err) {
            toast.error(errMsg(err, 'Could not save the category'));
        } finally {
            setProcessing(false);
        }
    };

    // Quick switch on the card
    const toggleActive = async (cat: any) => {
        setToggling(cat.id);
        try {
            await api.patch(`/admin/categories/${cat.id}`, { is_active: !cat.is_active });
            setCategories(cs => cs.map(c => (c.id === cat.id ? { ...c, is_active: !cat.is_active } : c)));
            toast.success(`${cat.name} ${cat.is_active ? 'hidden from customers' : 'available to customers'}`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not update'));
        } finally {
            setToggling('');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/admin/categories/${deleteTarget.id}`);
            toast.success('Category deleted');
            setSelected(sel => { const n = new Set(sel); n.delete(deleteTarget.id); return n; });
            setDeleteTarget(null);
            setForm(null);
            load();
        } catch (err) {
            toast.error(errMsg(err, 'Delete failed'));
        } finally {
            setDeleting(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const has = (c: any, rule: string) => rule === 'value' ? !!c.requires_declared_value : rule === 'special' ? !!c.requires_special_handling : !!c[`default_${rule}`];
        const list = categories
            .filter(c => filter === 'all' || (filter === 'enabled') === !!c.is_active)
            .filter(c => !mode || (parseModes(c.allowed_modes) || ['air', 'sea', 'road']).includes(mode))
            .filter(c => !handling || has(c, handling))
            .filter(c => !pricing || (pricing === 'adjusted') === !!(num(c.price_adjustment_pct) || num(c.handling_fee)))
            .filter(c => !q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
        const by: Record<typeof sort, (a: any, b: any) => number> = {
            name: (a, b) => a.name.localeCompare(b.name),
            price: (a, b) => multiplier(b.price_adjustment_pct) - multiplier(a.price_adjustment_pct) || num(b.handling_fee) - num(a.handling_fee) || a.name.localeCompare(b.name),
            weight: (a, b) => (b.max_weight_kg == null ? Infinity : num(b.max_weight_kg)) - (a.max_weight_kg == null ? Infinity : num(a.max_weight_kg)) || a.name.localeCompare(b.name),
            updated: (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
        };
        return list.sort(by[sort]);
    }, [categories, search, filter, mode, handling, pricing, sort]);

    // Back to page 1 whenever the list changes shape
    useEffect(() => { setPage(1); }, [search, filter, mode, handling, pricing, sort]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const filtersOn = !!(search || mode || handling || pricing || filter !== 'all');
    const clearFilters = () => { setSearch(''); setMode(''); setHandling(''); setPricing(''); setFilter('all'); };

    // Selection for bulk enable / disable
    const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const allShownSelected = shown.length > 0 && shown.every(c => selected.has(c.id));
    const selectShown = () => setSelected(s => { const n = new Set(s); shown.forEach(c => (allShownSelected ? n.delete(c.id) : n.add(c.id))); return n; });
    const bulkSet = async (active: boolean) => {
        const ids = [...selected].filter(id => !!categories.find(c => c.id === id)?.is_active !== active);
        if (!ids.length) { toast.success(`Already ${active ? 'available' : 'hidden'}`); return; }
        setBulkBusy(true);
        const results = await Promise.allSettled(ids.map(id => api.patch(`/admin/categories/${id}`, { is_active: active })));
        const ok = ids.filter((_, i) => results[i].status === 'fulfilled');
        setCategories(cs => cs.map(c => (ok.includes(c.id) ? { ...c, is_active: active } : c)));
        setBulkBusy(false);
        setSelected(new Set());
        if (ok.length < ids.length) toast.error(`${ids.length - ok.length} couldn’t be updated`);
        if (ok.length) toast.success(`${ok.length} categor${ok.length === 1 ? 'y' : 'ies'} ${active ? 'now available to customers' : 'hidden from customers'}`);
    };

    const enabled = categories.filter(c => !!c.is_active).length;
    const adjusted = categories.filter(c => num(c.price_adjustment_pct) || num(c.handling_fee)).length;

    return (
        <OpsPage
            narrow={false}
            title="Categories"
            subtitle="What customers can ship, and the rules each type brings: price, weight limits, transport and handling."
            actions={<>
                <Link href="/ops/pricing" className="btn btn-secondary"><DollarSign size={16} /> Price table</Link>
                {canManage && <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New category</button>}
            </>}
        >
            <StatGrid cols={3}>
                <Stat icon={Layers} label="Categories" value={categories.length} tone="brand" />
                <Stat icon={ShieldCheck} label="Available to customers" value={enabled} tone="success" onClick={() => setFilter(f => (f === 'enabled' ? 'all' : 'enabled'))} active={filter === 'enabled'} />
                <Stat icon={DollarSign} label="Priced differently" value={adjusted} tone="warning" hint="Multiplier or handling fee" />
            </StatGrid>

            <div className="ocg-bar">
                <SearchInput value={search} onChange={setSearch} placeholder={`Search ${categories.length} categories…`} />
                <Segmented value={filter} onChange={setFilter} options={[
                    { value: 'all', label: 'All', count: categories.length },
                    { value: 'enabled', label: 'Available', count: enabled },
                    { value: 'disabled', label: 'Hidden', count: categories.length - enabled },
                ]} />
            </div>
            <div className="ocg-filters">
                <select className="input" value={mode} onChange={e => setMode(e.target.value)} aria-label="Transport">
                    <option value="">Any transport</option>
                    {MODES.map(m => <option key={m.value} value={m.value}>Can go by {m.label.toLowerCase()}</option>)}
                </select>
                <select className="input" value={handling} onChange={e => setHandling(e.target.value)} aria-label="Handling">
                    <option value="">Any handling</option>
                    <option value="fragile">Fragile</option>
                    <option value="hazardous">Hazardous</option>
                    <option value="refrigeration">Cold chain</option>
                    <option value="value">Declared value required</option>
                    <option value="special">Special handling</option>
                </select>
                <select className="input" value={pricing} onChange={e => setPricing(e.target.value)} aria-label="Pricing">
                    <option value="">Any price</option>
                    <option value="adjusted">Priced differently</option>
                    <option value="table">Table price</option>
                </select>
                <label className="ocg-sort">
                    <ArrowUpDown size={14} />
                    <select className="input" value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label="Sort by">
                        <option value="name">Name A–Z</option>
                        <option value="price">Highest price first</option>
                        <option value="weight">Heaviest allowed first</option>
                        <option value="updated">Recently changed</option>
                    </select>
                </label>
                {filtersOn && <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}><X size={13} /> Clear</button>}
                <span className="ocg-count">{filtered.length} of {categories.length}</span>
            </div>

            {canManage && selected.size > 0 && (
                <div className="ocg-bulk">
                    <span><b>{selected.size}</b> selected</span>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSet(true)}><Eye size={14} /> Make available</button>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSet(false)}><EyeOff size={14} /> Hide</button>
                    <button type="button" className="ocg-bulk-clear" onClick={() => setSelected(new Set())}>Clear selection</button>
                </div>
            )}

            <Panel flush>
                {loading ? <Loader label="Loading categories…" /> : filtered.length === 0 ? (
                    <EmptyState icon={Tag} title={filtersOn ? 'No categories match' : 'No categories yet'}
                        text={filtersOn ? 'Try fewer filters.' : 'Add the kinds of cargo customers can ship.'}
                        action={filtersOn
                            ? <button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
                            : canManage && <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New category</button>} />
                ) : (
                    <div className="ocl" role="table" aria-label="Categories">
                        <div className="ocl-row ocl-head" role="row">
                            <span role="columnheader">{canManage && <input type="checkbox" checked={allShownSelected} onChange={selectShown} aria-label="Select all on this page" />}</span>
                            <span role="columnheader">Category</span>
                            <span role="columnheader">Price</span>
                            <span role="columnheader" className="ocl-hide-md">Transport</span>
                            <span role="columnheader" className="ocl-hide-md">Weight per piece</span>
                            <span role="columnheader" className="ocl-hide-lg">Handling</span>
                            <span role="columnheader">Available</span>
                            <span />
                        </div>
                        {shown.map(cat => {
                            const modes = parseModes(cat.allowed_modes) || ['air', 'sea', 'road'];
                            const x = multiplier(cat.price_adjustment_pct);
                            const fee = num(cat.handling_fee);
                            const tags = [
                                cat.default_refrigeration && { icon: Snowflake, label: 'Cold chain', tone: 'info' },
                                cat.default_hazardous && { icon: AlertTriangle, label: 'Hazardous', tone: 'danger' },
                                cat.default_fragile && { icon: Wine, label: 'Fragile', tone: 'warning' },
                                cat.requires_declared_value && { icon: Receipt, label: 'Value', tone: 'neutral' },
                                cat.requires_special_handling && { icon: HardHat, label: 'Special', tone: 'neutral' },
                            ].filter(Boolean) as { icon: typeof Snowflake; label: string; tone: string }[];
                            return (
                                <div key={cat.id} role="row" className={`ocl-row${cat.is_active ? '' : ' off'}${selected.has(cat.id) ? ' selected' : ''}`}
                                    onClick={() => (canManage ? openEdit(cat) : undefined)} tabIndex={canManage ? 0 : -1}
                                    onKeyDown={e => { if (canManage && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); openEdit(cat); } }}>
                                    <span role="cell" onClick={e => e.stopPropagation()}>
                                        {canManage && <input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggleSelect(cat.id)} aria-label={`Select ${cat.name}`} />}
                                    </span>
                                    <span role="cell" className="ocl-name">
                                        <span className="ocl-icon" aria-hidden="true">{cat.icon || '📦'}</span>
                                        <span>
                                            <strong>{cat.name}</strong>
                                            <small>{cat.description || 'No description'}</small>
                                        </span>
                                    </span>
                                    <span role="cell" className="ocl-price">
                                        <b className={x === 1 ? '' : x > 1 ? 'up' : 'down'}>×{x.toFixed(2)}</b>
                                        {fee > 0 && <small>+${fee.toFixed(2)}/piece</small>}
                                    </span>
                                    <span role="cell" className="ocl-hide-md ocg-modes" aria-label={`Transport: ${modes.join(', ')}`}>
                                        {MODES.map(m => <m.icon key={m.value} size={15} className={modes.includes(m.value) ? 'on' : ''} aria-hidden="true" />)}
                                    </span>
                                    <span role="cell" className="ocl-hide-md ocl-weight">
                                        {cat.max_weight_kg ? `${num(cat.min_weight_kg)}–${num(cat.max_weight_kg)} kg` : `${num(cat.min_weight_kg)} kg +`}
                                    </span>
                                    <span role="cell" className="ocl-hide-lg ocl-tags">
                                        {tags.length ? tags.map(t => <span key={t.label} className={`ocg-tag tone-${t.tone}`} title={t.label}><t.icon size={11} /> {t.label}</span>) : <span className="ocl-none">—</span>}
                                    </span>
                                    <span role="cell" onClick={e => e.stopPropagation()}>
                                        <label className="ocg-switch" title={cat.is_active ? 'Available to customers' : 'Hidden from customers'}>
                                            <input type="checkbox" checked={!!cat.is_active} disabled={!canManage || toggling === cat.id} onChange={() => toggleActive(cat)} aria-label={`${cat.name} available to customers`} />
                                            <span />
                                        </label>
                                    </span>
                                    <span role="cell" className="ocl-go">{canManage && <ChevronRight size={16} />}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <Pager page={page} pages={pages} total={filtered.length} noun="categories" onChange={setPage} />
            </Panel>

            {form && (
                <Drawer
                    open
                    width={760}
                    onClose={() => setForm(null)}
                    title={form.id ? `Edit ${form.name || 'category'}` : 'New category'}
                    subtitle="Customers see the icon, name and description when choosing what they’re shipping."
                    footer={<>
                        {form.id && canManage && <button type="button" className="btn btn-secondary ocat-del" style={{ marginRight: 'auto' }} onClick={() => setDeleteTarget(categories.find(c => c.id === form.id))}><Trash2 size={14} /> Delete</button>}
                        <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={save} disabled={processing || !canManage}>
                            {processing ? <div className="spinner" /> : form.id ? 'Save changes' : 'Create category'}
                        </button>
                    </>}
                >
                    <CategoryForm form={form} onChange={patch => setForm(f => (f ? { ...f, ...patch } : f))} />
                </Drawer>
            )}

            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={`Delete ${deleteTarget?.name || 'category'}?`}
                width={440}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? <div className="spinner" /> : 'Delete category'}</button>
                </>}
            >
                <p className="o-muted">This can’t be undone. If shipments already use this category, switch it off instead so it’s hidden from customers.</p>
            </Modal>
        </OpsPage>
    );
}

// ── The drawer's form ────────────────────────────────────────────────────────
function CategoryForm({ form, onChange: set }: { form: Form; onChange: (patch: Partial<Form>) => void }) {
    const x = multiplier(form.price_adjustment_pct);
    const fee = num(form.handling_fee);
    const toggle = (key: 'default_fragile' | 'default_hazardous' | 'default_refrigeration') => set({ [key]: !form[key] } as Partial<Form>);

    return (
        <div className="ocf">
            <section className="ocf-section">
                <h3>About</h3>
                <div className="ocf-icons" role="radiogroup" aria-label="Icon">
                    {ICONS.map(i => (
                        <button key={i} type="button" role="radio" aria-checked={form.icon === i} className={form.icon === i ? 'on' : ''} onClick={() => set({ icon: i })}>{i}</button>
                    ))}
                </div>
                <Field label="Name">
                    <input className="input" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Electronics" autoFocus />
                </Field>
                <Field label="Description" hint="Helps customers pick the right one">
                    <textarea className="input" rows={2} value={form.description ?? ''} onChange={e => set({ description: e.target.value })} placeholder="Phones, laptops, tablets and other electronic devices" />
                </Field>
                <label className="ocf-switch-row">
                    <span><b>Available to customers</b><small>Turn off to hide it from the booking form without deleting it</small></span>
                    <span className="ocg-switch"><input type="checkbox" checked={form.is_active} onChange={e => set({ is_active: e.target.checked })} /><span /></span>
                </label>
            </section>

            <section className="ocf-section">
                <h3>Price</h3>
                <div className="o-form-grid">
                    <Field label="Price adjustment (%)" hint={`Table price ×${x.toFixed(2)}`}>
                        <input type="number" min="-90" max="500" step="1" className="input" value={form.price_adjustment_pct} onChange={e => set({ price_adjustment_pct: e.target.value })} />
                    </Field>
                    <Field label="Handling fee per piece (USD)" hint="Added for every piece">
                        <input type="number" min="0" step="0.01" className="input" value={form.handling_fee} onChange={e => set({ handling_fee: e.target.value })} />
                    </Field>
                </div>
                <div className="ocf-example">
                    <span>Example</span>
                    <p>If the price table says <b>$100</b>, 2 pieces of {form.name || 'this cargo'} cost <b>{money(100 * x + fee * 2)}</b>
                        {(x !== 1 || fee > 0) && <small> ($100{x !== 1 ? ` × ${x.toFixed(2)}` : ''}{fee > 0 ? ` + 2 × ${money(fee)}` : ''})</small>}
                        , before handling surcharges and service level.</p>
                </div>
            </section>

            <section className="ocf-section">
                <h3>Rules</h3>
                <div>
                    <span className="o-field-label">Can be shipped by</span>
                    <div className="ocf-modes">
                        {MODES.map(m => {
                            const on = form.allowed_modes.includes(m.value);
                            return (
                                <button key={m.value} type="button" aria-pressed={on} className={on ? 'on' : ''}
                                    onClick={() => set({ allowed_modes: on ? form.allowed_modes.filter(x => x !== m.value) : [...form.allowed_modes, m.value] })}>
                                    <m.icon size={18} /> {m.label}
                                </button>
                            );
                        })}
                    </div>
                    <span className="o-field-hint">Customers can only choose these for this cargo.</span>
                </div>
                <div className="o-form-grid">
                    <Field label="Min weight per piece (kg)">
                        <input type="number" min="0" step="0.1" className="input" value={form.min_weight_kg ?? ''} onChange={e => set({ min_weight_kg: e.target.value })} />
                    </Field>
                    <Field label="Max weight per piece (kg)" hint="Empty = no limit">
                        <input type="number" min="0" step="0.1" className="input" value={form.max_weight_kg ?? ''} onChange={e => set({ max_weight_kg: e.target.value })} />
                    </Field>
                </div>
            </section>

            <section className="ocf-section">
                <h3>Handling</h3>
                <span className="o-field-hint">Ticked for the customer automatically when they pick this category, and the surcharge from Settings is added.</span>
                <div className="ocf-handling">
                    {([
                        ['default_fragile', Wine, 'Fragile'],
                        ['default_hazardous', AlertTriangle, 'Hazardous'],
                        ['default_refrigeration', Snowflake, 'Cold chain'],
                    ] as const).map(([k, Icon, label]) => (
                        <button key={k} type="button" aria-pressed={form[k]} className={form[k] ? 'on' : ''} onClick={() => toggle(k)}><Icon size={16} /> {label}</button>
                    ))}
                </div>
                <label className="ocf-switch-row">
                    <span><b>Declared value required</b><small>Customers must enter what each item is worth</small></span>
                    <span className="ocg-switch"><input type="checkbox" checked={form.requires_declared_value} onChange={e => set({ requires_declared_value: e.target.checked })} /><span /></span>
                </label>
                <label className="ocf-switch-row">
                    <span><b>Special handling</b><small>Flags these shipments for the operations team</small></span>
                    <span className="ocg-switch"><input type="checkbox" checked={form.requires_special_handling} onChange={e => set({ requires_special_handling: e.target.checked })} /><span /></span>
                </label>
            </section>
        </div>
    );
}
