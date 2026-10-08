'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    MapPin, Flag, Package, RefreshCw, User, Download, Pencil, Map as MapIcon, Clock, ArrowRight, ChevronRight, Phone,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ShipmentMap from '@/components/ops/ShipmentMap';
import ShipmentCouriers from '@/components/ops/ShipmentCouriers';
import PaymentPanel from '@/components/ops/PaymentPanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import { OpsPage, Panel, StatusBadge, Table, Loader, Field, KeyValues, Avatar, money, fmtDate } from '@/components/ops/ui';

const STATUS_OPTIONS: [string, string][] = [
    ['confirmed', 'Confirmed'], ['picked_up', 'Picked up'], ['in_transit', 'In transit'],
    ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['failed', 'Delivery failed'],
];

export default function AdminShipmentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { hasPermission } = useAuth();
    const canUpdate = hasPermission('update_shipments');
    const canBill = hasPermission('manage_billing');
    const [paymentDue, setPaymentDue] = useState('');   // the "not paid yet" message when moving an unpaid shipment on
    const [shipment, setShipment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editItems, setEditItems] = useState<any[]>([]);
    const [googleMapsEnabled, setGoogleMapsEnabled] = useState(false);

    const load = async () => {
        try {
            const [sRes, settingsRes] = await Promise.all([
                api.get(`/admin/shipments/${id}`),
                api.get('/public/settings'),
            ]);
            const s = sRes.data.data.shipment;
            setShipment(s);
            setEditItems(s.items.map((i: any) => ({ id: i.id, quantity: i.quantity, item_price: i.item_price ? i.item_price.toString() : '0' })));
            setGoogleMapsEnabled(settingsRes.data.data.settings.google_maps_enabled === 'true');
            // Show the tracking number in the top-bar breadcrumb
            window.dispatchEvent(new CustomEvent('set-header-title', { detail: s.tracking_number }));
        } catch (err) {
            console.error('Failed to load shipment', err);
            toast.error('Could not load shipment details');
            router.push('/ops/shipments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // While editing, the total follows the item prices × quantities
    const editTotal = editItems.reduce((acc, item) => acc + Number(item.item_price || 0) * (Number(item.quantity) || 0), 0);

    const handleUpdate = async (allowUnpaid = false) => {
        if (!newStatus) { toast.error('Select a status'); return; }
        setUpdating(true);
        try {
            await api.patch(`/admin/shipments/${id}/status`, {
                status: newStatus, location, description, ...(allowUnpaid ? { allow_unpaid: true } : {}),
            });
            toast.success('Status updated — the customer has been notified');
            setNewStatus(''); setLocation(''); setDescription(''); setPaymentDue('');
            load();
        } catch (err: any) {
            // Pay before pickup: ask before moving an unpaid shipment on
            if (err.response?.data?.code === 'PAYMENT_DUE') setPaymentDue(err.response.data.message);
            else toast.error(err.response?.data?.message || 'Update failed');
        } finally { setUpdating(false); }
    };

    const handleSaveChanges = async () => {
        setUpdating(true);
        try {
            await api.patch(`/admin/shipments/${id}`, { total_price: Number(editTotal.toFixed(2)), items: editItems });
            toast.success('Shipment updated');
            setIsEditing(false);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally { setUpdating(false); }
    };

    const handleDownload = async () => {
        if (!shipment) return;
        setDownloading(true);
        try {
            const response = await api.get(`/admin/shipments/${id}/invoice`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = Object.assign(document.createElement('a'), { href: url, download: `Invoice-${shipment.tracking_number}.pdf` });
            link.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to download invoice');
        } finally { setDownloading(false); }
    };

    if (loading) return <Loader label="Loading shipment…" />;
    if (!shipment) return null;

    const editable = canUpdate && (shipment.status === 'pending' || shipment.status === 'draft');
    const events = [...(shipment.tracking_events || [])].sort((a: any, b: any) => +new Date(b.event_time) - +new Date(a.event_time));
    const hasMap = googleMapsEnabled && (shipment.pickup_latitude || shipment.destination_latitude);

    return (
        <OpsPage
            back={{ href: '/ops/shipments', label: 'All shipments' }}
            title={<span className="o-row" style={{ gap: '0.75rem' }}><span className="o-mono">{shipment.tracking_number}</span> <StatusBadge status={shipment.status} /></span>}
            subtitle={`Booked ${fmtDate(shipment.created_at, true)} · ${shipment.shipment_type} service${shipment.transport_mode ? ` · ${shipment.transport_mode} freight` : ''}`}
            actions={<>
                {editable && (isEditing ? (
                    <>
                        <button onClick={() => setIsEditing(false)} className="btn btn-secondary" disabled={updating}>Cancel</button>
                        <button onClick={handleSaveChanges} className="btn btn-primary" disabled={updating}>{updating ? <div className="spinner" /> : 'Save changes'}</button>
                    </>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="btn btn-secondary"><Pencil size={15} /> Edit pricing</button>
                ))}
                <button onClick={handleDownload} disabled={downloading} className="btn btn-primary">
                    {downloading ? <div className="spinner" /> : <Download size={16} />} Invoice PDF
                </button>
            </>}
        >
            <div className="o-grid-main">
                <div style={{ minWidth: 0 }}>
                    {/* Route */}
                    <Panel title="Route" icon={MapPin}>
                        <div className="osd-route">
                            {[
                                { label: 'Pickup', icon: MapPin, city: shipment.pickup_city, country: shipment.pickup_country, address: shipment.pickup_address, contact: shipment.pickup_contact_name, phone: shipment.pickup_contact_phone },
                                { label: 'Delivery', icon: Flag, city: shipment.destination_city, country: shipment.destination_country, address: shipment.destination_address, contact: shipment.destination_contact_name, phone: shipment.destination_contact_phone },
                            ].map(({ label, icon: Icon, city, country, address, contact, phone }, i) => (
                                <div key={label} className="osd-stop">
                                    <span className="osd-stop-label"><Icon size={13} /> {label}</span>
                                    <strong>{city}, {country}</strong>
                                    <p>{address}</p>
                                    {(contact || phone) && (
                                        <p className="osd-contact">
                                            {contact && <><User size={13} /> {contact}</>}
                                            {phone && <a href={`tel:${phone}`}><Phone size={13} /> {phone}</a>}
                                        </p>
                                    )}
                                    {i === 0 && <span className="osd-arrow"><ArrowRight size={16} /></span>}
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* Items */}
                    <Panel title={`Items (${shipment.items?.length || 0})`} icon={Package} flush
                        subtitle={isEditing ? 'Adjust quantities — the total updates automatically' : undefined}>
                        <Table minWidth={560}>
                            <thead>
                                <tr><th>Description</th><th>Category</th><th>Weight × Qty</th><th className="num">Amount</th></tr>
                            </thead>
                            <tbody>
                                {(shipment.items || []).map((item: any) => {
                                    const edit = editItems.find(ei => ei.id === item.id);
                                    const qty = isEditing ? edit?.quantity : item.quantity;
                                    const unit = isEditing ? Number(edit?.item_price || 0) : Number(item.item_price || 0);
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <strong style={{ color: 'var(--text-primary)' }}>{item.description}</strong>
                                                {!!(item.is_fragile || item.is_hazardous || item.requires_refrigeration) && (
                                                    <div className="o-row" style={{ gap: '0.3rem', marginTop: '0.25rem' }}>
                                                        {!!item.is_fragile && <StatusBadge status="fragile" label="Fragile" tone="warning" />}
                                                        {!!item.is_hazardous && <StatusBadge status="hazardous" label="Hazardous" tone="danger" />}
                                                        {!!item.requires_refrigeration && <StatusBadge status="cold" label="Cold chain" tone="info" />}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{item.category_name}</td>
                                            <td>
                                                {Number(item.weight_kg)} kg ×{' '}
                                                {isEditing ? (
                                                    <input type="number" min="1" className="input" style={{ width: 70, height: 32, display: 'inline-block', textAlign: 'center' }}
                                                        value={edit?.quantity || 1}
                                                        onChange={e => {
                                                            const q = parseInt(e.target.value) || 1;
                                                            setEditItems(prev => prev.map(ei => (ei.id === item.id ? { ...ei, quantity: q } : ei)));
                                                        }} />
                                                ) : <b>{item.quantity}</b>}
                                            </td>
                                            <td className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{money(unit * (Number(qty) || 1))}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} style={{ fontWeight: 600 }}>Total {isEditing && <span className="o-muted" style={{ fontWeight: 400 }}>(updated)</span>}</td>
                                    <td className="num" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)' }}>{money(isEditing ? editTotal : shipment.total_price)}</td>
                                </tr>
                            </tfoot>
                        </Table>
                    </Panel>

                    <ShipmentCouriers shipmentId={shipment.id} canEdit={canUpdate} pickupCity={shipment.pickup_city} destinationCity={shipment.destination_city} onShipmentChanged={load} />

                    {hasMap && (
                        <Panel title="Map" icon={MapIcon} flush>
                            <div style={{ height: 380, borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                                <ShipmentMap
                                    pickup={shipment.pickup_latitude ? { lat: Number(shipment.pickup_latitude), lng: Number(shipment.pickup_longitude), address: shipment.pickup_address } : undefined}
                                    destination={shipment.destination_latitude ? { lat: Number(shipment.destination_latitude), lng: Number(shipment.destination_longitude), address: shipment.destination_address } : undefined}
                                />
                            </div>
                        </Panel>
                    )}

                    {/* Timeline */}
                    <Panel title="Tracking history" icon={Clock}>
                        {events.length === 0 ? <p className="o-muted">No tracking events yet.</p> : (
                            <ol className="osd-timeline">
                                {events.map((ev: any, i: number) => (
                                    <li key={ev.id} className={i === 0 ? 'latest' : ''}>
                                        <span className="osd-dot" />
                                        <div>
                                            <div className="o-row" style={{ justifyContent: 'space-between' }}>
                                                <strong>{ev.title}</strong>
                                                <time>{fmtDate(ev.event_time, true)}</time>
                                            </div>
                                            {ev.location && <p className="osd-loc"><MapPin size={13} /> {ev.location}</p>}
                                            {ev.description && <p className="o-muted" style={{ fontSize: '0.85rem' }}>{ev.description}</p>}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>
                </div>

                {/* Side column */}
                <div style={{ minWidth: 0 }}>
                    <Panel title="Customer" icon={User}>
                        <Link href={`/ops/customers/${shipment.user_id}`} className="osd-customer">
                            <Avatar name={shipment.customer_name} size={40} />
                            <span style={{ minWidth: 0, flex: 1 }}>
                                <strong>{shipment.customer_name}</strong>
                                <small>{shipment.customer_email}</small>
                            </span>
                            <ChevronRight size={16} />
                        </Link>
                    </Panel>

                    <PaymentPanel shipment={shipment} canManage={canBill} onChanged={load} />

                    <Panel title="Summary">
                        <KeyValues rows={[
                            ['Service', <span key="s" style={{ textTransform: 'capitalize' }}>{shipment.shipment_type}</span>],
                            ['Transport', <span key="m" style={{ textTransform: 'capitalize' }}>{shipment.transport_mode || '—'}</span>],
                            ['Total weight', `${Number(shipment.total_weight_kg || 0).toFixed(2)} kg`],
                            ['Estimated delivery', shipment.estimated_delivery ? fmtDate(shipment.estimated_delivery) : 'To be scheduled'],
                            ['Amount', <span key="a" style={{ color: 'var(--accent)' }}>{money(shipment.total_price)}</span>],
                        ]} />
                    </Panel>

                    {canUpdate && (
                        <Panel title="Update status" icon={RefreshCw} subtitle="The customer sees this on their tracking page">
                            <div className="o-stack">
                                <Field label="New status">
                                    <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                                        <option value="">Select a status…</option>
                                        {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </Field>
                                <Field label="Location">
                                    <input className="input" placeholder="e.g. JKIA Cargo Terminal" value={location} onChange={e => setLocation(e.target.value)} />
                                </Field>
                                <Field label="Note for the customer" hint="Optional">
                                    <textarea className="input" rows={3} placeholder="e.g. Departed on the morning charter flight" value={description} onChange={e => setDescription(e.target.value)} />
                                </Field>
                                <button className="btn btn-primary btn-full" onClick={() => handleUpdate()} disabled={updating || !newStatus}>
                                    {updating ? <div className="spinner" /> : 'Post update'}
                                </button>
                            </div>
                        </Panel>
                    )}
                </div>
            </div>
            <ConfirmDialog open={!!paymentDue} title="Not paid yet" message={<>{paymentDue}<br /><br />Continue only if they’re paying at collection or you’ve agreed otherwise.</>}
                confirmLabel="Continue anyway" cancelLabel="Go back" busy={updating}
                onConfirm={() => handleUpdate(true)} onClose={() => setPaymentDue('')} />
        </OpsPage>
    );
}
