'use client';

import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { ROLE_LABELS } from '@/lib/roles';
import { Panel, Toolbar, SearchInput, StatusBadge, Table, Loader, EmptyState, Pager, Avatar, fmtDate, downloadCsv } from '@/components/ops/ui';

const ACTIONS: [string, string][] = [['view', 'Viewed'], ['login', 'Signed in'], ['create', 'Created'], ['update', 'Updated'], ['delete', 'Deleted']];
const ACTION_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = { view: 'neutral', login: 'info', create: 'success', update: 'warning', delete: 'danger' };

const detailText = (log: any) => {
    try {
        const d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        if (!d) return log.entity_id ? `${log.entity_type || ''} ${log.entity_id}`.trim() : '';
        return d.url || d.message || Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
    } catch {
        return String(log.details || '');
    }
};

export default function ActivityTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loadedKey, setLoadedKey] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [userType, setUserType] = useState('');
    const [action, setAction] = useState('');
    const [entityType, setEntityType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reload, setReload] = useState(0);

    useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t); }, [search]);

    const params = (p: number, limit = 25) => ({
        page: p, limit,
        user_type: userType || undefined,
        action: action || undefined,
        entity_type: entityType || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString() : undefined,
        search: debounced || undefined,
    });

    const key = JSON.stringify([page, userType, action, entityType, startDate, endDate, debounced, reload]);
    const loading = loadedKey !== key;

    useEffect(() => {
        let cancelled = false;
        api.get('/logs/admin', { params: params(page) })
            .then(res => {
                if (cancelled) return;
                setLogs(res.data.data.logs);
                setPages(res.data.data.pagination.pages || 1);
                setTotal(res.data.data.pagination.total || 0);
            })
            .catch(() => toast.error('Failed to load activity'))
            .finally(() => { if (!cancelled) setLoadedKey(key); });
        return () => { cancelled = true; };
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    const filterChange = (fn: () => void) => { fn(); setPage(1); };

    const exportCsv = async () => {
        try {
            const res = await api.get('/logs/admin', { params: params(1, 5000) });
            const rows = res.data.data.logs.map((l: any) => ({
                time: l.created_at, user: l.user_name || '', email: l.user_email || '', role: l.user_type || '',
                action: l.action, entity: l.entity_type || '', entity_id: l.entity_id || '', details: detailText(l), ip: l.ip_address || '',
            }));
            if (!rows.length) { toast.error('Nothing to export'); return; }
            downloadCsv(`activity-${new Date().toISOString().slice(0, 10)}.csv`, rows);
        } catch {
            toast.error('Export failed');
        }
    };

    return (
        <>
            <div className="o-row" style={{ justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                <p className="o-muted" style={{ fontSize: '0.88rem' }}>{total.toLocaleString()} recorded event{total === 1 ? '' : 's'} — sign-ins, changes and page views.</p>
                <div className="o-row" style={{ gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setReload(r => r + 1)} disabled={loading}><RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh</button>
                </div>
            </div>
            <Toolbar>
                <SearchInput value={search} onChange={v => filterChange(() => setSearch(v))} placeholder="Search details, user or action…" />
                <select className="input" value={action} onChange={e => filterChange(() => setAction(e.target.value))} aria-label="Action">
                    <option value="">All actions</option>
                    {ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select className="input" value={userType} onChange={e => filterChange(() => setUserType(e.target.value))} aria-label="Who">
                    <option value="">Everyone</option>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    <option value="guest">Visitors (signed out)</option>
                </select>
                <select className="input" value={entityType} onChange={e => filterChange(() => setEntityType(e.target.value))} aria-label="Area">
                    <option value="">Any area</option>
                    <option value="shipment">Shipments</option>
                    <option value="category">Categories</option>
                    <option value="user">Users</option>
                    <option value="page">Page views</option>
                </select>
                <input type="date" className="input" value={startDate} onChange={e => filterChange(() => setStartDate(e.target.value))} aria-label="From date" style={{ minWidth: 150 }} />
                <input type="date" className="input" value={endDate} onChange={e => filterChange(() => setEndDate(e.target.value))} aria-label="To date" style={{ minWidth: 150 }} />
            </Toolbar>

            <Panel flush>
                {loading && !logs.length ? <Loader label="Loading activity…" /> : logs.length === 0 ? (
                    <EmptyState icon={Activity} title="No activity found" text="Try widening the dates or clearing filters." />
                ) : (
                    <div style={{ opacity: loading ? 0.6 : 1 }}>
                        <Table minWidth={860}>
                            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th><th className="o-hide-sm">IP address</th></tr></thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.created_at, true)}</td>
                                        <td>
                                            <div className="o-cell-main">
                                                <Avatar name={l.user_name || '?'} size={30} />
                                                <span style={{ minWidth: 0 }}>
                                                    <strong>{l.user_name || 'Visitor'}</strong>
                                                    <small>{l.user_type ? (ROLE_LABELS[l.user_type] || l.user_type) : 'Not signed in'}</small>
                                                </span>
                                            </div>
                                        </td>
                                        <td><StatusBadge status={l.action} label={ACTIONS.find(a => a[0] === l.action)?.[1] || l.action} tone={ACTION_TONE[l.action] || 'neutral'} /></td>
                                        <td className="o-muted" style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailText(l)}>{detailText(l) || '—'}</td>
                                        <td className="o-hide-sm o-mono" style={{ fontSize: '0.8rem' }}>{l.ip_address || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
                <Pager page={page} pages={pages} total={total} noun="events" onChange={setPage} />
            </Panel>
        </>
    );
}
