'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Package } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function InvoicePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [shipment, setShipment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/shipments/${id}`)
            .then(r => setShipment(r.data.data.shipment))
            .catch(() => router.push('/shipments'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
    if (!shipment) return null;

    const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
    const issueDate = new Date(shipment.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <>
            {/* Non-print toolbar */}
            <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href={`/shipments/${id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8125rem' }}>
                    <ArrowLeft size={15} /> Back
                </Link>
                <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Invoice — {shipment.tracking_number}</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                    <Printer size={14} /> Print / Save PDF
                </button>
            </div>

            {/* Invoice document */}
            <div className="invoice-page" style={{ maxWidth: 720, margin: '2rem auto', padding: '2rem', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={20} color="white" />
                        </div>
                        <div>
                            <p style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--accent)' }}>Global Air Cargo</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>LOGISTICS INVOICE</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>{shipment.tracking_number}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Issued: {issueDate}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Printed: {today}</p>
                    </div>
                </div>

                {/* Route */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'From (Pickup)', color: '#3b82f6', city: shipment.pickup_city, country: shipment.pickup_country, address: shipment.pickup_address, contact: shipment.pickup_contact_name, phone: shipment.pickup_contact_phone },
                        { label: 'To (Destination)', color: '#8b5cf6', city: shipment.destination_city, country: shipment.destination_country, address: shipment.destination_address, contact: shipment.destination_contact_name, phone: shipment.destination_contact_phone },
                    ].map(({ label, color, city, country, address, contact, phone }) => (
                        <div key={label} style={{ padding: '1rem', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10 }}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>{label}</p>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{city}, {country}</p>
                            {address && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{address}</p>}
                            {contact && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>👤 {contact}{phone ? ` · ${phone}` : ''}</p>}
                        </div>
                    ))}
                </div>

                {/* Shipment info row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Service', value: shipment.shipment_type, cap: true },
                        { label: 'Status', value: shipment.status.replace(/_/g, ' '), cap: true },
                        { label: 'Total Weight', value: `${Number(shipment.total_weight_kg || 0).toFixed(3)} kg` },
                        { label: 'Est. Delivery', value: shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—' },
                    ].map(({ label, value, cap }) => (
                        <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</p>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: cap ? 'capitalize' : 'none' }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Items table */}
                {shipment.items?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Package Contents</p>
                        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr', gap: '0.5rem', padding: '0.6rem 1rem', background: 'var(--bg-secondary)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <span>Description</span><span>Category</span><span>Weight</span><span>Qty</span><span style={{ textAlign: 'right' }}>Price</span>
                            </div>
                            {shipment.items.map((item: any, i: number) => (
                                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.8125rem', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{item.description}</span>
                                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                            {item.is_fragile && <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>🔮 Fragile</span>}
                                            {item.is_hazardous && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>⚠️ Hazardous</span>}
                                            {item.requires_refrigeration && <span style={{ fontSize: '0.65rem', color: '#60a5fa' }}>❄️ Refrigerated</span>}
                                        </div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)' }}>{item.category_name || '—'}</span>
                                    <span>{item.weight_kg} kg</span>
                                    <span>{item.quantity}</span>
                                    <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{item.item_price ? `USD ${Number(item.item_price).toLocaleString()}` : '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                    <div style={{ minWidth: 240, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total</span>
                            <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--accent)' }}>USD {Number(shipment.total_price || 0).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>All prices in US Dollars (USD)</p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thank you for shipping with <b>Global Air Cargo</b>. For support, contact support@globalaircargo.com</p>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .invoice-page { box-shadow: none; border: none; border-radius: 0; margin: 0; max-width: 100%; }
                }
            `}</style>
        </>
    );
}
