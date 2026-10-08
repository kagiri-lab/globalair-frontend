'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, PenLine, Globe, MapPin, Building2, ChevronRight, Plane, Ship, Truck, Settings2, Copy, Trash2, Save, Layers, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
    Panel, Toolbar, SearchInput, Segmented, StatusBadge, Table, Loader, EmptyState, Pager, Modal, Field,
} from '@/components/ops/ui';

interface Location {
    id: string;
    name: string;
    type: 'origin_country' | 'origin' | 'destination_country' | 'destination_city';
    parent_id: string | null;
    country_code: string | null;
    is_active: boolean;
}

type Mode = 'air' | 'sea' | 'road';

interface Rate {
    id?: string;
    origin_id: string;
    destination_id: string;
    // per_kg: rate_per_kg is the price per kg.
    // upto:   rate_per_kg is a flat price up to upto_weight kg, then extra_per_kg for each kg above that.
    air_rate_per_kg: number; air_rate_type: 'per_kg' | 'upto'; air_upto_weight: number; air_extra_per_kg: number | null; air_days: number;
    sea_rate_per_kg: number; sea_rate_type: 'per_kg' | 'upto'; sea_upto_weight: number; sea_extra_per_kg: number | null; sea_days: number;
    road_rate_per_kg: number; road_rate_type: 'per_kg' | 'upto'; road_upto_weight: number; road_extra_per_kg: number | null; road_days: number;
    flat_surcharge: number;
    minimum_charge: number | null; // null: the global minimum from Settings applies
}

const EMPTY_LOCATION: Omit<Location, 'id'> = { name: '', type: 'origin', parent_id: null, country_code: null, is_active: true };

const EMPTY_RATE = (originId: string, destId: string): Rate => ({
    origin_id: originId, destination_id: destId,
    air_rate_per_kg: 0, air_rate_type: 'per_kg', air_upto_weight: 5, air_extra_per_kg: null, air_days: 7,
    sea_rate_per_kg: 0, sea_rate_type: 'per_kg', sea_upto_weight: 5, sea_extra_per_kg: null, sea_days: 30,
    road_rate_per_kg: 0, road_rate_type: 'per_kg', road_upto_weight: 5, road_extra_per_kg: null, road_days: 14,
    flat_surcharge: 0, minimum_charge: null,
});

const MODES: { key: Mode; label: string; icon: typeof Plane }[] = [
    { key: 'air', label: 'Air', icon: Plane },
    { key: 'sea', label: 'Sea', icon: Ship },
    { key: 'road', label: 'Road', icon: Truck },
];

const PAGE_SIZE = 12;

// A section header inside the Pricing page (in place of a full page header)
function Frame({ title, subtitle, actions, back, children }: {
    title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode;
    back?: { label: string; onClick: () => void }; children: React.ReactNode;
}) {
    return (
        <div className="opl fade-in">
            {back && <button type="button" className="o-back" onClick={back.onClick}><ArrowLeft size={15} /> {back.label}</button>}
            <header className="opl-head">
                <div style={{ minWidth: 0 }}>
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                {actions && <div className="o-page-actions">{actions}</div>}
            </header>
            {children}
        </div>
    );
}

/** Pickup points, destination cities and per-route extras: the Locations tab on the Pricing page */
export default function LocationsManager() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [localSearch, setLocalSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'origins' | 'destinations'>('origins');
    const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
    const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [countryPage, setCountryPage] = useState(1);
    const [localPage, setLocalPage] = useState(1);
    const [editTarget, setEditTarget] = useState<Partial<Location> | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

    const loadLocations = useCallback(async () => {
        try {
            const res = await api.get('/locations');
            setLocations(res.data.data);
        } catch {
            toast.error('Failed to load locations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadLocations(); }, [loadLocations]);

    const byId = (id: string | null) => (id ? locations.find(l => l.id === id) || null : null);
    const selectedCountry = byId(selectedCountryId);
    const selectedLocal = byId(selectedLocalId);
    const selectedPartner = byId(selectedPartnerId);
    const isOrigins = activeTab === 'origins';

    const countries = useMemo(() => {
        const type = isOrigins ? 'origin_country' : 'destination_country';
        return locations.filter(l => l.type === type && l.name.toLowerCase().includes(search.toLowerCase()));
    }, [locations, isOrigins, search]);

    const children = useMemo(() => (selectedCountryId
        ? locations.filter(l => l.parent_id === selectedCountryId && l.name.toLowerCase().includes(localSearch.toLowerCase()))
        : []), [locations, selectedCountryId, localSearch]);

    const switchTab = (t: 'origins' | 'destinations') => {
        setActiveTab(t); setSelectedCountryId(null); setSelectedLocalId(null); setSelectedPartnerId(null); setCountryPage(1);
    };

    const handleSaveLocation = async (data: Partial<Location>) => {
        if (!data.name?.trim()) { toast.error('Name is required'); return; }
        setProcessing(true);
        try {
            if (data.id) {
                await api.patch(`/locations/${data.id}`, data);
                toast.success('Saved');
            } else {
                await api.post('/locations', data);
                toast.success('Added');
            }
            setEditTarget(null);
            loadLocations();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Could not save');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setProcessing(true);
        try {
            await api.delete(`/locations/${deleteTarget.id}`);
            toast.success(`${deleteTarget.name} removed`);
            if (selectedLocalId === deleteTarget.id) setSelectedLocalId(null);
            if (selectedCountryId === deleteTarget.id) setSelectedCountryId(null);
            setDeleteTarget(null);
            setEditTarget(null);
            loadLocations();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Delete failed');
        } finally {
            setProcessing(false);
        }
    };

    const modals = (
        <>
            <LocationModal
                target={editTarget}
                onClose={() => setEditTarget(null)}
                onSave={handleSaveLocation}
                onDelete={(loc: Location) => setDeleteTarget(loc)}
                processing={processing}
            />
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={`Remove ${deleteTarget?.name}?`}
                width={440}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={processing}>{processing ? <div className="spinner" /> : 'Remove'}</button>
                </>}
            >
                <p className="o-muted">This is permanent. Routes and rates connected to it will stop working. To pause it instead, edit it and switch it off.</p>
            </Modal>
        </>
    );

    if (loading) return <Loader label="Loading locations…" />;

    // ── Level 4: rate editor for one route ───────────────────────────────────
    if (selectedPartner && selectedLocal && selectedCountry) {
        const origin = isOrigins ? selectedLocal : selectedPartner;
        const destination = isOrigins ? selectedPartner : selectedLocal;
        return (
            <Frame
                back={{ label: `Routes from ${selectedLocal.name}`, onClick: () => setSelectedPartnerId(null) }}
                title={<>{origin.name} <ChevronRight size={20} style={{ verticalAlign: 'middle', color: 'var(--text-muted)' }} /> {destination.type === 'destination_country' ? `All of ${destination.name}` : destination.name}</>}
                subtitle={destination.type === 'destination_country'
                    ? `Used for any city in ${destination.name} that has no price of its own from ${origin.name}.`
                    : 'Set the price and transit time for each transport mode on this route.'}
            >
                <RateEditor origin={origin} destination={destination} onDone={() => setSelectedPartnerId(null)} />
            </Frame>
        );
    }

    // ── Level 3: routes from / to one town ───────────────────────────────────
    if (selectedLocal && selectedCountry) {
        return (
            <Frame
                back={{ label: selectedCountry.name, onClick: () => setSelectedLocalId(null) }}
                title={<span className="o-row" style={{ gap: '0.6rem' }}>{selectedLocal.name} <StatusBadge status={selectedLocal.is_active ? 'active' : 'inactive'} /></span>}
                subtitle={isOrigins ? 'Rates for shipments picked up here. Edit a rate and click away to save it.' : 'Rates for shipments delivered here. Edit a rate and click away to save it.'}
                actions={<button className="btn btn-secondary" onClick={() => setEditTarget(selectedLocal)}><PenLine size={15} /> Edit {isOrigins ? 'pickup point' : 'city'}</button>}
            >
                <PricingMatrix source={selectedLocal} mode={activeTab} locations={locations} onConfigure={setSelectedPartnerId} />
                {modals}
            </Frame>
        );
    }

    // ── Level 2: towns in a country ──────────────────────────────────────────
    if (selectedCountry) {
        const pages = Math.max(1, Math.ceil(children.length / PAGE_SIZE));
        const shown = children.slice((localPage - 1) * PAGE_SIZE, localPage * PAGE_SIZE);
        return (
            <Frame
                back={{ label: isOrigins ? 'Origin countries' : 'Destination countries', onClick: () => setSelectedCountryId(null) }}
                title={<span className="o-row" style={{ gap: '0.6rem' }}>{selectedCountry.name} {selectedCountry.country_code && <span className="opr-code">{selectedCountry.country_code}</span>}</span>}
                subtitle={`${children.length} ${isOrigins ? 'pickup point' : 'destination city'}${children.length === 1 ? '' : 's'}`}
                actions={<>
                    <button className="btn btn-secondary" onClick={() => setEditTarget(selectedCountry)}><PenLine size={15} /> Edit country</button>
                    <button className="btn btn-primary" onClick={() => setEditTarget({ ...EMPTY_LOCATION, type: isOrigins ? 'origin' : 'destination_city', parent_id: selectedCountry.id })}>
                        <Plus size={16} /> Add {isOrigins ? 'pickup point' : 'city'}
                    </button>
                </>}
            >
                <Toolbar>
                    <SearchInput value={localSearch} onChange={v => { setLocalSearch(v); setLocalPage(1); }} placeholder={`Search ${isOrigins ? 'pickup points' : 'cities'}…`} />
                </Toolbar>
                <Panel flush>
                    {shown.length === 0 ? (
                        <EmptyState icon={MapPin} title={localSearch ? 'Nothing matches' : `No ${isOrigins ? 'pickup points' : 'cities'} yet`} />
                    ) : (
                        <Table minWidth={460}>
                            <thead><tr><th>Name</th><th>Status</th><th className="num" /></tr></thead>
                            <tbody>
                                {shown.map(child => (
                                    <tr key={child.id} className="o-clickable" onClick={() => setSelectedLocalId(child.id)}>
                                        <td>
                                            <div className="o-cell-main">
                                                <span className="opr-node">{isOrigins ? <Building2 size={16} /> : <MapPin size={16} />}</span>
                                                <strong>{child.name}</strong>
                                            </div>
                                        </td>
                                        <td><StatusBadge status={child.is_active ? 'active' : 'inactive'} /></td>
                                        <td className="num"><span className="o-row" style={{ justifyContent: 'flex-end', gap: '0.3rem', color: 'var(--accent)', fontWeight: 600 }}>Rates <ChevronRight size={15} /></span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                    <Pager page={localPage} pages={pages} total={children.length} onChange={setLocalPage} />
                </Panel>
                {modals}
            </Frame>
        );
    }

    // ── Level 1: countries ───────────────────────────────────────────────────
    const pages = Math.max(1, Math.ceil(countries.length / PAGE_SIZE));
    const shown = countries.slice((countryPage - 1) * PAGE_SIZE, countryPage * PAGE_SIZE);
    return (
        <Frame
            title="Locations"
            subtitle="Where we pick up and deliver. Everyday prices are in the price table; open a route here for extras like fees, minimums and category prices."
            actions={<button className="btn btn-primary" onClick={() => setEditTarget({ ...EMPTY_LOCATION, type: isOrigins ? 'origin_country' : 'destination_country' })}><Plus size={16} /> Add country</button>}
        >
            <Toolbar>
                <Segmented value={activeTab} onChange={switchTab} options={[
                    { value: 'origins', label: 'Pickup (origin)', count: locations.filter(l => l.type === 'origin_country').length },
                    { value: 'destinations', label: 'Delivery (destination)', count: locations.filter(l => l.type === 'destination_country').length },
                ]} />
                <SearchInput value={search} onChange={v => { setSearch(v); setCountryPage(1); }} placeholder="Search countries…" />
            </Toolbar>

            {shown.length === 0 ? (
                <Panel><EmptyState icon={Globe} title={search ? 'No countries match' : 'No countries yet'} text="Add a country, then its pickup points or cities, then set route prices." /></Panel>
            ) : (
                <div className="opr-countries">
                    {shown.map(c => {
                        const count = locations.filter(l => l.parent_id === c.id).length;
                        return (
                            <button key={c.id} type="button" className="opr-country" onClick={() => { setSelectedCountryId(c.id); setLocalSearch(''); setLocalPage(1); }}>
                                <span className="opr-code big">{c.country_code || <Globe size={18} />}</span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <strong>{c.name}</strong>
                                    <small>{count} {isOrigins ? (count === 1 ? 'pickup point' : 'pickup points') : (count === 1 ? 'city' : 'cities')}</small>
                                </span>
                                {!c.is_active && <StatusBadge status="inactive" />}
                                <ChevronRight size={16} className="o-muted" />
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="o-panel" style={{ marginTop: '1rem', border: 'none', background: 'none' }}>
                <Pager page={countryPage} pages={pages} total={countries.length} noun="countries" onChange={setCountryPage} />
            </div>
            {modals}
        </Frame>
    );
}

// ── Route list with quick per-kg editing ─────────────────────────────────────
function PricingMatrix({ source, mode, locations, onConfigure }: { source: Location; mode: 'origins' | 'destinations'; locations: Location[]; onConfigure: (id: string) => void }) {
    const [rates, setRates] = useState<Rate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [applyAll, setApplyAll] = useState<{ field: Mode; partnerId: string } | null>(null);
    const [applying, setApplying] = useState(false);

    // From a pickup point, a whole destination country can be priced too: it covers that country's cities without a price of their own
    const partners = useMemo(() => {
        if (mode === 'destinations') return locations.filter(l => l.type === 'origin');
        return locations.filter(l => l.type === 'destination_country').flatMap(c => [c, ...locations.filter(l => l.type === 'destination_city' && l.parent_id === c.id)]);
    }, [locations, mode]);
    const isCountry = (l: Location) => l.type === 'destination_country';
    const copyTargets = partners.filter(p => !isCountry(p)); // "copy to every route" never creates country-wide prices
    const filtered = partners.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    const rateFor = (partnerId: string) => rates.find(r => (mode === 'origins' ? r.destination_id === partnerId : r.origin_id === partnerId));
    const routeIds = (partnerId: string): [string, string] => (mode === 'origins' ? [source.id, partnerId] : [partnerId, source.id]);

    const loadRates = useCallback(() => {
        api.get(`/locations/${source.id}/rates?mode=${mode}`)
            .then(res => setRates(res.data.data))
            .catch(() => toast.error('Could not load rates'))
            .finally(() => setLoading(false));
    }, [source.id, mode]);

    useEffect(() => { loadRates(); }, [loadRates]);

    const quickUpdate = async (partnerId: string, field: string, value: number) => {
        const existing = rateFor(partnerId);
        if (Number((existing as any)?.[field] || 0) === value) return; // unchanged
        setSaving(partnerId);
        try {
            const payload = existing ? { ...existing, [field]: value } : { ...EMPTY_RATE(...routeIds(partnerId)), [field]: value };
            await api.post('/locations/rates', payload);
            toast.success('Rate saved');
            loadRates();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save rate');
            loadRates();
        } finally {
            setSaving(null);
        }
    };

    const confirmApplyAll = async () => {
        if (!applyAll) return;
        const base = rateFor(applyAll.partnerId);
        if (!base) return;
        const f = applyAll.field;
        setApplying(true);
        try {
            await Promise.all(copyTargets.map(p => {
                const existing = rateFor(p.id);
                return api.post('/locations/rates', {
                    ...(existing || EMPTY_RATE(...routeIds(p.id))),
                    [`${f}_rate_per_kg`]: (base as any)[`${f}_rate_per_kg`],
                    [`${f}_rate_type`]: (base as any)[`${f}_rate_type`],
                    [`${f}_upto_weight`]: (base as any)[`${f}_upto_weight`],
                    [`${f}_extra_per_kg`]: (base as any)[`${f}_extra_per_kg`],
                    [`${f}_days`]: (base as any)[`${f}_days`],
                });
            }));
            toast.success(`${f.toUpperCase()} pricing copied to all ${copyTargets.length} routes`);
            setApplyAll(null);
            loadRates();
        } catch {
            toast.error('Could not copy pricing to every route');
        } finally {
            setApplying(false);
        }
    };

    return (
        <>
            <Toolbar>
                <SearchInput value={query} onChange={setQuery} placeholder={`Search ${mode === 'origins' ? 'destination cities' : 'pickup points'}…`} />
                <span className="o-muted" style={{ fontSize: '0.85rem' }}>{filtered.length} routes</span>
            </Toolbar>
            <Panel flush>
                {loading ? <Loader label="Loading rates…" /> : filtered.length === 0 ? (
                    <EmptyState icon={Layers} title="No routes" text={`Add ${mode === 'origins' ? 'destination cities' : 'pickup points'} first, then set their rates here.`} />
                ) : (
                    <Table minWidth={720}>
                        <thead>
                            <tr>
                                <th>{mode === 'origins' ? 'To' : 'From'}</th>
                                {MODES.map(m => <th key={m.key}><span className="o-row" style={{ gap: '0.35rem' }}><m.icon size={13} /> {m.label} (USD)</span></th>)}
                                <th className="num">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const rate = rateFor(p.id);
                                return (
                                    <tr key={p.id} style={{ opacity: saving === p.id ? 0.55 : 1 }}>
                                        <td style={isCountry(p) ? undefined : (mode === 'origins' ? { paddingLeft: '1.75rem' } : undefined)}>
                                            {isCountry(p)
                                                ? <span className="o-row" style={{ gap: '0.4rem' }}><Globe size={14} className="o-muted" /><strong style={{ color: 'var(--text-primary)' }}>All of {p.name}</strong></span>
                                                : <strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong>}
                                            {!rate && <div className="o-muted" style={{ fontSize: '0.75rem' }}>{isCountry(p) ? 'Optional — used for cities without their own price' : 'No pricing yet'}</div>}
                                        </td>
                                        {MODES.map(m => (
                                            <td key={m.key}>
                                                <div className="o-row" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
                                                    <input
                                                        key={`${rate?.id || 'new'}-${(rate as any)?.[`${m.key}_rate_per_kg`]}`}
                                                        className="input opr-quick"
                                                        type="number" min="0" step="0.01"
                                                        defaultValue={(rate as any)?.[`${m.key}_rate_per_kg`] || ''}
                                                        placeholder="—"
                                                        aria-label={`${m.label} rate to ${p.name}`}
                                                        onBlur={e => quickUpdate(p.id, `${m.key}_rate_per_kg`, parseFloat(e.target.value) || 0)}
                                                    />
                                                    {rate && (rate as any)[`${m.key}_rate_per_kg`] > 0 && (
                                                        <small className="opr-model" title={rateSummary(rate, m.key)}>{rateSummary(rate, m.key, true)}</small>
                                                    )}
                                                    {rate && (
                                                        <button type="button" className="opr-copy" title={`Copy ${m.label.toLowerCase()} pricing to every route`} onClick={() => setApplyAll({ field: m.key, partnerId: p.id })}>
                                                            <Copy size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                        <td className="num"><button className="btn btn-secondary btn-sm" onClick={() => onConfigure(p.id)}><Settings2 size={14} /> Configure</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Panel>

            <Modal
                open={!!applyAll}
                onClose={() => setApplyAll(null)}
                title={`Copy ${applyAll?.field} pricing to every route?`}
                width={460}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setApplyAll(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={confirmApplyAll} disabled={applying}>{applying ? <div className="spinner" /> : `Apply to ${copyTargets.length} routes`}</button>
                </>}
            >
                <p className="o-muted">The rate, pricing type and transit days for <b>{applyAll?.field}</b> on this route will overwrite the {applyAll?.field} pricing on all {copyTargets.length} {mode === 'origins' ? 'city ' : ''}routes {mode === 'origins' ? 'from' : 'to'} {source.name}.</p>
            </Modal>
        </>
    );
}

// ── Full rate editor for one route ───────────────────────────────────────────
function RateEditor({ origin, destination, onDone }: { origin: Location; destination: Location; onDone: () => void }) {
    const [rate, setRate] = useState<Rate>(EMPTY_RATE(origin.id, destination.id));
    const [overrides, setOverrides] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [catsRes, ratesRes] = await Promise.all([api.get('/admin/categories'), api.get(`/locations/${destination.id}/rates`)]);
                setCategories(catsRes.data.data.categories);
                const found = ratesRes.data.data.find((r: any) => r.origin_id === origin.id);
                if (found) {
                    setRate({ ...EMPTY_RATE(origin.id, destination.id), ...found });
                    const ovRes = await api.get(`/locations/${destination.id}/rates?routeId=${found.id}`);
                    setOverrides(ovRes.data.overrides || []);
                }
            } catch {
                toast.error('Could not load this route’s pricing');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [origin.id, destination.id]);

    const save = async () => {
        setSaving(true);
        try {
            await api.post('/locations/rates', { ...rate, category_overrides: overrides });
            toast.success('Route pricing saved');
            onDone();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save pricing');
        } finally {
            setSaving(false);
        }
    };

    const addOverride = (catId: string) => {
        if (!catId || overrides.some(o => o.category_id === catId)) return;
        setOverrides([...overrides, Object.fromEntries([
            ['category_id', catId],
            ...MODES.flatMap(m => [[`${m.key}_rate_per_kg`, (rate as any)[`${m.key}_rate_per_kg`]], [`${m.key}_rate_type`, (rate as any)[`${m.key}_rate_type`]], [`${m.key}_upto_weight`, (rate as any)[`${m.key}_upto_weight`]], [`${m.key}_extra_per_kg`, (rate as any)[`${m.key}_extra_per_kg`]]]),
        ])]);
    };
    const updateOverride = (catId: string, patch: any) => setOverrides(overrides.map(o => (o.category_id === catId ? { ...o, ...patch } : o)));

    if (loading) return <Loader label="Loading pricing…" />;

    return (
        <>
            <div className="opr-modes">
                {MODES.map(({ key, label, icon: Icon }) => (
                    <Panel key={key} title={`${label} freight`} icon={Icon}>
                        <ModePricing values={rate} mode={key} onChange={patch => setRate(r => ({ ...r, ...patch }))} withDays />
                    </Panel>
                ))}
            </div>

            <Panel title="Extra charges" subtitle="Applied once to every shipment on this route">
                <div className="o-form-grid" style={{ maxWidth: 560 }}>
                    <Field label="Flat surcharge (USD)" hint="Added to every shipment">
                        <input type="number" min="0" step="0.01" className="input" value={rate.flat_surcharge || ''} onChange={e => setRate(r => ({ ...r, flat_surcharge: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
                    </Field>
                    <Field label="Minimum charge (USD)" hint="Smaller shipments are charged this. Leave empty to use the minimum in Settings.">
                        <input type="number" min="0" step="0.01" className="input" value={rate.minimum_charge ?? ''} onChange={e => setRate(r => ({ ...r, minimum_charge: e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="Default" />
                    </Field>
                </div>
            </Panel>

            <Panel
                title="Category-specific pricing"
                subtitle="Charge some cargo types differently on this route"
                actions={
                    <select className="input" style={{ width: 230 }} value="" onChange={e => addOverride(e.target.value)} aria-label="Add a category override">
                        <option value="">+ Add a category…</option>
                        {categories.filter(c => !overrides.some(o => o.category_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                }
            >
                {overrides.length === 0 ? <p className="o-muted">All categories use the route pricing above.</p> : (
                    <div className="o-stack">
                        {overrides.map(ov => {
                            const cat = categories.find(c => c.id === ov.category_id);
                            return (
                                <div key={ov.category_id} className="opr-override">
                                    <div className="o-row" style={{ justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                                        <strong>{cat?.name || 'Category'}</strong>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOverrides(overrides.filter(o => o.category_id !== ov.category_id))}><Trash2 size={13} /> Remove</button>
                                    </div>
                                    <div className="opr-modes compact">
                                        {MODES.map(({ key, label, icon: Icon }) => (
                                            <div key={key}>
                                                <p className="opr-mode-label"><Icon size={13} /> {label}</p>
                                                <ModePricing values={ov} mode={key} onChange={patch => updateOverride(ov.category_id, patch)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Panel>

            <div className="o-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={onDone}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner" /> : <><Save size={16} /> Save pricing</>}</button>
            </div>
        </>
    );
}

// "$3.50 up to 5 kg, then $0.70/kg" (short: "≤5 kg, +$0.70/kg")
function rateSummary(values: any, mode: Mode, short = false) {
    const amount = Number(values?.[`${mode}_rate_per_kg`]) || 0;
    if (values?.[`${mode}_rate_type`] !== 'upto') return short ? '/kg' : `$${amount.toFixed(2)} per kg`;
    const upto = Number(values[`${mode}_upto_weight`]) || 0;
    const extra = Number(values[`${mode}_extra_per_kg`]) || 0;
    return short ? `≤${upto} kg, +$${extra.toFixed(2)}/kg` : `$${amount.toFixed(2)} up to ${upto} kg, then $${extra.toFixed(2)} per extra kg`;
}

function ModePricing({ values, mode, onChange, withDays }: { values: any; mode: Mode; onChange: (patch: any) => void; withDays?: boolean }) {
    const type = values[`${mode}_rate_type`] || 'per_kg';
    const amount = Number(values[`${mode}_rate_per_kg`]) || 0;
    const upto = Number(values[`${mode}_upto_weight`]) || 0;
    const extra = Number(values[`${mode}_extra_per_kg`]) || 0;
    const example = upto > 0 ? Math.max(10, Math.ceil(upto * 2.4)) : 10;
    const days = withDays && (
        <Field label="Transit (days)">
            <input type="number" min="0" className="input" value={values[`${mode}_days`] || ''} onChange={e => onChange({ [`${mode}_days`]: parseInt(e.target.value) || 0 })} />
        </Field>
    );
    return (
        <div className="o-stack" style={{ gap: '0.75rem' }}>
            <Segmented
                value={type}
                onChange={v => onChange({ [`${mode}_rate_type`]: v, ...(v === 'upto' && !upto ? { [`${mode}_upto_weight`]: 5 } : {}) })}
                options={[{ value: 'per_kg', label: 'Per kg' }, { value: 'upto', label: 'Flat, then per kg' }]}
            />
            <div className="o-form-grid">
                <Field label={type === 'upto' ? 'Flat price (USD)' : 'Price per kg (USD)'}>
                    <input type="number" min="0" step="0.01" className="input" value={values[`${mode}_rate_per_kg`] || ''} onChange={e => onChange({ [`${mode}_rate_per_kg`]: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                </Field>
                {type === 'upto' && (
                    <Field label="Covers up to (kg)">
                        <input type="number" min="0" step="0.1" className="input" value={values[`${mode}_upto_weight`] || ''} onChange={e => onChange({ [`${mode}_upto_weight`]: parseFloat(e.target.value) || 0 })} />
                    </Field>
                )}
                {type === 'upto' && (
                    <Field label={`Then per extra kg (USD)`}>
                        <input type="number" min="0" step="0.01" className="input" value={values[`${mode}_extra_per_kg`] ?? ''} onChange={e => onChange({ [`${mode}_extra_per_kg`]: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                    </Field>
                )}
                {days}
            </div>
            {amount > 0 && type === 'upto' && upto > 0 && (
                <p className="opr-example">
                    {extra > 0
                        ? <>e.g. {upto} kg = ${amount.toFixed(2)} · {example} kg = ${(amount + (example - upto) * extra).toFixed(2)}</>
                        : <span className="opr-warn">Enter the price per extra kg above {upto} kg</span>}
                </p>
            )}
        </div>
    );
}

// ── Add / edit a country, pickup point or city ───────────────────────────────
function LocationModal({ target, onClose, onSave, onDelete, processing }: {
    target: Partial<Location> | null; onClose: () => void; onSave: (d: Partial<Location>) => void; onDelete: (l: Location) => void; processing: boolean;
}) {
    const [data, setData] = useState<Partial<Location>>({});
    const [lastTarget, setLastTarget] = useState(target);
    if (target !== lastTarget) {
        setLastTarget(target);
        setData(target || {});
    }
    const isCountry = data.type?.includes('country');
    const noun = isCountry ? 'country' : data.type === 'origin' ? 'pickup point' : 'city';

    return (
        <Modal
            open={!!target}
            onClose={onClose}
            title={data.id ? `Edit ${data.name || noun}` : `Add ${noun}`}
            width={480}
            footer={<>
                {data.id && <button className="btn btn-secondary" style={{ marginRight: 'auto', color: 'var(--danger)' }} onClick={() => onDelete(data as Location)}><Trash2 size={14} /> Remove</button>}
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={() => onSave(data)} disabled={processing}>{processing ? <div className="spinner" /> : 'Save'}</button>
            </>}
        >
            <div className="o-stack">
                <Field label="Name">
                    <input className="input" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} placeholder={isCountry ? 'e.g. Somalia' : 'e.g. Mogadishu'} autoFocus />
                </Field>
                {isCountry && (
                    <Field label="Country code" hint="Optional. Up to 10 letters or numbers, e.g. KE, SOM or UAE">
                        <input className="input" value={data.country_code || ''}
                            onChange={e => setData({ ...data, country_code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                            maxLength={10} style={{ textTransform: 'uppercase', width: 160 }} />
                    </Field>
                )}
                <label className="ocat-toggles o-field" style={{ display: 'block' }}>
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 0.85rem', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <input type="checkbox" checked={!!data.is_active} onChange={e => setData({ ...data, is_active: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                        <span><b style={{ display: 'block', color: 'var(--text-primary)' }}>Active</b>Customers can pick it when booking</span>
                    </span>
                </label>
            </div>
        </Modal>
    );
}
