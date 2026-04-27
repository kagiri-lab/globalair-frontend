'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Package, Clock, CheckCircle, Truck, XCircle, Check } from 'lucide-react';
import api from '@/lib/api';
import { Shipment, TrackingEvent, ShipmentStatus } from '@/lib/types';
import toast from 'react-hot-toast';

function StatusBadge({ status }: { status: string }) {
    return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>;
}

const STATUS_ICONS: Record<ShipmentStatus, React.ReactNode> = {
    draft: <Clock size={16} />,
    pending: <Clock size={16} />,
    confirmed: <Check size={16} />,
    picked_up: <Package size={16} />,
    in_transit: <Truck size={16} />,
    out_for_delivery: <Truck size={16} />,
    delivered: <CheckCircle size={16} />,
    cancelled: <XCircle size={16} />,
    failed: <XCircle size={16} />,
};

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }: any) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
            <div className="card fade-in" style={{ maxWidth: 420, width: '100%', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <XCircle size={32} color="#ef4444" />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.75rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem', marginBottom: '2rem', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={onClose} disabled={loading} className="btn btn-secondary" style={{ flex: 1 }}>No, Keep it</button>
                    <button onClick={onConfirm} disabled={loading} className="btn btn-danger" style={{ flex: 1, minHeight: '44px' }}>
                        {loading ? <div className="spinner" style={{ borderTopColor: 'white' }} /> : 'Yes, Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ShipmentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const load = () => {
        api.get(`/shipments/${id}`).then((r) => setShipment(r.data.data.shipment)).catch(() => router.push('/shipments')).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const handleCancel = async () => {
        setCancelling(true);
        try {
            await api.patch(`/shipments/${id}/cancel`);
            toast.success('Shipment cancelled');
            setShowCancelModal(false);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        } finally { setCancelling(false); }
    };


    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
    if (!shipment) return null;

    return (
        <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <Link href="/shipments" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', marginTop: 4 }}>
                    <ArrowLeft size={16} /> Back
                </Link>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)' }}>{shipment.tracking_number}</h1>
                        <StatusBadge status={shipment.status} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Created {new Date(shipment.created_at).toLocaleString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {['pending', 'confirmed'].includes(shipment.status) && (
                        <button onClick={() => setShowCancelModal(true)} disabled={cancelling} className="btn btn-danger btn-sm">
                            {cancelling ? <><div className="spinner" /> Cancelling…</> : <><XCircle size={14} /> Cancel</>}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Route */}
                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Route</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div style={{ width: 32, height: 32, background: 'rgba(59,130,246,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <MapPin size={16} color="var(--accent)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Pickup</p>
                                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{shipment.pickup_city}, {shipment.pickup_country}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{shipment.pickup_address}</p>
                                {shipment.pickup_contact_name && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{shipment.pickup_contact_name} · {shipment.pickup_contact_phone}</p>}
                            </div>
                        </div>
                        <div style={{ width: 1, height: 20, background: 'var(--border)', marginLeft: 15 }} />
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div style={{ width: 32, height: 32, background: 'rgba(139,92,246,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <MapPin size={16} color="#8b5cf6" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Destination</p>
                                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{shipment.destination_city}, {shipment.destination_country}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{shipment.destination_address}</p>
                                {shipment.destination_contact_name && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{shipment.destination_contact_name} · {shipment.destination_contact_phone}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Summary</h3>
                    {[
                        ['Type', shipment.shipment_type],
                        ['Total Weight', shipment.total_weight_kg ? `${Number(shipment.total_weight_kg).toFixed(3)} kg` : '—'],
                        ['Est. Delivery', shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'],
                        ['Total Price', `$ ${Number(shipment.total_price || 0).toLocaleString()}`],
                    ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                            <span style={{ fontWeight: 700, textTransform: label === 'Type' ? 'capitalize' : 'none', color: label === 'Total Price' ? 'var(--accent)' : 'var(--text-primary)' }}>{val}</span>
                        </div>
                    ))}
                    {shipment.notes && (
                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notes</p>
                            {shipment.notes}
                        </div>
                    )}
                </div>
            </div>

            {/* Items */}
            {shipment.items && shipment.items.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Package Contents</h3>
                    {shipment.items.map((item) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 36, height: 36, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{item.category_icon || '📦'}</div>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.description}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {item.category_name} · {item.weight_kg} kg × {item.quantity}
                                        {item.length_cm && ` · ${item.length_cm}×${item.width_cm}×${item.height_cm} cm`}
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                        {item.is_fragile && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>🔮 Fragile</span>}
                                        {item.is_hazardous && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>⚠️ Hazardous</span>}
                                        {item.requires_refrigeration && <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>❄️ Refrigeration</span>}
                                    </div>
                                </div>
                            </div>
                            {item.item_price && <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>$ {Number(item.item_price).toLocaleString()}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Tracking Timeline */}
            {shipment.tracking_events && shipment.tracking_events.length > 0 && (
                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.9rem' }}>Tracking History</h3>
                    <div style={{ position: 'relative' }}>
                        {/* Vertical line */}
                        <div style={{ position: 'absolute', left: 10, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[...shipment.tracking_events].reverse().map((event, i) => (
                                <div key={event.id} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative' }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                                        background: i === 0 ? 'var(--accent)' : 'var(--bg-card)',
                                        border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-light)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: i === 0 ? 'white' : 'var(--text-muted)',
                                    }}>
                                        {i === 0 ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} /> : STATUS_ICONS[event.status as ShipmentStatus]}
                                    </div>
                                    <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{event.title}</p>
                                        {event.location && <p style={{ fontSize: '0.8125rem', color: 'var(--accent)', marginTop: '0.1rem' }}>📍 {event.location}</p>}
                                        {event.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{event.description}</p>}
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{new Date(event.event_time).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Cancel Confirmation Modal */}
            <ConfirmModal 
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancel}
                loading={cancelling}
                title="Cancel Shipment?"
                message="Are you sure you want to cancel this shipment? This action cannot be undone."
            />
        </div>
    );
}
