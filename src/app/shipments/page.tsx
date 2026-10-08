'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Package, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Shipment } from '@/lib/types';
import ShipmentRow, { ListHead, statusLabel } from '@/components/portal/ShipmentRow';

const STATUSES = ['', 'draft', 'pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];
const LIMIT = 10;

export default function ShipmentsPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <ShipmentsList />
        </Suspense>
    );
}

function ShipmentsList() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    // The filter lives in the URL so dashboard links (and the back button) land on the right tab
    const statusFilter = STATUSES.includes(searchParams.get('status') || '') ? searchParams.get('status') || '' : '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);

    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loadedKey, setLoadedKey] = useState('');
    const requestKey = `${statusFilter}#${page}`;
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        if (!user) return; // the layout handles redirects
        let cancelled = false;
        const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
        if (statusFilter) params.set('status', statusFilter);
        api.get(`/shipments?${params}`).then((res) => {
            if (cancelled) return;
            setShipments(res.data.data.shipments);
            setCounts(res.data.data.status_counts || {});
            setTotal(res.data.data.pagination.total);
            setPages(res.data.data.pagination.pages || 1);
        }).catch(() => { }).finally(() => { if (!cancelled) setLoadedKey(requestKey); });
        return () => { cancelled = true; };
    }, [user, statusFilter, page, requestKey]);

    const go = (status: string, p = 1) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (p > 1) params.set('page', String(p));
        router.replace(`/shipments${params.toString() ? `?${params}` : ''}`, { scroll: false });
    };

    if (!user) return null;

    const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

    return (
        <div className="portal-page">
            <div className="portal-page-head">
                <div>
                    <h1>My Shipments</h1>
                    <p>{allCount} shipment{allCount === 1 ? '' : 's'} in total</p>
                </div>
                <Link href="/shipments/new" className="btn btn-primary"><Plus size={16} /> New Shipment</Link>
            </div>

            {/* Status tabs */}
            <div className="portal-tabs" role="tablist" aria-label="Filter by status">
                {STATUSES.map(s => {
                    const n = s ? counts[s] || 0 : allCount;
                    if (s && !n && s !== statusFilter) return null; // hide empty statuses
                    return (
                        <button key={s || 'all'} role="tab" aria-selected={statusFilter === s} className={statusFilter === s ? 'active' : ''} onClick={() => go(s)}>
                            {s ? statusLabel(s) : 'All'} <em>{n}</em>
                        </button>
                    );
                })}
            </div>

            <div className="portal-list" style={{ opacity: loading && shipments.length ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                {loading && !shipments.length ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                ) : shipments.length === 0 ? (
                    <div className="portal-empty">
                        <Package size={40} style={{ opacity: 0.35 }} />
                        <h3>{statusFilter ? `No ${statusLabel(statusFilter)} shipments` : 'No shipments yet'}</h3>
                        <p>{statusFilter ? 'Try another status filter.' : 'Create your first shipment to get started.'}</p>
                        {!statusFilter && <Link href="/shipments/new" className="btn btn-primary" style={{ marginTop: '1rem' }}><Plus size={16} /> Create Shipment</Link>}
                    </div>
                ) : (
                    <>
                        <ListHead />
                        {shipments.map(s => <ShipmentRow key={s.id} shipment={s} />)}
                    </>
                )}
            </div>

            {pages > 1 && (
                <div className="portal-pager">
                    <button className="btn btn-secondary btn-sm" onClick={() => go(statusFilter, page - 1)} disabled={page <= 1} aria-label="Previous page">
                        <ChevronLeft size={16} />
                    </button>
                    <span>Page {page} of {pages} · {total} result{total === 1 ? '' : 's'}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => go(statusFilter, page + 1)} disabled={page >= pages} aria-label="Next page">
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
