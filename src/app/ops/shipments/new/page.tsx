'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, User, MapPin, Flag, Plus, Trash2, CheckCircle2, Plane, Ship, Truck, Calculator, X, FileText, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { OpsPage, Panel, Field, SearchInput, Avatar, Loader, money } from '@/components/ops/ui';

const same = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const MODE_FROM_LABEL: Record<string, string> = { 'Air freight': 'air', 'Sea freight': 'sea', 'Road freight': 'road' };

// A quote being converted: a portal quote ticket or a website quote enquiry
type QuoteSource = {
    ref: string; subject: string; details: Record<string, any>;
    back: { href: string; label: string }; payload: { quote_ticket_id?: string; enquiry_id?: string };
};

type Item = {
    category_id: string; description: string; weight_kg: number; quantity: number; length_cm?: number; width_cm?: number; height_cm?: number;
    declared_value?: number; is_fragile?: boolean; is_hazardous?: boolean; requires_refrigeration?: boolean;
};

const EMPTY_ITEM: Item = { category_id: '', description: '', weight_kg: 1, quantity: 1 };

const MODES = [
    { value: 'air', label: 'Air', icon: Plane },
    { value: 'sea', label: 'Sea', icon: Ship },
    { value: 'road', label: 'Road', icon: Truck },
];

export default function NewShipmentPage() {
    return <Suspense fallback={<Loader />}><NewShipmentForm /></Suspense>;
}

function NewShipmentForm() {
    const router = useRouter();
    const params = useSearchParams();
    const quoteId = params.get('quote');
    const enquiryId = params.get('enquiry');
    // Converting a quote request from the support hub
    const [source, setSource] = useState<QuoteSource | null>(null);
    const [prefilled, setPrefilled] = useState(false);
    const [agreedPrice, setAgreedPrice] = useState('');
    const [agreedDays, setAgreedDays] = useState('');
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [locations, setLocations] = useState<any>({ originCountries: [], originCities: [], destCountries: [], destCities: [] });
    const [originCountry, setOriginCountry] = useState('');
    const [destCountry, setDestCountry] = useState('');

    // Customer search
    const [searchUser, setSearchUser] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [customer, setCustomer] = useState<any>(null);

    const [form, setForm] = useState({
        origin_id: '', destination_id: '', shipment_type: 'standard', transport_mode: 'air',
        pickup_address: '', pickup_city: '', pickup_country: '', pickup_contact_name: '', pickup_contact_phone: '',
        destination_address: '', destination_city: '', destination_country: '', destination_contact_name: '', destination_contact_phone: '',
        notes: '',
    });
    const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
    const [quote, setQuote] = useState<any>(null);
    const [quoting, setQuoting] = useState(false);
    const [quoteProblem, setQuoteProblem] = useState<{ code?: string; message: string; contact?: boolean } | null>(null);
    // destination_id → { origin_id: ['air', 'road'] } — only priced modes can be booked
    const [routeModes, setRouteModes] = useState<Record<string, Record<string, string[]>>>({});

    const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

    useEffect(() => {
        api.get('/admin/categories').then(res => setCategories(res.data.data.categories)).catch(() => { });
        api.get('/locations/hierarchy').then(res => {
            const map: Record<string, Record<string, string[]>> = {};
            for (const country of res.data.data.destinations) for (const city of country.cities) map[city.id] = city.routes || {};
            setRouteModes(map);
        }).catch(() => { });
        api.get('/admin/locations').then(res => {
            const all = res.data.data;
            setLocations({
                originCountries: all.filter((l: any) => l.type === 'origin_country' || (l.type === 'origin' && !l.parent_id)),
                originCities: all.filter((l: any) => l.type === 'origin' && l.parent_id),
                destCountries: all.filter((l: any) => l.type === 'destination_country'),
                destCities: all.filter((l: any) => l.type === 'destination_city' && l.parent_id),
            });
        }).catch(() => { });
    }, []);

    // Load the quote being converted, and its customer
    useEffect(() => {
        if (quoteId) {
            api.get(`/admin/support/tickets/${quoteId}`).then(res => {
                const t = res.data.data.ticket;
                if (t.shipment) { toast.error('This quote was already converted'); router.replace(`/ops/shipments/${t.shipment.id}`); return; }
                const ref = `quote #${t.id.slice(0, 8).toUpperCase()}`;
                setSource({ ref, subject: t.subject, details: t.quote_details || {}, back: { href: `/ops/support/${t.id}`, label: 'Back to quote request' }, payload: { quote_ticket_id: t.id } });
                if (t.user_id) api.get(`/admin/users/${t.user_id}`).then(r => r.data.data?.user && setCustomer(r.data.data.user)).catch(() => { });
            }).catch(() => toast.error('Couldn’t load the quote request'));
        } else if (enquiryId) {
            api.get(`/admin/enquiries/${enquiryId}`).then(res => {
                const e = res.data.data;
                if (e.shipment_id) { toast.error('This enquiry was already converted'); router.replace(`/ops/shipments/${e.shipment_id}`); return; }
                setSource({
                    ref: 'website quote', subject: e.subject || `Quote request from ${e.name}`,
                    details: { ...(e.details || {}), phone: e.phone },
                    back: { href: `/ops/support?c=e_${e.id}`, label: 'Back to the conversation' }, payload: { enquiry_id: e.id },
                });
                // Their portal account if they have one; otherwise start the search with their email
                if (e.account) setCustomer(e.account); else setSearchUser(e.email);
            }).catch(() => toast.error('Couldn’t load the enquiry'));
        }
    }, [quoteId, enquiryId, router]);

    // Once locations are in, fill the form from the quote: booking-form selections when we have them, else match by name
    useEffect(() => {
        const q = source?.details;
        if (!q || prefilled || !locations.originCountries.length || !categories.length) return;
        const b = q.booking || {};
        const oCountry = locations.originCountries.find((l: any) => l.id === b.origin_country_id || same(l.name, q.pickup_region));
        const oCity = locations.originCities.find((l: any) => l.parent_id === oCountry?.id && (l.id === b.origin_id || same(l.name, q.pickup_city)));
        const dCountry = locations.destCountries.find((l: any) => l.id === b.destination_country_id || same(l.name, q.dropoff_region));
        const dCity = locations.destCities.find((l: any) => l.parent_id === dCountry?.id && (l.id === b.destination_id || same(l.name, q.dropoff_city)));
        setOriginCountry(oCountry?.id || '');
        setDestCountry(dCountry?.id || '');
        setForm(f => ({
            ...f,
            origin_id: oCity?.id || '', pickup_city: oCity?.name || '', pickup_country: oCountry?.name || '',
            destination_id: dCity?.id || '', destination_city: dCity?.name || '', destination_country: dCountry?.name || '',
            pickup_address: q.pickup_address || '', destination_address: q.dropoff_address || '',
            pickup_contact_phone: f.pickup_contact_phone || q.phone || '',
            transport_mode: q.offer?.transport_mode || b.transport_mode || MODE_FROM_LABEL[q.transport_mode] || f.transport_mode,
            shipment_type: b.shipment_type || f.shipment_type,
            notes: [`Converted from ${source.ref}`, q.items && `Items: ${q.items}`].filter(Boolean).join('\n'),
        }));
        const known = (b.items || []).filter((i: any) => categories.some(c => c.id === i.category_id));
        setItems(known.length ? known.map((i: any) => ({ ...EMPTY_ITEM, ...i })) : [{ ...EMPTY_ITEM, description: q.commodity || '', weight_kg: parseFloat(q.weight) || 1 }]);
        // A price already agreed with the customer in the ticket
        if (q.offer?.amount) { setAgreedPrice(String(q.offer.amount)); if (q.offer.days) setAgreedDays(String(q.offer.days)); }
        setPrefilled(true);
    }, [source, prefilled, locations, categories]);

    // Debounced customer search
    useEffect(() => {
        if (searchUser.trim().length < 2) return;
        const t = setTimeout(() => {
            setSearching(true);
            api.get(`/admin/users?search=${encodeURIComponent(searchUser.trim())}&limit=8`)
                .then(res => setUsers(res.data.data.users))
                .catch(() => { })
                .finally(() => setSearching(false));
        }, 400);
        return () => clearTimeout(t);
    }, [searchUser]);

    // Live estimate whenever route, mode or items change
    const quotable = form.origin_id && form.destination_id && items.length > 0 && items.every(i => i.category_id && i.weight_kg > 0);
    const quoteKey = quotable ? JSON.stringify([form.origin_id, form.destination_id, form.transport_mode, form.shipment_type, items]) : '';
    useEffect(() => {
        if (!quoteKey) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            setQuoting(true);
            try {
                const [origin_id, destination_id, transport_mode, shipment_type, its] = JSON.parse(quoteKey);
                const res = await api.post('/shipments/quote', { origin_id, destination_id, transport_mode, shipment_type, items: its });
                if (!cancelled) { setQuote(res.data.data); setQuoteProblem(null); }
            } catch (err: any) {
                if (!cancelled) {
                    setQuote(null);
                    const d = err.response?.data;
                    setQuoteProblem({ code: d?.code, message: d?.message || 'Couldn’t price this shipment', contact: d?.contact });
                }
            } finally {
                if (!cancelled) setQuoting(false);
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); };
    }, [quoteKey]);
    const shownQuote = quoteKey ? quote : null;
    const shownProblem = quoteKey ? quoteProblem : null;

    // Priced modes from the chosen origin, narrowed by what the items' categories allow
    const pricedModes = form.origin_id && form.destination_id ? (routeModes[form.destination_id]?.[form.origin_id] || []) : null;
    const allowedModes = items.reduce<string[] | null>((acc, it) => {
        const allowed = categories.find(c => c.id === it.category_id)?.allowed_modes;
        const list = typeof allowed === 'string' ? JSON.parse(allowed) : allowed;
        return Array.isArray(list) && list.length ? (acc ? acc.filter(m => list.includes(m)) : list) : acc;
    }, null);
    // A quote, or a route with no rate, is booked at an agreed price, so any mode the items allow can be used
    const manualPricing = !!source || (pricedModes !== null && pricedModes.length === 0);
    const agreed = manualPricing && Number(agreedPrice) > 0 ? Number(agreedPrice) : 0;
    const modeOk = (m: string) => (manualPricing || !pricedModes || pricedModes.includes(m)) && (!allowedModes || allowedModes.includes(m));
    const firstOk = ['air', 'sea', 'road'].find(modeOk);
    if (firstOk && !modeOk(form.transport_mode)) setForm(f => ({ ...f, transport_mode: firstOk }));

    const pickCategory = (idx: number, categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        updateItem(idx, {
            category_id: categoryId,
            ...(cat?.default_fragile ? { is_fragile: true } : {}),
            ...(cat?.default_hazardous ? { is_hazardous: true } : {}),
            ...(cat?.default_refrigeration ? { requires_refrigeration: true } : {}),
        });
    };

    const updateItem = (index: number, patch: Partial<Item>) => setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

    const pickCustomer = (u: any) => {
        setCustomer(u);
        set({ pickup_contact_name: form.pickup_contact_name || u.name, pickup_contact_phone: form.pickup_contact_phone || u.phone || '' });
    };

    const handleSubmit = async () => {
        if (!customer) { toast.error('Choose the customer this shipment is for'); return; }
        if (!form.origin_id || !form.destination_id) { toast.error('Choose pickup and delivery towns'); return; }
        if (form.pickup_address.trim().length < 5 || form.destination_address.trim().length < 5) { toast.error('Enter both street addresses'); return; }
        if (items.some(i => !i.category_id || !i.description.trim() || !(i.weight_kg > 0))) { toast.error('Complete every item (category, description, weight)'); return; }

        setSaving(true);
        try {
            const res = await api.post('/shipments', {
                ...form, user_id: customer.id, items,
                ...(agreed ? { quoted_price: agreed, quoted_days: Number(agreedDays) || undefined } : {}),
                ...source?.payload,
            });
            toast.success(source ? 'Quote converted into a shipment' : 'Shipment created');
            router.push(`/ops/shipments/${res.data.data.shipment.id}`);
        } catch (error: any) {
            const msgs = error.response?.data?.errors;
            if (Array.isArray(msgs)) msgs.slice(0, 3).forEach((err: any) => toast.error(err.msg));
            else toast.error(error.response?.data?.message || 'Failed to create shipment');
        } finally {
            setSaving(false);
        }
    };

    const totalWeight = items.reduce((n, i) => n + (Number(i.weight_kg) || 0) * (Number(i.quantity) || 1), 0);
    const nameOf = (list: any[], id: string) => list.find((l: any) => l.id === id)?.name || '';

    return (
        <OpsPage narrow={false}
            back={source ? source.back : { href: '/ops/shipments', label: 'All shipments' }}
            title={source ? 'Convert quote to shipment' : 'New shipment'}
            subtitle={source ? 'Check the details the customer sent, set the agreed price and book it.' : 'Book a shipment on behalf of a customer.'}>
            {source && (
                <div className="ons-quote-banner">
                    <FileText size={18} />
                    <span>
                        <strong>{source.subject}</strong>
                        <small>Pre-filled from the {source.ref}. Fields we couldn’t match to your locations or categories are left for you to pick.</small>
                    </span>
                    <Link href={source.back.href} className="btn btn-secondary btn-sm">{source.payload.quote_ticket_id ? 'View conversation' : 'View enquiries'}</Link>
                </div>
            )}
            <div className="o-grid-main">
                <div style={{ minWidth: 0 }}>
                    {/* Customer */}
                    <Panel title="Customer" icon={User} subtitle="Who is this shipment for?">
                        {customer ? (
                            <div className="ons-picked">
                                <Avatar name={customer.name} size={40} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <strong>{customer.name}</strong>
                                    <small>{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</small>
                                </span>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCustomer(null)}><X size={14} /> Change</button>
                            </div>
                        ) : (
                            <>
                                <SearchInput value={searchUser} onChange={v => { setSearchUser(v); if (v.trim().length < 2) setUsers([]); }} placeholder="Search customers by name or email…" />
                                <div className="ons-results">
                                    {searching ? <Loader label="Searching…" /> : searchUser.trim().length < 2 ? (
                                        <p className="o-muted">Type at least 2 characters to find a customer.</p>
                                    ) : users.length === 0 ? (
                                        <p className="o-muted">No customers match “{searchUser}”.</p>
                                    ) : users.map(u => (
                                        <button key={u.id} type="button" onClick={() => pickCustomer(u)}>
                                            <Avatar name={u.name} size={32} />
                                            <span><strong>{u.name}</strong><small>{u.email}</small></span>
                                            <CheckCircle2 size={16} />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </Panel>

                    {/* Route */}
                    <div className="o-grid-2">
                        <Panel title="Pickup" icon={MapPin}>
                            <div className="o-stack">
                                <Field label="Country">
                                    <select className="input" value={originCountry} onChange={e => { setOriginCountry(e.target.value); set({ origin_id: '', pickup_city: '', pickup_country: '' }); }}>
                                        <option value="">Select country</option>
                                        {locations.originCountries.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Town / city">
                                    <select className="input" disabled={!originCountry} value={form.origin_id} onChange={e => set({
                                        origin_id: e.target.value,
                                        pickup_city: nameOf(locations.originCities, e.target.value),
                                        pickup_country: nameOf(locations.originCountries, originCountry),
                                    })}>
                                        <option value="">{originCountry ? 'Select town' : 'Choose a country first'}</option>
                                        {locations.originCities.filter((l: any) => l.parent_id === originCountry).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Street address">
                                    <input className="input" value={form.pickup_address} onChange={e => set({ pickup_address: e.target.value })} placeholder="Building, street" />
                                </Field>
                                <div className="o-form-grid">
                                    <Field label="Contact name"><input className="input" value={form.pickup_contact_name} onChange={e => set({ pickup_contact_name: e.target.value })} /></Field>
                                    <Field label="Contact phone"><input className="input" type="tel" value={form.pickup_contact_phone} onChange={e => set({ pickup_contact_phone: e.target.value })} /></Field>
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Delivery" icon={Flag}>
                            <div className="o-stack">
                                <Field label="Country">
                                    <select className="input" value={destCountry} onChange={e => { setDestCountry(e.target.value); set({ destination_id: '', destination_city: '', destination_country: '' }); }}>
                                        <option value="">Select country</option>
                                        {locations.destCountries.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Town / city">
                                    <select className="input" disabled={!destCountry} value={form.destination_id} onChange={e => set({
                                        destination_id: e.target.value,
                                        destination_city: nameOf(locations.destCities, e.target.value),
                                        destination_country: nameOf(locations.destCountries, destCountry),
                                    })}>
                                        <option value="">{destCountry ? 'Select town' : 'Choose a country first'}</option>
                                        {locations.destCities.filter((l: any) => l.parent_id === destCountry).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Street address">
                                    <input className="input" value={form.destination_address} onChange={e => set({ destination_address: e.target.value })} placeholder="Building, street" />
                                </Field>
                                <div className="o-form-grid">
                                    <Field label="Recipient name"><input className="input" value={form.destination_contact_name} onChange={e => set({ destination_contact_name: e.target.value })} /></Field>
                                    <Field label="Recipient phone"><input className="input" type="tel" value={form.destination_contact_phone} onChange={e => set({ destination_contact_phone: e.target.value })} /></Field>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    {/* Items */}
                    <Panel title={`Items (${items.length})`} icon={Package}
                        actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}><Plus size={14} /> Add item</button>}>
                        <div className="o-stack">
                            {items.map((item, idx) => (
                                <div key={idx} className="ons-item">
                                    <div className="ons-item-head">
                                        <span>Item {idx + 1}</span>
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} aria-label={`Remove item ${idx + 1}`}><Trash2 size={15} /></button>
                                        )}
                                    </div>
                                    <div className="o-form-grid">
                                        <Field label="Category">
                                            <select className="input" value={item.category_id} onChange={e => pickCategory(idx, e.target.value)}>
                                                <option value="">Select category</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Description">
                                            <input className="input" value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="e.g. Spare parts" />
                                        </Field>
                                    </div>
                                    <div className="ons-measures">
                                        <Field label="Qty"><input type="number" min="1" className="input" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} /></Field>
                                        <Field label="Weight (kg)"><input type="number" min="0" step="0.1" className="input" value={item.weight_kg} onChange={e => updateItem(idx, { weight_kg: parseFloat(e.target.value) || 0 })} /></Field>
                                        <Field label="L (cm)"><input type="number" min="0" className="input" value={item.length_cm ?? ''} onChange={e => updateItem(idx, { length_cm: parseFloat(e.target.value) || undefined })} /></Field>
                                        <Field label="W (cm)"><input type="number" min="0" className="input" value={item.width_cm ?? ''} onChange={e => updateItem(idx, { width_cm: parseFloat(e.target.value) || undefined })} /></Field>
                                        <Field label="H (cm)"><input type="number" min="0" className="input" value={item.height_cm ?? ''} onChange={e => updateItem(idx, { height_cm: parseFloat(e.target.value) || undefined })} /></Field>
                                    </div>
                                    <div className="ons-extras">
                                        <Field label={categories.find(c => c.id === item.category_id)?.requires_declared_value ? 'Declared value (USD) *' : 'Declared value (USD)'}>
                                            <input type="number" min="0" step="0.01" className="input" value={item.declared_value ?? ''} onChange={e => updateItem(idx, { declared_value: parseFloat(e.target.value) || undefined })} />
                                        </Field>
                                        <div className="ons-flags" role="group" aria-label="Handling">
                                            <label className={item.is_fragile ? 'on' : ''}><input type="checkbox" checked={!!item.is_fragile} onChange={e => updateItem(idx, { is_fragile: e.target.checked })} /> Fragile</label>
                                            <label className={item.is_hazardous ? 'on' : ''}><input type="checkbox" checked={!!item.is_hazardous} onChange={e => updateItem(idx, { is_hazardous: e.target.checked })} /> Hazardous</label>
                                            <label className={item.requires_refrigeration ? 'on' : ''}><input type="checkbox" checked={!!item.requires_refrigeration} onChange={e => updateItem(idx, { requires_refrigeration: e.target.checked })} /> Cold chain</label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Field label="Internal notes" hint="Optional — visible to staff">
                                <textarea className="input" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} />
                            </Field>
                        </div>
                    </Panel>
                </div>

                {/* Summary */}
                <div className="ons-summary">
                    <Panel title="Service">
                        <div className="o-stack">
                            <div className="ons-modes">
                                {MODES.map(({ value, label, icon: Icon }) => (
                                    <button key={value} type="button" className={form.transport_mode === value ? 'active' : ''} onClick={() => set({ transport_mode: value })}
                                        disabled={!modeOk(value)} title={modeOk(value) ? undefined : pricedModes && !pricedModes.includes(value) ? 'No price set for this route' : 'Not allowed for these items'}>
                                        <Icon size={18} /> {label}
                                    </button>
                                ))}
                            </div>
                            {pricedModes && pricedModes.length === 0 && (
                                <p className="ons-noprice">No price is set for this route yet. Book it at the agreed price below, or add a price in the <a href="/ops/pricing">price table</a>.</p>
                            )}
                            <Field label="Service level">
                                <select className="input" value={form.shipment_type} onChange={e => set({ shipment_type: e.target.value })}>
                                    <option value="standard">Standard</option>
                                    <option value="express">Express</option>
                                    <option value="overnight">Overnight</option>
                                </select>
                            </Field>
                        </div>
                    </Panel>

                    {manualPricing && (
                        <Panel title="Agreed price" icon={DollarSign} subtitle={shownQuote ? 'Optional: overrides the rate card' : 'What you quoted the customer'}>
                            <div className="o-form-grid">
                                <Field label="Price (USD)">
                                    <input type="number" min="0" step="0.01" className="input" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} placeholder="0.00" />
                                </Field>
                                <Field label="Transit (days)" hint="Optional">
                                    <input type="number" min="1" className="input" value={agreedDays} onChange={e => setAgreedDays(e.target.value)} />
                                </Field>
                            </div>
                        </Panel>
                    )}

                    <Panel title="Summary" icon={Calculator}>
                        <div className="o-kv">
                            <div><dt>Customer</dt><dd>{customer?.name || '—'}</dd></div>
                            <div><dt>Route</dt><dd>{form.pickup_city && form.destination_city ? `${form.pickup_city} → ${form.destination_city}` : '—'}</dd></div>
                            <div><dt>Pieces</dt><dd>{items.reduce((n, i) => n + (Number(i.quantity) || 1), 0)}</dd></div>
                            <div><dt>Total weight</dt><dd>{totalWeight.toFixed(1)} kg</dd></div>
                            {shownQuote?.estimated_days ? <div><dt>Transit</dt><dd>~{shownQuote.estimated_days} days</dd></div> : null}
                        </div>
                        {shownQuote?.breakdown?.length > 0 && (
                            <ul className="ons-breakdown">
                                {shownQuote.breakdown.map((l: any) => (
                                    <li key={l.key}><span>{l.label}{l.detail && <small> · {l.detail}</small>}</span><span>{money(l.amount)}</span></li>
                                ))}
                            </ul>
                        )}
                        <div className="ons-price">
                            <span>{agreed ? 'Agreed price' : shownQuote ? 'Price' : 'Estimated price'}</span>
                            {agreed ? <strong>{money(agreed)}</strong> : quoting ? <div className="spinner" /> : shownQuote ? <strong>{money(shownQuote.total_price)}</strong>
                                : shownProblem ? <small className="ons-noprice">{manualPricing && shownProblem.code === 'NO_RATE' ? 'Enter the agreed price to book this route.' : shownProblem.message}</small>
                                    : <small>Choose a route and complete the items to see a price</small>}
                        </div>
                        <button type="button" className="btn btn-primary btn-full" style={{ marginTop: '1rem', height: 44 }} onClick={handleSubmit} disabled={saving || !(shownQuote || agreed)}>
                            {saving ? <div className="spinner" /> : <><CheckCircle2 size={16} /> {source ? 'Book shipment' : 'Create shipment'}</>}
                        </button>
                    </Panel>
                </div>
            </div>
        </OpsPage>
    );
}
