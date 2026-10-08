'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Package, Users, DollarSign, ArrowRight, Plus, BarChart3, Route, Activity, TrendingUp, TrendingDown, Minus,
    Inbox, MessageSquare, FileText, CheckCircle2, Clock, Receipt,
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Panel, Segmented, StatusBadge, Loader, EmptyState, money } from '@/components/ops/ui';
import SetupChecklist from '@/components/ops/SetupChecklist';

const STATUS_COLORS: Record<string, string> = {
    pending: '#d97706', confirmed: '#2563eb', picked_up: '#7c3aed', in_transit: '#e53a40',
    out_for_delivery: '#a855f7', delivered: '#059669', cancelled: '#94a3b8', failed: '#dc2626', draft: '#cbd5e1',
};

// $1,234 → "$1.2k"; small values stay exact
const compactMoney = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`);

const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} min ago`;
    if (m < 1440) return `${Math.round(m / 60)} h ago`;
    const d = Math.round(m / 1440);
    return d < 7 ? `${d} d ago` : new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

/** Change vs the previous 30 days: "+12%", or "New" when there was nothing before */
function Trend({ now, before }: { now: number; before: number }) {
    if (!now && !before) return <span className="odb-trend flat"><Minus size={13} /> No change</span>;
    if (!before) return <span className="odb-trend up"><TrendingUp size={13} /> New</span>;
    const pct = Math.round(((now - before) / before) * 100);
    if (pct === 0) return <span className="odb-trend flat"><Minus size={13} /> Same as before</span>;
    return pct > 0
        ? <span className="odb-trend up"><TrendingUp size={13} /> +{pct}%</span>
        : <span className="odb-trend down"><TrendingDown size={13} /> {pct}%</span>;
}

type Todo = { n: number; label: string; icon: typeof Clock; href: string; tone: string };

export default function AdminDashboardPage() {
    const { hasPermission } = useAuth();
    const [data, setData] = useState<any>(null);
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [metric, setMetric] = useState<'revenue' | 'count'>('revenue');

    useEffect(() => {
        Promise.all([api.get('/admin/dashboard'), api.get('/analytics/routes').catch(() => null)])
            .then(([dash, r]) => { setData(dash.data.data); setRoutes(r?.data.data || []); })
            .catch(err => console.error('Failed to load dashboard', err))
            .finally(() => setLoading(false));
    }, []);

    const s = data?.stats || {};
    const cur = data?.period?.current || { revenue: 0, shipments: 0, customers: 0 };
    const prev = data?.period?.previous || { revenue: 0, shipments: 0, customers: 0 };
    const att = data?.attention || {};

    const series = (data?.period?.series || []).map((d: any) => ({
        name: new Date(`${d.day}T00:00:00`).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenue: d.revenue, count: d.count,
    }));
    const hasActivity = series.some((d: any) => d.revenue || d.count);

    const statusData = Object.entries(s.status_breakdown || {})
        .map(([key, value]) => ({ key, name: key.replace(/_/g, ' '), value: Number(value), color: STATUS_COLORS[key] || '#cbd5e1' }))
        .filter(i => i.value > 0)
        .sort((a, b) => b.value - a.value);
    const statusTotal = statusData.reduce((n, i) => n + i.value, 0);

    // Only what someone can act on, each linking straight to it
    const todo = ([
        hasPermission('view_shipments') && { n: att.pending_shipments, label: 'Shipments to confirm', icon: Clock, href: '/ops/shipments?status=pending', tone: 'warning' },
        hasPermission('manage_support') && { n: att.quotes_to_book, label: 'Accepted quotes to book', icon: CheckCircle2, href: '/ops/support', tone: 'success' },
        hasPermission('manage_support') && { n: att.quotes_to_price, label: 'Quotes to price', icon: FileText, href: '/ops/support', tone: 'brand' },
        hasPermission('manage_support') && { n: att.new_enquiries, label: 'New website enquiries', icon: Inbox, href: '/ops/support', tone: 'info' },
        hasPermission('manage_support') && { n: att.open_tickets, label: 'Open support tickets', icon: MessageSquare, href: '/ops/support', tone: 'violet' },
    ] as (Todo | false)[]).filter((t): t is Todo => !!t && t.n > 0);

    const avg = cur.shipments ? cur.revenue / cur.shipments : 0;
    const avgPrev = prev.shipments ? prev.revenue / prev.shipments : 0;

    return (
        <div className="o-page fade-in odb">
            <header className="odb-head">
                <div>
                    <h1>Dashboard</h1>
                    <p>Last 30 days</p>
                </div>
                <div className="odb-head-actions">
                    {hasPermission('view_shipments') && <Link href="/ops/shipments" className="btn btn-secondary">Shipments</Link>}
                    {hasPermission('update_shipments') && <Link href="/ops/shipments/new" className="btn btn-primary"><Plus size={16} /> New shipment</Link>}
                </div>
            </header>

            {hasPermission('view_settings') && <SetupChecklist />}

            {loading ? <Loader label="Loading…" /> : (
                <>
                    {/* Needs attention */}
                    {todo.length > 0 ? (
                        <div className="odb-todo">
                            {todo.map(t => (
                                <Link key={t.label} href={t.href} className={`odb-todo-item tone-${t.tone}`}>
                                    <t.icon size={18} />
                                    <strong>{t.n}</strong>
                                    <span>{t.label}</span>
                                    <ArrowRight size={15} className="odb-todo-go" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="odb-clear"><CheckCircle2 size={18} /> All caught up: nothing is waiting on the team.</div>
                    )}

                    {/* Numbers */}
                    <div className="odb-kpis">
                        <div className="odb-kpi">
                            <span className="odb-kpi-label"><DollarSign size={15} /> Revenue</span>
                            <strong>{money(cur.revenue)}</strong>
                            <Trend now={cur.revenue} before={prev.revenue} />
                        </div>
                        <div className="odb-kpi">
                            <span className="odb-kpi-label"><Package size={15} /> Shipments</span>
                            <strong>{cur.shipments.toLocaleString()}</strong>
                            <Trend now={cur.shipments} before={prev.shipments} />
                        </div>
                        <div className="odb-kpi">
                            <span className="odb-kpi-label"><Receipt size={15} /> Average shipment</span>
                            <strong>{money(avg)}</strong>
                            <Trend now={avg} before={avgPrev} />
                        </div>
                        <div className="odb-kpi">
                            <span className="odb-kpi-label"><Users size={15} /> New customers</span>
                            <strong>{cur.customers.toLocaleString()}</strong>
                            {hasPermission('view_customers')
                                ? <Link href="/ops/customers" className="odb-kpi-sub">{(s.total_users || 0).toLocaleString()} in total <ArrowRight size={12} /></Link>
                                : <span className="odb-kpi-sub">{(s.total_users || 0).toLocaleString()} in total</span>}
                        </div>
                    </div>

                    <div className="odb-row">
                        <Panel
                            title={metric === 'revenue' ? 'Revenue by day' : 'Shipments by day'}
                            icon={BarChart3}
                            actions={<Segmented value={metric} onChange={setMetric} options={[{ value: 'revenue', label: 'Revenue' }, { value: 'count', label: 'Shipments' }]} />}
                        >
                            {!hasActivity ? <EmptyState icon={BarChart3} title="No bookings in the last 30 days" text="Daily totals will show here as shipments are booked." /> : (
                                <div style={{ width: '100%', height: 240 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={series} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="odbArea" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#e53a40" stopOpacity={0.16} />
                                                    <stop offset="95%" stopColor="#e53a40" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={6} interval="preserveStartEnd" minTickGap={24} />
                                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={44} allowDecimals={metric === 'revenue'}
                                                tickFormatter={v => (metric === 'revenue' ? compactMoney(v) : String(v))} />
                                            <Tooltip
                                                formatter={(v) => [metric === 'revenue' ? money(Number(v)) : `${v} shipments`, metric === 'revenue' ? 'Revenue' : 'Shipments']}
                                                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,0.08)', fontSize: 13 }}
                                            />
                                            <Area type="monotone" dataKey={metric} stroke="#e53a40" strokeWidth={2} fill="url(#odbArea)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Panel>

                        <Panel title="All shipments by status" icon={Activity}>
                            {statusData.length === 0 ? <EmptyState icon={Package} title="No shipments yet" /> : (
                                <>
                                    <div className="odb-statusbar" aria-hidden="true">
                                        {statusData.map(i => <span key={i.key} style={{ width: `${(i.value / statusTotal) * 100}%`, background: i.color }} />)}
                                    </div>
                                    <ul className="odb-status">
                                        {statusData.map(i => (
                                            <li key={i.key}>
                                                <Link href={`/ops/shipments?status=${i.key}`}>
                                                    <i style={{ background: i.color }} />
                                                    <span>{i.name}</span>
                                                    <b>{i.value}</b>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </Panel>
                    </div>

                    <div className="odb-row">
                        <Panel title="Latest shipments" icon={Package} flush
                            actions={hasPermission('view_shipments') && <Link href="/ops/shipments" className="btn btn-secondary btn-sm">View all <ArrowRight size={14} /></Link>}>
                            {(data?.recent_shipments || []).length === 0 ? <EmptyState icon={Package} title="No shipments yet" /> : (
                                <ul className="odb-latest">
                                    {(data.recent_shipments as any[]).slice(0, 6).map(sh => (
                                        <li key={sh.id}>
                                            <Link href={`/ops/shipments/${sh.id}`}>
                                                <span className="odb-latest-main">
                                                    <strong className="o-tn">{sh.tracking_number}</strong>
                                                    <small>{sh.customer_name} · {sh.pickup_city} → {sh.destination_city}</small>
                                                </span>
                                                <StatusBadge status={sh.status} />
                                                <span className="odb-latest-amt">
                                                    <b>{money(sh.total_price)}</b>
                                                    <small>{ago(sh.created_at)}</small>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel title="Top routes" icon={Route}>
                            {routes.length === 0 ? <EmptyState icon={Route} title="No routes yet" /> : (
                                <ol className="ops-routes">
                                    {routes.slice(0, 5).map((r: any, i: number) => {
                                        const max = Math.max(...routes.slice(0, 5).map((x: any) => Number(x.count) || 0), 1);
                                        return (
                                            <li key={i}>
                                                <span className="ops-routes-rank">{i + 1}</span>
                                                <div>
                                                    <p>{r.origin} <ArrowRight size={12} /> {r.destination}</p>
                                                    <i style={{ width: `${(Number(r.count) / max) * 100}%` }} />
                                                </div>
                                                <b>{r.count}</b>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </Panel>
                    </div>
                </>
            )}
        </div>
    );
}
