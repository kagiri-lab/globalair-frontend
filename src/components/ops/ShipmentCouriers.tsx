'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Plus, Edit2, Trash2, ExternalLink, EyeOff, Wand2, ArrowRight, RefreshCw, ChevronDown, AlertTriangle, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Modal, Field, StatusBadge, Loader, money, fmtDate } from './ui';

export interface Courier { id: string; name: string; type: 'internal' | 'partner'; is_active: boolean; is_default: boolean }
interface Leg {
    id: string; sequence: number; courier_id: string; courier_name: string; courier_type: 'internal' | 'partner';
    courier_tracking_number: string | null; courier_tracking_link: string | null; service: string | null;
    from_location: string | null; to_location: string | null; cost: number | null;
    status: 'planned' | 'booked' | 'in_transit' | 'delivered' | 'cancelled'; notes: string | null; assigned_by_name: string | null; rule_id: string | null;
    auto_tracking: boolean; publishes_to_customers: boolean;
    external_status: string | null; external_status_text: string | null; external_updated_at: string | null; external_eta: string | null;
    last_synced_at: string | null; sync_error: string | null;
    courier_events: { id: string; occurred_at: string; status_code: string; description: string | null; location: string | null; tracking_event_id: string | null }[];
}

const EXTERNAL: Record<string, string> = { pre_transit: 'Label created', in_transit: 'In transit', delivered: 'Delivered', exception: 'Exception', unknown: 'Unknown' };

export const LEG_STATUS: Record<Leg['status'], { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
    planned: { label: 'Planned', tone: 'neutral' },
    booked: { label: 'Booked', tone: 'info' },
    in_transit: { label: 'In transit', tone: 'warning' },
    delivered: { label: 'Delivered', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
};

const EMPTY = { courier_id: '', courier_tracking_number: '', service: '', from_location: '', to_location: '', cost: '', status: 'planned' as Leg['status'], notes: '' };

/**
 * Which courier is moving this shipment (staff only — customers never see this).
 * A shipment can have several legs, e.g. our riders to the airport, then a partner abroad.
 */
export default function ShipmentCouriers({ shipmentId, canEdit, pickupCity, destinationCity, onShipmentChanged }: {
    shipmentId: string; canEdit: boolean; pickupCity?: string; destinationCity?: string;
    onShipmentChanged?: () => void; // courier sync posted customer updates — reload the shipment
}) {
    const [legs, setLegs] = useState<Leg[]>([]);
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [suggested, setSuggested] = useState<{ courier_id: string; courier_name: string; reason: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Leg | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState<Leg | null>(null);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [openScans, setOpenScans] = useState<Record<string, boolean>>({});

    const syncNow = async (leg: Leg) => {
        setSyncing(leg.id);
        try {
            const res = await api.post(`/admin/shipments/${shipmentId}/legs/${leg.id}/sync`);
            setLegs(res.data.data.legs);
            toast.success(res.data.message);
            if (res.data.data.shipment_status || leg.publishes_to_customers) onShipmentChanged?.();
        } catch (err: any) {
            if (err.response?.data?.data?.legs) setLegs(err.response.data.data.legs);
            toast.error(err.response?.data?.message || 'Could not reach the courier');
        } finally {
            setSyncing(null);
        }
    };

    const load = useCallback(() => Promise.all([api.get(`/admin/shipments/${shipmentId}/legs`), api.get('/admin/couriers')])
        .then(([l, c]) => {
            setLegs(l.data.data.legs);
            setSuggested(l.data.data.suggested);
            setCouriers(c.data.data.couriers);
        })
        .catch(() => toast.error('Could not load courier details'))
        .finally(() => setLoading(false)), [shipmentId]);

    useEffect(() => { load(); }, [load]);

    const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));

    const openForm = (leg?: Leg, courierId?: string) => {
        setEditing(leg || null);
        const prev = legs[legs.length - 1];
        setForm(leg ? {
            courier_id: leg.courier_id, courier_tracking_number: leg.courier_tracking_number || '', service: leg.service || '',
            from_location: leg.from_location || '', to_location: leg.to_location || '', cost: leg.cost === null ? '' : String(leg.cost),
            status: leg.status, notes: leg.notes || '',
        } : {
            ...EMPTY,
            courier_id: courierId || suggested?.courier_id || '',
            from_location: prev?.to_location || pickupCity || '',
            to_location: destinationCity || '',
        });
        setShowForm(true);
    };

    const save = async () => {
        if (!form.courier_id) { toast.error('Choose a courier'); return; }
        setSaving(true);
        try {
            const res = editing
                ? await api.patch(`/admin/shipments/${shipmentId}/legs/${editing.id}`, form)
                : await api.post(`/admin/shipments/${shipmentId}/legs`, form);
            setLegs(res.data.data.legs);
            toast.success(editing ? 'Courier details saved' : 'Courier assigned');
            setShowForm(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save');
        } finally {
            setSaving(false);
        }
    };

    const quickStatus = async (leg: Leg, status: Leg['status']) => {
        try {
            const res = await api.patch(`/admin/shipments/${shipmentId}/legs/${leg.id}`, { status });
            setLegs(res.data.data.legs);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not update');
        }
    };

    const remove = async () => {
        if (!removing) return;
        try {
            const res = await api.delete(`/admin/shipments/${shipmentId}/legs/${removing.id}`);
            setLegs(res.data.data.legs);
            toast.success('Leg removed');
            setRemoving(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not remove');
        }
    };

    const active = couriers.filter(c => c.is_active);
    const internalCost = legs.reduce((sum, l) => sum + (l.status !== 'cancelled' && l.cost ? l.cost : 0), 0);

    return (
        <Panel
            title="Courier"
            subtitle="Who is moving this shipment"
            icon={Truck}
            actions={<>
                <span className="osc-internal" title="Customers never see courier names, courier tracking numbers or costs"><EyeOff size={13} /> Internal</span>
                {canEdit && legs.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => openForm()}><Plus size={14} /> Add leg</button>}
            </>}
        >
            {loading ? <Loader /> : legs.length === 0 ? (
                <div className="osc-empty">
                    <p>No courier assigned yet.{suggested && <> The routing rules suggest <strong>{suggested.courier_name}</strong>.</>}</p>
                    {canEdit && (
                        <div className="o-row" style={{ gap: '0.5rem' }}>
                            {suggested && <button className="btn btn-primary btn-sm" onClick={() => openForm(undefined, suggested.courier_id)}><Wand2 size={14} /> Assign {suggested.courier_name}</button>}
                            <button className="btn btn-secondary btn-sm" onClick={() => openForm(undefined, '')}><Plus size={14} /> Choose a courier</button>
                        </div>
                    )}
                </div>
            ) : (
                <ol className="osc-legs">
                    {legs.map(leg => (
                        <li key={leg.id} className={`osc-leg ${leg.status}`}>
                            <span className="osc-seq">{leg.sequence}</span>
                            <div className="osc-body">
                                <div className="osc-head">
                                    <strong>{leg.courier_name}</strong>
                                    <StatusBadge status={leg.courier_type} label={leg.courier_type === 'internal' ? 'In-house' : 'Partner'} tone={leg.courier_type === 'internal' ? 'brand' : 'violet'} />
                                    {canEdit ? (
                                        <select className="osc-status" value={leg.status} onChange={e => quickStatus(leg, e.target.value as Leg['status'])} aria-label={`Leg ${leg.sequence} status`}>
                                            {Object.entries(LEG_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                                        </select>
                                    ) : <StatusBadge status={leg.status} label={LEG_STATUS[leg.status].label} tone={LEG_STATUS[leg.status].tone} />}
                                </div>
                                {(leg.from_location || leg.to_location) && (
                                    <p className="osc-route">{leg.from_location || '—'} <ArrowRight size={13} /> {leg.to_location || '—'}</p>
                                )}
                                <dl className="osc-meta">
                                    {leg.courier_tracking_number && (
                                        <><dt>Courier ref.</dt><dd>
                                            {leg.courier_tracking_link
                                                ? <a href={leg.courier_tracking_link} target="_blank" rel="noopener noreferrer" className="o-mono">{leg.courier_tracking_number} <ExternalLink size={12} /></a>
                                                : <span className="o-mono">{leg.courier_tracking_number}</span>}
                                        </dd></>
                                    )}
                                    {leg.service && <><dt>Service</dt><dd>{leg.service}</dd></>}
                                    {leg.cost !== null && <><dt>Our cost</dt><dd>{money(leg.cost)}</dd></>}
                                    <dt>Assigned</dt><dd>{leg.rule_id ? 'Automatically, by routing rule' : leg.assigned_by_name ? `By ${leg.assigned_by_name}` : 'Automatically'}</dd>
                                </dl>
                                {leg.notes && <p className="osc-notes">{leg.notes}</p>}
                                {!leg.courier_tracking_number && leg.courier_type === 'partner' && leg.status !== 'cancelled' && (
                                    <p className="osc-hint">Add the partner’s tracking number once it’s booked{leg.auto_tracking ? ' — updates will then sync automatically' : ''}.</p>
                                )}

                                {leg.auto_tracking && leg.courier_tracking_number && (
                                    <div className="osc-sync">
                                        <div className="osc-sync-head">
                                            <span className="osc-live"><Radio size={13} /> Auto-tracking</span>
                                            {leg.external_status && <strong>{EXTERNAL[leg.external_status] || leg.external_status}</strong>}
                                            {leg.external_status_text && <span className="o-muted">— {leg.external_status_text}</span>}
                                            {canEdit && (
                                                <button className="btn btn-secondary btn-sm" onClick={() => syncNow(leg)} disabled={syncing === leg.id}>
                                                    <RefreshCw size={13} className={syncing === leg.id ? 'spinning' : ''} /> Sync now
                                                </button>
                                            )}
                                        </div>
                                        <p className="osc-sync-meta">
                                            {leg.last_synced_at ? `Checked ${fmtDate(leg.last_synced_at, true)}` : 'Not checked yet — syncs automatically within the hour'}
                                            {leg.external_eta && ` · Courier ETA ${fmtDate(leg.external_eta, true)}`}
                                            {leg.publishes_to_customers ? ' · Updates are posted to the customer' : ' · Staff only — not posted to the customer'}
                                        </p>
                                        {leg.sync_error && <p className="osc-sync-error"><AlertTriangle size={13} /> {leg.sync_error}</p>}
                                        {leg.courier_events.length > 0 && (
                                            <>
                                                <button type="button" className="osc-scans-toggle" onClick={() => setOpenScans(o => ({ ...o, [leg.id]: !o[leg.id] }))} aria-expanded={!!openScans[leg.id]}>
                                                    <ChevronDown size={14} style={{ transform: openScans[leg.id] ? 'rotate(180deg)' : 'none' }} />
                                                    {leg.courier_events.length} courier scan{leg.courier_events.length === 1 ? '' : 's'}
                                                </button>
                                                {openScans[leg.id] && (
                                                    <ol className="osc-scans">
                                                        {leg.courier_events.map(ev => (
                                                            <li key={ev.id}>
                                                                <time>{fmtDate(ev.occurred_at, true)}</time>
                                                                <span>
                                                                    {ev.description || EXTERNAL[ev.status_code]}
                                                                    {ev.location && <small> · {ev.location}</small>}
                                                                    {ev.tracking_event_id && <em title="Posted to the customer's tracking page">posted</em>}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            {canEdit && (
                                <div className="osc-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => openForm(leg)} aria-label={`Edit leg ${leg.sequence}`}><Edit2 size={13} /></button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setRemoving(leg)} aria-label={`Remove leg ${leg.sequence}`}><Trash2 size={13} /></button>
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            {internalCost > 0 && <p className="osc-total">Courier cost so far: <strong>{money(internalCost)}</strong></p>}

            <Modal
                open={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? `Leg ${editing.sequence} — ${editing.courier_name}` : legs.length ? `Add leg ${legs.length + 1}` : 'Assign a courier'}
                subtitle="Internal only — the customer keeps seeing your tracking number and updates."
                width={600}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner" /> : 'Save'}</button>
                </>}
            >
                <div className="o-form-grid">
                    <Field label="Courier" full hint={!editing && suggested && form.courier_id === suggested.courier_id ? 'Suggested by your routing rules' : undefined}>
                        <select className="input" value={form.courier_id} onChange={e => set({ courier_id: e.target.value })}>
                            <option value="">Select a courier…</option>
                            {active.map(c => <option key={c.id} value={c.id}>{c.name}{c.type === 'internal' ? ' (in-house)' : ''}</option>)}
                        </select>
                    </Field>
                    <Field label="From"><input className="input" value={form.from_location} onChange={e => set({ from_location: e.target.value })} placeholder="e.g. Nairobi warehouse" /></Field>
                    <Field label="To"><input className="input" value={form.to_location} onChange={e => set({ to_location: e.target.value })} placeholder="e.g. Mogadishu" /></Field>
                    <Field label="Courier tracking / waybill no." hint="Their reference, not yours"><input className="input o-mono" value={form.courier_tracking_number} onChange={e => set({ courier_tracking_number: e.target.value })} /></Field>
                    <Field label="Service"><input className="input" value={form.service} onChange={e => set({ service: e.target.value })} placeholder="e.g. Express Worldwide" /></Field>
                    <Field label="Our cost" hint="What the courier charges us"><input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={e => set({ cost: e.target.value })} /></Field>
                    <Field label="Status">
                        <select className="input" value={form.status} onChange={e => set({ status: e.target.value as Leg['status'] })}>
                            {Object.entries(LEG_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Internal notes" full><textarea className="input" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>
                </div>
                <p className="o-muted" style={{ fontSize: '0.78rem', marginTop: '0.85rem' }}>
                    Manage couriers and routing rules in <Link href="/ops/couriers" style={{ color: 'var(--accent)' }}>Couriers</Link>.
                </p>
            </Modal>

            <Modal
                open={!!removing}
                onClose={() => setRemoving(null)}
                title={`Remove leg ${removing?.sequence}?`}
                width={440}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setRemoving(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={remove}>Remove</button>
                </>}
            >
                <p className="o-muted">{removing?.courier_name} will no longer be recorded as handling this shipment. To keep the history, set the leg to Cancelled instead.</p>
            </Modal>
        </Panel>
    );
}
