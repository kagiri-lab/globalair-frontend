'use client';

import { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Package, Receipt, RefreshCw, Download, BarChart3, Tag, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { OpsPage, StatGrid, Stat, Panel, Segmented, Loader, EmptyState, Table, money, downloadCsv } from '@/components/ops/ui';

const COLORS = ['#e53a40', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#64748b'];
const compactMoney = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`);
const monthLabel = (m: string) => {
    const [y, mo] = String(m).split('-').map(Number);
    return y && mo ? new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : m;
};

export default function ReportsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [metric, setMetric] = useState<'revenue' | 'volume'>('revenue');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/analytics/financials');
            setData(res.data.data);
        } catch {
            toast.error('Failed to load financial reports');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const categories = (data?.categories || []).map((c: any) => ({ name: c.category || 'Uncategorised', revenue: Number(c.revenue) || 0 }));
    const zones = (data?.zones || []).map((z: any) => ({ name: z.zone || 'Unknown', revenue: Number(z.revenue) || 0 }));
    const monthly = (data?.monthly || []).map((m: any) => ({ month: m.month, name: monthLabel(m.month), revenue: Number(m.revenue) || 0, volume: Number(m.volume) || 0 }));

    const totalRevenue = zones.reduce((s: number, z: any) => s + z.revenue, 0);
    const categoryTotal = categories.reduce((s: number, c: any) => s + c.revenue, 0);
    const periodRevenue = monthly.reduce((s: number, m: any) => s + m.revenue, 0);
    const periodVolume = monthly.reduce((s: number, m: any) => s + m.volume, 0);
    const current = monthly[monthly.length - 1];
    const previous = monthly[monthly.length - 2];
    const growth = previous && previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : null;
    const zoneTotal = totalRevenue || 1;

    const exportCsv = () => {
        if (!monthly.length && !categories.length) { toast.error('Nothing to export'); return; }
        const rows = [
            ...monthly.map((m: any) => ({ section: 'Monthly', name: m.month, revenue: m.revenue.toFixed(2), shipments: m.volume })),
            ...categories.map((c: any) => ({ section: 'Category', name: c.name, revenue: c.revenue.toFixed(2), shipments: '' })),
            ...zones.map((z: any) => ({ section: 'Origin city', name: z.name, revenue: z.revenue.toFixed(2), shipments: '' })),
        ];
        downloadCsv(`financial-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    };

    return (
        <OpsPage
            title="Financial Reports"
            subtitle="Revenue from completed and in-progress shipments (cancelled and failed are excluded)."
            actions={<>
                <button className="btn btn-secondary" onClick={exportCsv} disabled={loading}><Download size={15} /> Export CSV</button>
                <button className="btn btn-secondary" onClick={loadData} disabled={loading}><RefreshCw size={15} className={loading ? 'spinning' : ''} /> Refresh</button>
            </>}
        >
            {loading && !data ? <Loader label="Loading reports…" /> : (
                <>
                    <StatGrid>
                        <Stat icon={DollarSign} label="All-time revenue" value={money(totalRevenue)} tone="brand" />
                        <Stat icon={Receipt} label={monthly.length === 1 ? 'Revenue, this month' : `Revenue, last ${monthly.length || 6} months`} value={money(periodRevenue)} tone="info" />
                        <Stat icon={Package} label="Avg. shipment value" value={periodVolume ? money(periodRevenue / periodVolume) : '—'} tone="violet" hint={`${periodVolume.toLocaleString()} shipments`} />
                        <Stat
                            icon={growth !== null && growth < 0 ? TrendingDown : TrendingUp}
                            label="This month vs last"
                            value={growth === null ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
                            tone={growth === null ? 'neutral' : growth >= 0 ? 'success' : 'danger'}
                            hint={current ? `${money(current.revenue)} in ${current.name}` : undefined}
                        />
                    </StatGrid>

                    <Panel
                        title={metric === 'revenue' ? 'Monthly revenue' : 'Monthly shipments'}
                        subtitle="Last six months with activity"
                        icon={BarChart3}
                        actions={<Segmented value={metric} onChange={setMetric} options={[{ value: 'revenue', label: 'Revenue' }, { value: 'volume', label: 'Volume' }]} />}
                    >
                        {monthly.length === 0 ? <EmptyState icon={BarChart3} title="No revenue yet" text="Monthly totals will appear once shipments are booked." /> : (
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="repArea" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#e53a40" stopOpacity={0.18} />
                                                <stop offset="95%" stopColor="#e53a40" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={52} allowDecimals={metric === 'revenue'}
                                            tickFormatter={v => (metric === 'revenue' ? compactMoney(v) : String(v))} />
                                        <Tooltip
                                            formatter={(v) => [metric === 'revenue' ? money(Number(v)) : `${v} shipments`, metric === 'revenue' ? 'Revenue' : 'Volume']}
                                            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,0.1)', fontSize: 13 }}
                                        />
                                        <Area type="monotone" dataKey={metric} stroke="#e53a40" strokeWidth={2.5} fill="url(#repArea)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </Panel>

                    <div className="o-grid-2">
                        <Panel title="Revenue by category" icon={Tag}>
                            {categoryTotal === 0 ? <EmptyState icon={Tag} title="No category revenue yet" text="Appears once priced items are booked." /> : (
                                <>
                                    <div style={{ width: '100%', height: 220, position: 'relative' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={categories} dataKey="revenue" nameKey="name" innerRadius="68%" outerRadius="95%" paddingAngle={3} stroke="none">
                                                    {categories.map((c: any, i: number) => <Cell key={c.name} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="ops-donut-center">
                                            <strong>{compactMoney(Math.round(categoryTotal))}</strong>
                                            <span>total</span>
                                        </div>
                                    </div>
                                    <ul className="ops-legend" style={{ gridTemplateColumns: '1fr' }}>
                                        {categories.map((c: any, i: number) => (
                                            <li key={c.name} style={{ textTransform: 'none' }}>
                                                <i style={{ background: COLORS[i % COLORS.length] }} />
                                                <span>{c.name}</span>
                                                <b>{money(c.revenue)}</b>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </Panel>

                        <Panel title="Revenue by origin city" icon={MapPin} flush>
                            {zones.length === 0 ? <EmptyState icon={MapPin} title="No city revenue yet" /> : (
                                <Table minWidth={360}>
                                    <thead><tr><th>City</th><th>Share</th><th className="num">Revenue</th></tr></thead>
                                    <tbody>
                                        {zones.slice(0, 10).map((z: any, i: number) => {
                                            const pct = (z.revenue / zoneTotal) * 100;
                                            return (
                                                <tr key={z.name}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{z.name}</td>
                                                    <td style={{ width: '40%' }}>
                                                        <div className="o-row" style={{ gap: '0.5rem', flexWrap: 'nowrap' }}>
                                                            <div className="orep-bar"><span style={{ width: `${Math.max(pct, 2)}%`, background: COLORS[i % COLORS.length] }} /></div>
                                                            <small className="o-muted" style={{ minWidth: 38, textAlign: 'right' }}>{pct.toFixed(0)}%</small>
                                                        </div>
                                                    </td>
                                                    <td className="num">{money(z.revenue)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            )}
                        </Panel>
                    </div>
                </>
            )}
        </OpsPage>
    );
}
