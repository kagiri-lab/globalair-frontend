'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    Mail, Phone, Package, ArrowRight, ArrowLeft, KeyRound, ShieldOff, ShieldCheck, Activity, MessageSquare, MonitorSmartphone,
    Copy, MessageCircle, LogOut, CalendarDays, Clock, MapPin, RefreshCw, Eye, LogIn, FileText, Globe, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { activeAgo } from '@/lib/devices';
import SessionList from '@/components/SessionList';
import { Tabs, StatusBadge, Table, Loader, EmptyState, Pager, Avatar, Modal, Field, money, fmtDate } from '@/components/ops/ui';

type Shipment = { id: string; tracking_number: string; status: string; shipment_type: string; pickup_city: string; destination_city: string; total_price: number | string; created_at: string };
type Session = { id: string; user_agent: string | null; ip_address: string | null; created_at: string; last_seen_at: string };
type Ticket = { id: string; subject: string; status: string; category: string; updated_at: string };
type Enquiry = { id: string; type: 'contact' | 'quote' | 'email'; subject: string | null; status: string; created_at: string };
type Detail = {
    user: { id: string; name: string; email: string; phone?: string | null; is_active: boolean | number; created_at: string; last_login_at: string | null; last_seen_at: string | null; addresses: number;
        billing?: { terms: 'prepaid' | 'monthly'; unpaid_invoices: { count: number; total: number }; open_statements: { count: number; total: number }; unbilled: { count: number; total: number } } };
    shipments: Shipment[];
    stats: { total?: number | string; delivered?: number | string; total_spent?: number | string };
    sessions: Session[];
    conversations: { tickets: Ticket[]; enquiries: Enquiry[] };
};
type Log = { id: string; action: string; details: unknown; created_at: string };
type Tab = 'shipments' | 'conversations' | 'devices' | 'activity';

const ACTIVE = ['confirmed', 'picked_up', 'in_transit', 'out_for_delivery'];
const PAGE_NAMES: Record<string, string> = {
    '/dashboard': 'Dashboard', '/shipments': 'Shipments', '/shipments/new': 'New shipment', '/dashboard/track': 'Tracking',
    '/dashboard/addresses': 'Address book', '/dashboard/support': 'Support', '/dashboard/profile': 'Profile',
    '/forgot-password': 'Forgot password', '/reset-password': 'Reset password', '/login': 'Sign in', '/register': 'Sign up', '/': 'Website home',
};
const ENQUIRY_LABEL = { contact: 'Website form', quote: 'Website quote', email: 'Email' };

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

// "Hk7m-Qp4r-x2Lw": easy to read out, meets the password rules
const tempPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const pick = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), n => chars[n % chars.length]).join('');
    return `${pick()}-${pick()}-${Math.floor(Math.random() * 90 + 10)}A`;
};

/** A log row in plain words: "Opened Dashboard", "Signed in" */
function describeLog(l: Log) {
    let d: Record<string, unknown> = {};
    try { d = (typeof l.details === 'string' ? JSON.parse(l.details) : l.details) as Record<string, unknown> || {}; } catch { /* plain text */ }
    const url = typeof d.url === 'string' ? d.url.split('?')[0] : '';
    if (l.action === 'view' && url) {
        const name = PAGE_NAMES[url] || (url.startsWith('/shipments/') ? 'a shipment' : url.startsWith('/dashboard/support/') ? 'a support conversation'
            : url.replace(/^\//, '').replace(/[-/]/g, ' ') || 'a page');
        return { icon: Eye, text: `Opened ${name}`, key: `view:${url}` };
    }
    if (l.action === 'login') return { icon: LogIn, text: 'Signed in', key: 'login' };
    const what = String(l.action).replace(/_/g, ' ');
    const extra = typeof d.message === 'string' ? d.message : '';
    return { icon: FileText, text: `${what.charAt(0).toUpperCase()}${what.slice(1)}${extra ? `: ${extra}` : ''}`, key: `${l.action}:${extra}` };
}

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage_customers');
    const canBill = hasPermission('manage_billing');
    const canSeeLogs = hasPermission('manage_admins');
    const [data, setData] = useState<Detail | null>(null);
    const [tab, setTab] = useState<Tab>('shipments');
    const [logs, setLogs] = useState<Log[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busy, setBusy] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassModal, setShowPassModal] = useState(false);
    const [confirmToggle, setConfirmToggle] = useState(false);

    const load = useCallback(() => api.get(`/admin/users/${id}`)
        .then(r => {
            setData(r.data.data);
            window.dispatchEvent(new CustomEvent('set-header-title', { detail: r.data.data.user.name }));
        })
        .catch(() => { toast.error('Customer not found'); router.push('/ops/customers'); }), [id, router]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (tab !== 'activity' || !canSeeLogs) return;
        let cancelled = false;
        api.get('/logs/admin', { params: { user_id: id, page, limit: 40 } })
            .then(r => { if (!cancelled) { setLogs(r.data.data.logs); setTotalPages(r.data.data.pagination.pages); } })
            .catch(() => toast.error('Could not load activity'))
            .finally(() => { if (!cancelled) setLogsLoading(false); });
        return () => { cancelled = true; };
    }, [id, tab, page, canSeeLogs]);

    const changeTab = (t: Tab) => {
        if (t === 'activity') setLogsLoading(true);
        setTab(t);
        setPage(1);
    };

    const run = async (key: string, fn: () => Promise<{ data: { message: string } }>, after?: () => void) => {
        setBusy(key);
        try {
            const res = await fn();
            toast.success(res.data.message);
            after?.();
            await load();
        } catch (err) {
            toast.error(errMsg(err, 'Something went wrong'));
        } finally {
            setBusy('');
        }
    };

    if (!data) return <Loader label="Loading customer…" />;

    const { user, shipments, stats, sessions, conversations } = data;
    const total = Number(stats?.total || 0);
    const delivered = Number(stats?.delivered || 0);
    const moving = shipments.filter(s => ACTIVE.includes(s.status)).length;
    const convoCount = conversations.tickets.length + conversations.enquiries.length;
    const waDigits = (user.phone || '').replace(/\D/g, '');

    const copy = (text: string, what: string) => navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`)).catch(() => { });

    // Activity, with repeated page views folded together and grouped by day
    const activity = logs.reduce<{ day: string; rows: { id: string; icon: typeof Eye; text: string; key: string; at: string; times: number }[] }[]>((days, l) => {
        const day = new Date(l.created_at).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });
        let group = days[days.length - 1];
        if (!group || group.day !== day) { group = { day, rows: [] }; days.push(group); }
        const d = describeLog(l);
        const prev = group.rows[group.rows.length - 1];
        if (prev && prev.key === d.key) prev.times++;
        else group.rows.push({ id: l.id, ...d, at: l.created_at, times: 1 });
        return days;
    }, []);

    return (
        <div className="o-page fade-in ocd">
            <Link href="/ops/customers" className="o-back"><ArrowLeft size={15} /> All customers</Link>

            <div className="ocd-layout">
                {/* ── Profile ── */}
                <aside className="ocd-profile">
                    <div className="ocd-card ocd-id">
                        <Avatar name={user.name} size={64} />
                        <h1>{user.name}</h1>
                        <StatusBadge status={user.is_active ? 'active' : 'suspended'} />
                        <p className="ocd-since"><CalendarDays size={13} /> Customer since {fmtDate(user.created_at)}</p>

                        <div className="ocd-reach">
                            <a href={`mailto:${user.email}`} title={`Email ${user.email}`}><Mail size={16} /><span>Email</span></a>
                            {user.phone && <a href={`tel:${user.phone}`} title={`Call ${user.phone}`}><Phone size={16} /><span>Call</span></a>}
                            {waDigits.length >= 9 && <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"><MessageCircle size={16} /><span>WhatsApp</span></a>}
                        </div>
                    </div>

                    <div className="ocd-card">
                        <h2>Contact</h2>
                        <ul className="ocd-facts">
                            <li>
                                <Mail size={15} />
                                <span><small>Email</small>{user.email}</span>
                                <button type="button" onClick={() => copy(user.email, 'Email')} aria-label="Copy email"><Copy size={14} /></button>
                            </li>
                            <li>
                                <Phone size={15} />
                                <span><small>Phone</small>{user.phone || <em>Not added</em>}</span>
                                {user.phone && <button type="button" onClick={() => copy(user.phone!, 'Phone')} aria-label="Copy phone"><Copy size={14} /></button>}
                            </li>
                            <li>
                                <MapPin size={15} />
                                <span><small>Address book</small>{user.addresses ? `${user.addresses} saved address${user.addresses === 1 ? '' : 'es'}` : <em>None saved</em>}</span>
                            </li>
                            <li>
                                <Clock size={15} />
                                <span><small>Last seen</small>{user.last_seen_at ? activeAgo(user.last_seen_at).replace('Active ', '') : user.last_login_at ? `Signed in ${fmtDate(user.last_login_at, true)}` : <em>Not recently</em>}</span>
                            </li>
                        </ul>
                    </div>

                    {user.billing && (
                        <div className="ocd-card">
                            <h2>Billing</h2>
                            <div className="ocd-terms" role="radiogroup" aria-label="How they pay">
                                {([['prepaid', 'Pays before pickup'], ['monthly', 'Monthly invoice']] as const).map(([v, l]) => (
                                    <button key={v} type="button" role="radio" aria-checked={user.billing!.terms === v} className={user.billing!.terms === v ? 'active' : ''}
                                        disabled={!canBill || !!busy} onClick={() => user.billing!.terms !== v && run('terms', () => api.patch(`/admin/users/${id}/billing`, { billing_terms: v }))}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <p className="ocd-terms-hint">{user.billing.terms === 'monthly'
                                ? 'Shipments go on one statement, emailed at the start of each month.'
                                : 'Each shipment is invoiced when confirmed and must be paid before pickup.'}</p>
                            <ul className="ocd-facts" style={{ marginTop: '0.75rem' }}>
                                {user.billing.unpaid_invoices.count > 0 && (
                                    <li><Wallet size={15} /><span><small>Unpaid invoices</small>{money(user.billing.unpaid_invoices.total)} · {user.billing.unpaid_invoices.count}</span></li>
                                )}
                                {user.billing.open_statements.count > 0 && (
                                    <li><Wallet size={15} /><span><small>Open statements</small>{money(user.billing.open_statements.total)} · {user.billing.open_statements.count}</span></li>
                                )}
                                {user.billing.terms === 'monthly' && (
                                    <li><Wallet size={15} /><span><small>Not billed yet</small>{money(user.billing.unbilled.total)}{user.billing.unbilled.count ? ` · ${user.billing.unbilled.count} shipment${user.billing.unbilled.count === 1 ? '' : 's'}` : ''}</span></li>
                                )}
                                {!user.billing.unpaid_invoices.count && !user.billing.open_statements.count && user.billing.terms !== 'monthly' && (
                                    <li><Wallet size={15} /><span><small>Owed</small>Nothing</span></li>
                                )}
                            </ul>
                            {canBill && <Link href="/ops/billing" className="ocd-link">Open billing <ArrowRight size={13} /></Link>}
                        </div>
                    )}

                    {canManage && (
                        <div className="ocd-card">
                            <h2>Account</h2>
                            <div className="ocd-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => { setNewPassword(tempPassword()); setShowPassModal(true); }}>
                                    <KeyRound size={15} /> Reset password
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => run('signout', () => api.delete(`/admin/users/${id}/sessions`))}
                                    disabled={!!busy || sessions.length === 0} title={sessions.length ? 'End every sign-in on their devices' : 'Not signed in anywhere'}>
                                    {busy === 'signout' ? <div className="spinner" /> : <><LogOut size={15} /> Sign out everywhere</>}
                                </button>
                                <button type="button" className={`btn ${user.is_active ? 'btn-secondary ocd-danger' : 'btn-primary'}`} onClick={() => setConfirmToggle(true)}>
                                    {user.is_active ? <><ShieldOff size={15} /> Suspend account</> : <><ShieldCheck size={15} /> Reactivate account</>}
                                </button>
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── Main ── */}
                <section className="ocd-main">
                    <div className="ocd-stats">
                        <div><strong>{total}</strong><span>Shipments</span></div>
                        <div><strong>{moving}</strong><span>On the move</span></div>
                        <div><strong>{delivered}</strong><span>Delivered{total > 0 ? ` · ${Math.round((delivered / total) * 100)}%` : ''}</span></div>
                        <div><strong>{money(stats?.total_spent)}</strong><span>Total spent</span></div>
                    </div>

                    <Tabs value={tab} onChange={changeTab} label="Customer sections" tabs={[
                        { value: 'shipments', label: 'Shipments', icon: Package, count: total },
                        { value: 'conversations', label: 'Conversations', icon: MessageSquare, count: convoCount },
                        { value: 'devices', label: 'Devices', icon: MonitorSmartphone, count: sessions.length },
                        ...(canSeeLogs ? [{ value: 'activity' as Tab, label: 'Activity', icon: Activity }] : []),
                    ]} />

                    <div className="ocd-panel">
                        {tab === 'shipments' && (shipments.length === 0
                            ? <EmptyState icon={Package} title="No shipments yet" text="This customer hasn’t booked anything yet." />
                            : (
                                <Table minWidth={560}>
                                    <thead><tr><th>Shipment</th><th>Route</th><th>Status</th><th className="o-hide-sm">Booked</th><th className="num">Amount</th></tr></thead>
                                    <tbody>
                                        {shipments.map(s => (
                                            <tr key={s.id} className="o-clickable" onClick={() => router.push(`/ops/shipments/${s.id}`)}>
                                                <td>
                                                    <span className="o-tn">{s.tracking_number}</span>
                                                    <div className="o-muted" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{s.shipment_type}</div>
                                                </td>
                                                <td><span className="o-row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>{s.pickup_city} <ArrowRight size={13} className="o-muted" /> {s.destination_city}</span></td>
                                                <td><StatusBadge status={s.status} /></td>
                                                <td className="o-hide-sm">{fmtDate(s.created_at)}</td>
                                                <td className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{money(s.total_price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ))}

                        {tab === 'conversations' && (convoCount === 0
                            ? <EmptyState icon={MessageSquare} title="No conversations yet" text="Portal messages, emails and website forms from this customer show here." />
                            : (
                                <ul className="ocd-list">
                                    {conversations.tickets.map(t => (
                                        <li key={`t${t.id}`}>
                                            <Link href={`/ops/support/${t.id}`}>
                                                <span className="ocd-list-icon"><MessageSquare size={16} /></span>
                                                <span className="ocd-list-text"><strong>{t.subject}</strong><small>{t.category === 'quote' ? 'Portal quote' : 'Portal'} · {fmtDate(t.updated_at, true)}</small></span>
                                                <StatusBadge status={t.status} />
                                            </Link>
                                        </li>
                                    ))}
                                    {conversations.enquiries.map(e => (
                                        <li key={`e${e.id}`}>
                                            <Link href={`/ops/support?c=e_${e.id}`}>
                                                <span className="ocd-list-icon">{e.type === 'email' ? <Mail size={16} /> : <Globe size={16} />}</span>
                                                <span className="ocd-list-text"><strong>{e.subject || 'Message'}</strong><small>{ENQUIRY_LABEL[e.type]} · {fmtDate(e.created_at, true)}</small></span>
                                                <StatusBadge status={e.status} label={e.status === 'new' ? 'Needs reply' : e.status === 'in_progress' ? 'Open' : undefined} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ))}

                        {tab === 'devices' && (sessions.length === 0
                            ? <EmptyState icon={MonitorSmartphone} title="Not signed in anywhere" text="Devices appear here when they sign in to the customer portal." />
                            : <SessionList sessions={sessions} onEnd={canManage ? sid => run(sid, () => api.delete(`/admin/users/${id}/sessions/${sid}`)) : undefined} />)}

                        {tab === 'activity' && (logsLoading ? <Loader /> : activity.length === 0
                            ? <EmptyState icon={Activity} title="No activity recorded" />
                            : (
                                <>
                                    <div className="ocd-activity">
                                        {activity.map(g => (
                                            <div key={g.day}>
                                                <h3>{g.day}</h3>
                                                <ol>
                                                    {g.rows.map(r => (
                                                        <li key={r.id}>
                                                            <span className="ocd-act-icon"><r.icon size={14} /></span>
                                                            <span className="ocd-act-text">{r.text}{r.times > 1 && <em>×{r.times}</em>}</span>
                                                            <time>{new Date(r.at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</time>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        ))}
                                    </div>
                                    <Pager page={page} pages={totalPages} onChange={p => { setLogsLoading(true); setPage(p); }} />
                                </>
                            ))}
                    </div>
                </section>
            </div>

            <Modal
                open={showPassModal}
                onClose={() => setShowPassModal(false)}
                title="Reset password"
                subtitle={`${user.name} is signed out everywhere and chooses their own password the next time they sign in.`}
                width={480}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowPassModal(false)}>Cancel</button>
                    <button className="btn btn-primary" disabled={!!busy || newPassword.length < 8}
                        onClick={() => run('password', () => api.patch(`/admin/users/${id}/reset-password`, { password: newPassword }), () => setShowPassModal(false))}>
                        {busy === 'password' ? <div className="spinner" /> : 'Reset password'}
                    </button>
                </>}
            >
                <Field label="Temporary password" hint="Share it with the customer securely, e.g. by phone. At least 8 characters.">
                    <div className="ocd-pass">
                        <input type="text" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="off" spellCheck={false} />
                        <button type="button" className="btn btn-secondary" onClick={() => setNewPassword(tempPassword())} title="Make a new one"><RefreshCw size={15} /></button>
                        <button type="button" className="btn btn-secondary" onClick={() => copy(newPassword, 'Password')} title="Copy"><Copy size={15} /></button>
                    </div>
                </Field>
            </Modal>

            <Modal
                open={confirmToggle}
                onClose={() => setConfirmToggle(false)}
                title={user.is_active ? 'Suspend this account?' : 'Reactivate this account?'}
                width={460}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setConfirmToggle(false)}>Cancel</button>
                    <button className={`btn ${user.is_active ? 'btn-danger' : 'btn-primary'}`} disabled={!!busy}
                        onClick={() => run('toggle', () => api.patch(`/admin/users/${id}/toggle-status`), () => setConfirmToggle(false))}>
                        {busy === 'toggle' ? <div className="spinner" /> : user.is_active ? 'Suspend account' : 'Reactivate account'}
                    </button>
                </>}
            >
                <p className="o-muted">
                    {user.is_active
                        ? `${user.name} won’t be able to sign in or book shipments until the account is reactivated. Existing shipments are not affected.`
                        : `${user.name} will be able to sign in and book shipments again.`}
                </p>
            </Modal>
        </div>
    );
}
