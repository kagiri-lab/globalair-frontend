'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Package, ArrowRight, CheckCircle, Truck, Clock, XCircle, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
    pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)', label: 'Pending', icon: <Clock size={16} /> },
    confirmed: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.3)', label: 'Confirmed', icon: <Check size={16} /> },
    picked_up: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.3)', label: 'Picked Up', icon: <Package size={16} /> },
    in_transit: { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.3)', label: 'In Transit', icon: <Truck size={16} /> },
    out_for_delivery: { color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.3)', label: 'Out for Delivery', icon: <Truck size={16} /> },
    delivered: { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.3)', label: 'Delivered', icon: <CheckCircle size={16} /> },
    cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', label: 'Cancelled', icon: <XCircle size={16} /> },
    failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', label: 'Failed', icon: <XCircle size={16} /> },
};

const STEPS = ['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];

function TrackingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) { setQuery(q); doSearch(q); }
    }, []);

    const doSearch = async (num: string) => {
        const n = num.trim().toUpperCase();
        if (!n) return;
        setLoading(true); setError(''); setResult(null);
        try {
            const res = await axios.get(`${API}/shipments/track/${encodeURIComponent(n)}`);
            setResult(res.data.data);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Tracking number not found');
        } finally { setLoading(false); }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) router.push(`/track?q=${encodeURIComponent(query.trim())}`);
        doSearch(query);
    };

    const cfg = result ? STATUS_CONFIG[result.shipment.status] || STATUS_CONFIG.pending : null;
    const currentStepIdx = result ? STEPS.indexOf(result.shipment.status) : -1;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#e2343a', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        <ArrowLeft size={16} /> Back to Shipping Portal
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(59,130,246,0.1)', borderRadius: 100, border: '1px solid rgba(59,130,246,0.25)' }}>
                            <Package size={14} color="var(--accent)" />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>Global Air Cargo Tracking</span>
                        </div>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Track Your Shipment</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Enter your tracking number to get live status updates</p>
                </div>

                {/* Search box */}
                <form onSubmit={handleSearch}>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="input"
                                style={{ paddingLeft: '2.5rem', height: 48, fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.04em' }}
                                placeholder="e.g. SHP-20240228-AB12"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ height: 48, paddingInline: '1.5rem', fontSize: '0.9375rem' }} disabled={loading}>
                            {loading ? <div className="spinner" /> : 'Track'}
                        </button>
                    </div>
                </form>

                {/* Error */}
                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                        <AlertCircle size={18} color="#ef4444" />
                        <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
                    </div>
                )}

                {/* Result */}
                {result && cfg && (
                    <div className="fade-in">
                        {/* Status card */}
                        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tracking Number</p>
                                    <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: cfg.color }}>{result.shipment.tracking_number}</p>
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, padding: '0.4rem 1rem', borderRadius: 100, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                                    {cfg.icon} {cfg.label}
                                </span>
                            </div>

                            {/* Route */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: '0.875rem', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={11} /> From</p>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{result.shipment.pickup_city}</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{result.shipment.pickup_country}</p>
                                </div>
                                <ArrowRight size={18} color="var(--text-muted)" />
                                <div style={{ background: 'rgba(139,92,246,0.08)', borderRadius: 10, padding: '0.875rem', border: '1px solid rgba(139,92,246,0.2)' }}>
                                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={11} /> To</p>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{result.shipment.destination_city}</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{result.shipment.destination_country}</p>
                                </div>
                            </div>

                            {result.shipment.estimated_delivery && result.shipment.status !== 'delivered' && result.shipment.status !== 'cancelled' && (
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    Est. delivery: <b>{new Date(result.shipment.estimated_delivery).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                                </p>
                            )}
                            {result.shipment.status === 'delivered' && result.shipment.delivered_at && (
                                <p style={{ fontSize: '0.8125rem', color: '#10b981', textAlign: 'center', fontWeight: 600 }}>
                                    ✅ Delivered on {new Date(result.shipment.delivered_at).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            )}
                        </div>

                        {/* Progress stepper */}
                        {!['cancelled', 'failed'].includes(result.shipment.status) && (
                            <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Shipment Progress</p>
                                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                    {STEPS.map((s, i) => {
                                        const done = i <= currentStepIdx;
                                        const active = i === currentStepIdx;
                                        const sc = STATUS_CONFIG[s];
                                        return (
                                            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'unset' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? sc.color : 'var(--bg-secondary)', border: `2px solid ${done ? sc.color : 'var(--border)'}`, transition: 'all 0.3s', boxShadow: active ? `0 0 12px ${sc.color}60` : 'none' }}>
                                                        {done ? <Check size={14} color="white" /> : <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</span>}
                                                    </div>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: done ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap', maxWidth: 56 }}>{sc.label}</span>
                                                </div>
                                                {i < STEPS.length - 1 && (
                                                    <div style={{ flex: 1, height: 2, marginBottom: '1rem', background: i < currentStepIdx ? STATUS_CONFIG[STEPS[i]].color : 'var(--border)', transition: 'background 0.3s' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        {result.events?.length > 0 && (
                            <div className="card">
                                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Tracking History</p>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, background: 'linear-gradient(to bottom, var(--accent), var(--border))', opacity: 0.3 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {[...result.events].reverse().map((ev: any, i: number) => (
                                            <div key={ev.id} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, zIndex: 1, background: i === 0 ? 'var(--accent)' : 'var(--bg-card)', border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: i === 0 ? '0 0 10px rgba(59,130,246,0.4)' : 'none' }}>
                                                    {i === 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{ev.title}</p>
                                                    {ev.location && <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '0.1rem' }}>📍 {ev.location}</p>}
                                                    {ev.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{ev.description}</p>}
                                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{new Date(ev.event_time).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            Have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link> to manage your shipments.
                        </p>
                    </div>
                )}

                {!result && !error && !loading && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Enter a tracking number above</p>
                        <p style={{ fontSize: '0.8125rem' }}>Format: SHP-YYYYMMDD-XXXX</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TrackPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <TrackingContent />
        </Suspense>
    );
}
