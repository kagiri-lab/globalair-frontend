'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Truck, CheckCircle, Clock, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Shipment } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
    return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

const TYPE_CONFIG: Record<string, { emoji: string }> = {
    standard: { emoji: '📦' },
    express: { emoji: '⚡' },
    overnight: { emoji: '🚀' },
};

const MODE_CONFIG: Record<string, { emoji: string }> = {
    air: { emoji: '✈️' },
    sea: { emoji: '🚢' },
    road: { emoji: '🚛' },
};

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            api.get('/shipments?limit=10').then((res) => {
                setShipments(res.data.data.shipments);
            }).catch(() => { }).finally(() => setLoading(false));
        }
    }, [user, authLoading, router]);

    if (authLoading || (loading && user)) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;
    }

    if (!user) return null;

    const stats = {
        total: shipments.length,
        inTransit: shipments.filter((s) => ['in_transit', 'picked_up', 'out_for_delivery'].includes(s.status)).length,
        delivered: shipments.filter((s) => s.status === 'delivered').length,
        pending: shipments.filter((s) => s.status === 'pending').length,
    };

    type StatItem = { label: string; value: number; icon: React.ComponentType<{ size?: number; color?: string }>; color: string; bg: string };

    const statItems: StatItem[] = [
        { label: 'Total Shipments', value: stats.total, icon: Package, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'In Transit', value: stats.inTransit, icon: Truck, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Pending', value: stats.pending, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name.split(' ')[0]} 👋
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Here&apos;s an overview of your shipments</p>
                </div>
                <Link href="/shipments/new" className="btn btn-primary">
                    <Plus size={16} /> New Shipment
                </Link>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {statItems.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card">
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={20} color={color} />
                        </div>
                        <div>
                            <p style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>{value}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Shipments */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Shipments</h2>
                    <Link href="/shipments" style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
                ) : shipments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No shipments yet</p>
                        <p style={{ fontSize: '0.875rem' }}>Create your first shipment to get started</p>
                        <Link href="/shipments/new" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                            <Plus size={14} /> Create Shipment
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {shipments.map((s) => (
                            <Link key={s.id} href={`/shipments/${s.id}`} style={{ textDecoration: 'none' }}>
                                <div className="card card-hover" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent)', fontFamily: 'monospace' }}>{s.tracking_number}</span>
                                            <StatusBadge status={s.status} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{MODE_CONFIG[s.transport_mode || 'air']?.emoji}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                {s.shipment_type}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.pickup_city}, {s.pickup_country} → {s.destination_city}, {s.destination_country}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>$ {Number(s.total_price || 0).toLocaleString()}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-muted)" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
