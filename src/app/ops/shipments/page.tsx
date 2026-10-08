'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Package, Truck, Clock, CheckCircle2, Download, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
    OpsPage, StatGrid, Stat, Panel, Toolbar, SearchInput, StatusBadge, Table, Loader, EmptyState, Pager,
    money, fmtDate, downloadCsv,
} from '@/components/ops/ui';

const STATUS_OPTIONS: [string, string][] = [
    ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['picked_up', 'Picked up'], ['in_transit', 'In transit'],
    ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['failed', 'Failed'],
];

export default function AdminShipmentsPage() {
    return (
        <Suspense fallback={<Loader />}>
            <AdminShipmentsContent />
        </Suspense>
    );
}

function AdminShipmentsContent() {
    const router = useRouter();
    const { hasPermission } = useAuth();
    // ?q= comes from the ops top-bar search
    const searchParams = useSearchParams();
    const urlQuery = searchParams.get('q') || '';
    const urlCourier = searchParams.get('courier') || '';
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [status, setStatus] = useState(searchParams.get('status') || ''); // e.g. from the dashboard's "Needs attention"
    const [courier, setCourier] = useState(urlCourier);
    const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([]);
    const [search, setSearch] = useState(urlQuery);
    const [debounced, setDebounced] = useState(urlQuery);
    const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
    if (urlQuery !== lastUrlQuery) {
        setLastUrlQuery(urlQuery);
        setSearch(urlQuery);
        setPage(1);
    }

    // Couriers are internal: this list (and the filter) is staff-only
    useEffect(() => {
        api.get('/admin/couriers').then(r => setCouriers(r.data.data.couriers)).catch(() => { });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const buildParams = (p: number, limit: number) => {
        const params = new URLSearchParams({ page: String(p), limit: String(limit) });
        if (status) params.set('status', status);
        if (debounced) params.set('search', debounced);
        if (courier) params.set('courier_id', courier);
        return params;
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.get(`/admin/shipments?${buildParams(page, 15)}`).then(r => {
            if (cancelled) return;
            setShipments(r.data.data.shipments);
            setTotal(r.data.data.pagination.total);
            setPages(r.data.data.pagination.pages);
            if (r.data.data.stats) setStats(r.data.data.stats);
        }).catch(() => toast.error('Could not load shipments')).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [page, status, debounced, courier]); // eslint-disable-line react-hooks/exhaustive-deps

    // Export every shipment matching the current filters
    const exportCsv = async () => {
        setExporting(true);
        try {
            const r = await api.get(`/admin/shipments?${buildParams(1, 5000)}`);
            const rows = r.data.data.shipments.map((s: any) => ({
                tracking_number: s.tracking_number,
                status: s.status,
                customer: s.customer_name,
                customer_email: s.customer_email,
                from: `${s.pickup_city}, ${s.pickup_country}`,
                to: `${s.destination_city}, ${s.destination_country}`,
                service: s.shipment_type,
                mode: s.transport_mode,
                courier: s.courier_name || '',
                weight_kg: s.total_weight_kg,
                price_usd: s.total_price,
                booked: s.created_at,
            }));
            if (!rows.length) { toast.error('Nothing to export'); return; }
            downloadCsv(`shipments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
            toast.success(`Exported ${rows.length} shipments`);
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const pickStatus = (s: string) => { setStatus(prev => (prev === s ? '' : s)); setPage(1); };
    const allTotal = Object.values(stats).reduce((a, b) => a + (Number(b) || 0), 0) || total;

    return (
        <OpsPage
            title="Shipments"
            subtitle={`${total.toLocaleString()} ${status || debounced || courier ? 'matching' : 'total'} shipment${total === 1 ? '' : 's'}`}
            actions={<>
                <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
                    {exporting ? <div className="spinner" /> : <Download size={16} />} Export CSV
                </button>
                {hasPermission('update_shipments') && (
                    <Link href="/ops/shipments/new" className="btn btn-primary"><Plus size={16} /> New shipment</Link>
                )}
            </>}
        >
            <StatGrid>
                <Stat icon={Package} label="All shipments" value={allTotal.toLocaleString()} tone="neutral" onClick={() => pickStatus('')} active={!status} />
                <Stat icon={Clock} label="Pending" value={(stats.pending || 0).toLocaleString()} tone="warning" onClick={() => pickStatus('pending')} active={status === 'pending'} />
                <Stat icon={Truck} label="In transit" value={(stats.in_transit || 0).toLocaleString()} tone="brand" onClick={() => pickStatus('in_transit')} active={status === 'in_transit'} />
                <Stat icon={CheckCircle2} label="Delivered" value={(stats.delivered || 0).toLocaleString()} tone="success" onClick={() => pickStatus('delivered')} active={status === 'delivered'} />
            </StatGrid>

            <Toolbar>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search tracking number, customer or city…" />
                <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {couriers.length > 1 && (
                    <select className="input" value={courier} onChange={e => { setCourier(e.target.value); setPage(1); }} aria-label="Filter by courier">
                        <option value="">All couriers</option>
                        {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
            </Toolbar>

            <Panel flush>
                {loading && !shipments.length ? <Loader label="Loading shipments…" /> : shipments.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No shipments found"
                        text={status || debounced || courier ? 'Try a different search or status filter.' : 'Shipments booked by customers or staff will appear here.'}
                    />
                ) : (
                    <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                        <Table minWidth={880}>
                            <thead>
                                <tr>
                                    <th>Shipment</th>
                                    <th>Customer</th>
                                    <th>Route</th>
                                    <th>Status</th>
                                    <th className="o-hide-sm">Courier</th>
                                    <th className="o-hide-sm">Booked</th>
                                    <th className="num">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.map((s: any) => (
                                    <tr key={s.id} className="o-clickable" onClick={() => router.push(`/ops/shipments/${s.id}`)}>
                                        <td>
                                            <Link href={`/ops/shipments/${s.id}`} className="o-tn" onClick={e => e.stopPropagation()}>{s.tracking_number}</Link>
                                            <div className="o-muted" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{s.shipment_type}{s.transport_mode ? ` · ${s.transport_mode}` : ''}</div>
                                        </td>
                                        <td>
                                            <div className="o-cell-main" style={{ display: 'block' }}>
                                                <strong>{s.customer_name || '—'}</strong>
                                                <small>{s.customer_email}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="o-row" style={{ gap: '0.4rem', flexWrap: 'nowrap', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                {s.pickup_city} <ArrowRight size={13} className="o-muted" /> {s.destination_city}
                                            </span>
                                        </td>
                                        <td><StatusBadge status={s.status} /></td>
                                        <td className="o-hide-sm o-muted">{s.courier_name || '—'}</td>
                                        <td className="o-hide-sm">{fmtDate(s.created_at)}</td>
                                        <td className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{money(s.total_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
                <Pager page={page} pages={pages} total={total} noun="shipments" onChange={setPage} />
            </Panel>
        </OpsPage>
    );
}
