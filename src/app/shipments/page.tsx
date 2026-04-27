'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Plus, Search, Filter, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Shipment } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
    return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>;
}

const STATUSES = ['', 'draft', 'pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
    standard: { emoji: '📦', color: 'var(--text-secondary)' },
    express: { emoji: '⚡', color: '#8b5cf6' },
    overnight: { emoji: '🚀', color: '#ec4899' },
};

const MODE_CONFIG: Record<string, { emoji: string }> = {
    air: { emoji: '✈️' },
    sea: { emoji: '🚢' },
    road: { emoji: '🚛' },
};

export default function ShipmentsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const limit = 10;

    const load = (p: number, status: string) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(p), limit: String(limit) });
        if (status) params.set('status', status);
        api.get(`/shipments?${params}`).then((res) => {
            setShipments(res.data.data.shipments);
            setTotal(res.data.data.pagination.total);
            setPages(res.data.data.pagination.pages);
        }).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            load(page, statusFilter);
        }
    }, [page, statusFilter, user, authLoading, router]);

    if (authLoading || (loading && user)) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;
    }

    if (!user) return null;

    const onFilterChange = (s: string) => { setStatusFilter(s); setPage(1); };

    return (
        <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Shipments</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{total} total shipment{total !== 1 ? 's' : ''}</p>
                </div>
                <Link href="/shipments/new" className="btn btn-primary">
                    <Plus size={16} /> New Shipment
                </Link>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <Filter size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Filter:</span>
                {STATUSES.map((s) => (
                    <button
                        key={s || 'all'}
                        onClick={() => onFilterChange(s)}
                        className="btn btn-sm"
                        style={{
                            background: statusFilter === s ? 'var(--accent)' : 'var(--bg-card)',
                            color: statusFilter === s ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}`,
                            textTransform: 'capitalize',
                        }}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                ) : shipments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                        <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No shipments found</p>
                        <Link href="/shipments/new" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                            <Plus size={14} /> Create Shipment
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Header hidden on mobile, visible on lg screens contextually */}
                        <div className="hide-mobile" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '1rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Tracking / Route</span><span>Type</span><span>Weight</span><span>Price</span><span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {shipments.map((s) => (
                                <Link key={s.id} href={s.status === 'draft' ? `/shipments/new?draftId=${s.id}` : `/shipments/${s.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                    <div className="card-hover shipment-card-responsive" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', transition: 'background 0.15s', cursor: 'pointer' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                                <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 700 }}>{s.tracking_number}</span>
                                                <StatusBadge status={s.status} />
                                                {s.status === 'draft' && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 700 }}>Action Required</span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                                {s.pickup_city} → {s.destination_city}
                                            </p>
                                        </div>
                                        <div className="shipment-card-detail">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                <span>{MODE_CONFIG[s.transport_mode || 'air']?.emoji}</span>
                                                <span style={{ fontWeight: 600 }}>{TYPE_CONFIG[s.shipment_type]?.emoji}</span>
                                                <span style={{ textTransform: 'capitalize' }}>{s.shipment_type}</span>
                                            </div>
                                            {s.estimated_delivery && s.status !== 'draft' && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Est. {new Date(s.estimated_delivery).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                        <div className="shipment-card-detail">
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.total_weight_kg ? `${Number(s.total_weight_kg).toFixed(2)} kg` : '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end', flexShrink: 0 }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>${Number(s.total_price || 0).toLocaleString()}</span>
                                                {s.status === 'draft' && <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, marginTop: '0.1rem' }}>Complete →</p>}
                                            </div>
                                            <ArrowRight size={16} color="var(--text-muted)" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page {page} of {pages}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
