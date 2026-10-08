'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, MessageSquare, User, Package, ChevronRight, Mail, Phone, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { OpsPage, Panel, StatusBadge, Loader, KeyValues, Avatar, money, fmtDate } from '@/components/ops/ui';
import QuoteOfferBox from '@/components/ops/QuoteOfferBox';

// What the customer asked us to price, in reading order
const QUOTE_ROWS: [string, string][] = [
    ['pickup', 'From'], ['dropoff', 'To'], ['commodity', 'Shipping'], ['weight', 'Weight'], ['dimensions', 'Dimensions'],
    ['transport_mode', 'Transport'], ['pickup_date', 'Preferred pickup'], ['delivery_date', 'Needed by'], ['phone', 'Phone'], ['company', 'Company'],
];

const quoteValue = (q: Record<string, string>, key: string) => {
    if (key === 'pickup' || key === 'dropoff') {
        const place = [q[`${key}_city`], q[`${key}_region`]].filter(Boolean).join(', ');
        return q[`${key}_address`] ? `${place} · ${q[`${key}_address`]}` : place;
    }
    if (key.endsWith('_date') && q[key]) return fmtDate(q[key]);
    return q[key];
};

const STATUS_ACTIONS: { status: string; label: string }[] = [
    { status: 'in_progress', label: 'Mark in progress' },
    { status: 'resolved', label: 'Mark resolved' },
    { status: 'closed', label: 'Close ticket' },
    { status: 'open', label: 'Reopen' },
];

export default function AdminTicketDetail() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [customerData, setCustomerData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [updating, setUpdating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        try {
            const res = await api.get(`/admin/support/tickets/${id}`);
            const t = res.data.data.ticket;
            setTicket(t);
            setMessages(res.data.data.messages);
            window.dispatchEvent(new CustomEvent('set-header-title', { detail: `#${t.id.slice(0, 8).toUpperCase()}` }));
            if (t.user_id) {
                api.get(`/admin/users/${t.user_id}`).then(r => setCustomerData(r.data.data)).catch(() => { });
            }
        } catch {
            toast.error('Failed to load ticket');
            router.push('/ops/support');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim()) return;
        setSending(true);
        try {
            await api.post(`/admin/support/tickets/${id}/messages`, { message: reply.trim() });
            setReply('');
            // Replying to an open ticket moves it into progress
            if (ticket?.status === 'open') await api.patch(`/admin/support/tickets/${id}/status`, { status: 'in_progress' }).catch(() => { });
            loadData();
        } catch {
            toast.error('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const handleStatusUpdate = async (status: string) => {
        setUpdating(true);
        try {
            await api.patch(`/admin/support/tickets/${id}/status`, { status });
            toast.success(`Ticket ${status.replace('_', ' ')}`);
            loadData();
        } catch {
            toast.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <Loader label="Loading ticket…" />;
    if (!ticket) return null;

    const customer = customerData?.user;
    const closed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
        <OpsPage
            back={{ href: '/ops/support', label: 'Inbox' }}
            title={ticket.subject}
            subtitle={<span className="o-row" style={{ gap: '0.5rem' }}>
                <StatusBadge status={ticket.status} /> <StatusBadge status={ticket.priority} label={`${ticket.priority} priority`} />
                <span>#{ticket.id.slice(0, 8).toUpperCase()} · {ticket.category || 'General'} · opened {fmtDate(ticket.created_at, true)}</span>
            </span>}
            actions={STATUS_ACTIONS.filter(a => a.status !== ticket.status && !(a.status === 'open' && ticket.status === 'in_progress')).slice(0, 3).map(a => (
                <button key={a.status} className={`btn ${a.status === 'resolved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleStatusUpdate(a.status)} disabled={updating}>{a.label}</button>
            ))}
        >
            <div className="o-grid-main">
                <Panel title="Conversation" icon={MessageSquare} flush>
                    <div className="otk-thread" ref={scrollRef}>
                        {messages.length === 0 ? <p className="o-muted" style={{ padding: '1rem' }}>No messages yet.</p> : messages.map(m => {
                            const fromStaff = !!m.is_admin;
                            return (
                                <div key={m.id} className={`otk-msg${fromStaff ? ' staff' : ''}`}>
                                    {!fromStaff && <Avatar name={m.sender_name} size={30} />}
                                    <div>
                                        <p className="otk-meta">{fromStaff ? `${m.sender_name} (staff)` : m.sender_name} · {fmtDate(m.created_at, true)}</p>
                                        <div className="otk-bubble">{m.message}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <form className="otk-reply" onSubmit={handleSend}>
                        <textarea
                            className="input"
                            rows={3}
                            placeholder={closed ? 'This ticket is closed — replying will not reopen it automatically.' : 'Write a reply to the customer…'}
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(e); }}
                        />
                        <div className="o-row" style={{ justifyContent: 'space-between' }}>
                            <span className="o-muted" style={{ fontSize: '0.75rem' }}>Ctrl/⌘ + Enter to send</span>
                            <button type="submit" className="btn btn-primary" disabled={sending || !reply.trim()}>{sending ? <div className="spinner" /> : <><Send size={15} /> Send reply</>}</button>
                        </div>
                    </form>
                </Panel>

                <div style={{ minWidth: 0 }}>
                    {ticket.quote_details && (
                        <Panel title="Quote request" icon={FileText} subtitle={ticket.shipment ? 'Booked' : 'Send the customer a price: they can accept and book it themselves'}>
                            <KeyValues rows={QUOTE_ROWS.filter(([k]) => quoteValue(ticket.quote_details, k)).map(([k, label]) => [label, quoteValue(ticket.quote_details, k)])} />
                            {ticket.quote_details.items && (
                                <div className="otk-quote-items">
                                    <span>Items</span>
                                    <ul>{String(ticket.quote_details.items).split('; ').map((it: string) => <li key={it}>{it}</li>)}</ul>
                                </div>
                            )}
                            {ticket.shipment ? (
                                <Link href={`/ops/shipments/${ticket.shipment.id}`} className="otk-quote-booked">
                                    <CheckCircle2 size={18} />
                                    <span><strong className="o-tn">{ticket.shipment.tracking_number}</strong><small>{money(ticket.shipment.total_price)} · {ticket.shipment.status.replace(/_/g, ' ')}</small></span>
                                    <ChevronRight size={16} />
                                </Link>
                            ) : (
                                <>
                                    <QuoteOfferBox ticketId={ticket.id} details={ticket.quote_details} canBook={!!ticket.can_book} onSent={loadData} />
                                    {ticket.quote_details.offer?.status !== 'accepted' && (
                                        <Link href={`/ops/shipments/new?quote=${ticket.id}`} className="otk-convert">
                                            Or book it yourself <ArrowRight size={14} />
                                        </Link>
                                    )}
                                </>
                            )}
                        </Panel>
                    )}

                    <Panel title="Customer" icon={User}>
                        {!customer ? <Loader /> : (
                            <>
                                <Link href={`/ops/customers/${customer.id}`} className="osd-customer" style={{ marginBottom: '0.85rem' }}>
                                    <Avatar name={customer.name} size={40} />
                                    <span style={{ minWidth: 0, flex: 1 }}><strong>{customer.name}</strong><small>Customer since {fmtDate(customer.created_at)}</small></span>
                                    <ChevronRight size={16} />
                                </Link>
                                <KeyValues rows={[
                                    [<span key="e" className="o-row" style={{ gap: '0.3rem' }}><Mail size={13} /> Email</span>, <a key="ev" href={`mailto:${customer.email}`} style={{ color: 'var(--accent)' }}>{customer.email}</a>],
                                    [<span key="p" className="o-row" style={{ gap: '0.3rem' }}><Phone size={13} /> Phone</span>, customer.phone ? <a key="pv" href={`tel:${customer.phone}`} style={{ color: 'var(--text-primary)' }}>{customer.phone}</a> : '—'],
                                    ['Shipments', customerData?.stats?.total ?? 0],
                                    ['Total spent', money(customerData?.stats?.total_spent)],
                                ]} />
                            </>
                        )}
                    </Panel>

                    {customerData?.shipments?.length > 0 && (
                        <Panel title="Recent shipments" icon={Package} flush>
                            <div className="otk-ships">
                                {customerData.shipments.slice(0, 5).map((s: any) => (
                                    <Link key={s.id} href={`/ops/shipments/${s.id}`}>
                                        <span>
                                            <span className="o-tn">{s.tracking_number}</span>
                                            <small>{s.pickup_city} → {s.destination_city}</small>
                                        </span>
                                        <StatusBadge status={s.status} />
                                    </Link>
                                ))}
                            </div>
                        </Panel>
                    )}
                </div>
            </div>
        </OpsPage>
    );
}
