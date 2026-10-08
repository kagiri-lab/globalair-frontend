'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    Mail, MailWarning, Phone, Building2, Send, ArrowRight, Package, AlertTriangle, UserCheck, UserPlus, MailPlus, ChevronRight, ArrowLeft, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Segmented, KeyValues, Avatar, Loader, fmtDate } from '@/components/ops/ui';

export type EnquiryStatus = 'new' | 'in_progress' | 'closed';
type Message = { id: string; message: string; sender_name?: string | null; sent_from?: string | null; direction?: 'in' | 'out'; from_email?: string | null; created_at: string };
type Detail = {
    id: string; type: 'contact' | 'quote' | 'email'; name: string; email: string; phone?: string | null; company?: string | null;
    subject?: string | null; message?: string | null; details?: Record<string, string> | null; status: EnquiryStatus; created_at: string;
    shipment_id?: string | null; wants_account?: boolean | number; started_by_us?: boolean | number;
    replies: Message[];
    reply_from: { id: string; name: string; email: string } | null;
    send_accounts: { id: string; name: string; email: string; is_default: boolean }[];
    account: { id: string; name: string; created_at: string; is_active: boolean | number; shipments: number } | null;
    invited_at: string | null;
    invite_type: 'invite' | 'account' | null;
};

const DETAIL_LABELS: Record<string, string> = {
    commodity: 'Commodity', weight: 'Weight', dimensions: 'Dimensions',
    pickup_address: 'Pickup address', pickup_city: 'Pickup city', pickup_region: 'Pickup region', pickup_date: 'Pickup date',
    dropoff_city: 'Drop-off city', dropoff_region: 'Drop-off region', delivery_date: 'Delivery date',
};
const SOURCE: Record<Detail['type'], string> = { email: 'Email', quote: 'Quote request (website)', contact: 'Contact form (website)' };
const STATUS_OPTIONS: { value: EnquiryStatus; label: string }[] = [
    { value: 'new', label: 'Needs reply' }, { value: 'in_progress', label: 'Open' }, { value: 'closed', label: 'Closed' },
];

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/** One website form or email conversation: read it, reply by email, register them, convert a quote */
export default function EnquiryView({ enquiryId, onBack, onChanged, onUnread }: { enquiryId: string; onBack?: () => void; onChanged: () => void; onUnread?: () => void }) {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [fromId, setFromId] = useState('');   // '' = the default sender for this conversation
    const [inviting, setInviting] = useState<'' | 'invite' | 'create'>('');
    const [confirmCreate, setConfirmCreate] = useState(false);
    const thread = useRef<HTMLDivElement>(null);

    const load = useCallback(() => api.get(`/admin/enquiries/${enquiryId}`)
        .then(r => setDetail(r.data.data))
        .catch(() => toast.error('Could not load the conversation')), [enquiryId]);

    // Opening a conversation that needed a reply marks it as open
    useEffect(() => {
        let cancelled = false;
        setConfirmCreate(false);
        setReply('');
        setFromId('');
        api.get(`/admin/enquiries/${enquiryId}`).then(r => { if (!cancelled) setDetail(r.data.data); })
            .catch(() => toast.error('Could not load the conversation'));
        return () => { cancelled = true; };
    }, [enquiryId]);

    useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }); }, [detail?.replies.length, detail?.id]);

    if (!detail || detail.id !== enquiryId) return <div className="oin-pane"><Loader label="Loading…" /></div>;

    const setStatus = async (s: EnquiryStatus) => {
        setDetail({ ...detail, status: s });
        try {
            await api.patch(`/admin/enquiries/${detail.id}/status`, { status: s });
            onChanged();
        } catch {
            toast.error('Could not update the status');
        }
    };

    const send = async () => {
        if (reply.trim().length < 2) return;
        setSending(true);
        try {
            const res = await api.post(`/admin/enquiries/${detail.id}/reply`, { message: reply.trim(), from_account_id: fromId || detail.reply_from?.id });
            toast.success(res.data.message);
            setReply('');
            await load();
            onChanged();
        } catch (err) {
            toast.error(errMsg(err, 'Could not send the reply'));
        } finally {
            setSending(false);
        }
    };

    // Not a customer yet: email a sign-up link, or create their account with a temporary password
    const account = async (mode: 'invite' | 'create') => {
        setInviting(mode);
        try {
            const res = await api.post(`/admin/enquiries/${detail.id}/account`, { mode });
            toast.success(res.data.message);
            setConfirmCreate(false);
            await load();
            onChanged();
        } catch (err) {
            toast.error(errMsg(err, 'Could not do that'));
        } finally {
            setInviting('');
        }
    };

    // Leave it bold in the list for later (closes it, so reading doesn't mark it read again)
    const markUnread = async () => {
        try {
            await api.patch(`/admin/enquiries/${detail.id}/read`, { read: false });
            onUnread?.();
        } catch {
            toast.error('Could not mark it unread');
        }
    };

    const wants = !!detail.wants_account && !detail.account;

    return (
        <div className="oin-pane">
            <header className="oin-pane-head">
                {onBack && <button type="button" className="oin-back" onClick={onBack} aria-label="Back to the inbox"><ArrowLeft size={18} /></button>}
                <div className="oin-pane-title">
                    <h2>{detail.subject || (detail.type === 'quote' ? 'Quote request' : 'Message')}</h2>
                    <p>{detail.started_by_us ? 'Email you started' : SOURCE[detail.type]} · {fmtDate(detail.created_at, true)}</p>
                </div>
                <div className="oin-pane-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={markUnread} title="Mark as unread">
                        <MailWarning size={14} /> Unread
                    </button>
                    <Segmented value={detail.status} onChange={setStatus} options={STATUS_OPTIONS} />
                    {detail.type === 'quote' && (detail.shipment_id
                        ? <Link className="btn btn-secondary btn-sm" href={`/ops/shipments/${detail.shipment_id}`}><Package size={14} /> Shipment</Link>
                        : <Link className="btn btn-secondary btn-sm" href={`/ops/shipments/new?enquiry=${detail.id}`}>Convert to shipment <ArrowRight size={14} /></Link>)}
                </div>
            </header>

            <div className="oin-pane-body" ref={thread}>
                <div className="oenq-contact">
                    <Avatar name={detail.name} size={42} />
                    <div style={{ minWidth: 0 }}>
                        <strong>{detail.name}</strong>
                        <div className="o-row" style={{ gap: '0.3rem 1rem', fontSize: '0.84rem' }}>
                            <a href={`mailto:${detail.email}`}><Mail size={14} /> {detail.email}</a>
                            {detail.phone && <a href={`tel:${detail.phone}`}><Phone size={14} /> {detail.phone}</a>}
                            {detail.company && <span><Building2 size={14} /> {detail.company}</span>}
                        </div>
                    </div>
                </div>

                {/* Are they a customer? */}
                {detail.account ? (
                    <Link href={`/ops/customers/${detail.account.id}`} className="oed-acct is-customer">
                        <UserCheck size={18} />
                        <span>
                            <strong>Registered customer</strong>
                            <small>Since {fmtDate(detail.account.created_at)} · {detail.account.shipments} shipment{detail.account.shipments === 1 ? '' : 's'}{detail.account.is_active ? '' : ' · account disabled'}</small>
                        </span>
                        <ChevronRight size={16} />
                    </Link>
                ) : (
                    <div className={`oed-acct${wants ? ' wants' : ''}`}>
                        {wants ? <Sparkles size={18} /> : <UserPlus size={18} />}
                        <span>
                            <strong>{wants ? 'Asked for an account' : 'Not registered'}</strong>
                            <small>{detail.invited_at
                                ? `${detail.invite_type === 'account' ? 'Account created, temporary password sent' : 'Invited to register'} ${fmtDate(detail.invited_at, true)}.`
                                : wants ? 'They ticked “create an account for me”. Register them and they’ll get a temporary password by email.'
                                    : `No account uses ${detail.email}.`}</small>
                        </span>
                        {detail.reply_from && (confirmCreate ? (
                            <div className="oed-acct-actions">
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => account('create')} disabled={!!inviting}>
                                    {inviting === 'create' ? <div className="spinner" /> : 'Yes, register them'}
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmCreate(false)} disabled={!!inviting}>Cancel</button>
                            </div>
                        ) : (
                            <div className="oed-acct-actions">
                                <button type="button" className={`btn btn-sm ${wants ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setConfirmCreate(true)} disabled={!!inviting}>
                                    <UserPlus size={14} /> Register them
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => account('invite')} disabled={!!inviting}
                                    title="Email them a link to the sign-up form with their details filled in">
                                    {inviting === 'invite' ? <div className="spinner" /> : <><MailPlus size={14} /> {detail.invited_at ? 'Invite again' : 'Invite to sign up'}</>}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {confirmCreate && !detail.account && (
                    <p className="oed-confirm">This creates a customer account for <b>{detail.name}</b> ({detail.email}) and emails them a temporary password. They’ll choose their own password the first time they sign in.</p>
                )}

                {detail.details && Object.keys(detail.details).length > 0 && (
                    <KeyValues rows={Object.entries(detail.details).filter(([, v]) => v).map(([k, v]) => [DETAIL_LABELS[k] || k.replace(/_/g, ' '), v])} />
                )}

                {/* The conversation */}
                <div className="oed-thread">
                    {!detail.started_by_us && (
                        <div className="oed-msg them">
                            <span className="oed-meta">{detail.name} · {fmtDate(detail.created_at, true)}{detail.type === 'email' ? ' · by email' : ''}</span>
                            <div className="oed-bubble">{detail.message || <em>No message, just the details above.</em>}</div>
                        </div>
                    )}
                    {detail.replies.map(r => r.direction === 'in' ? (
                        <div key={r.id} className="oed-msg them">
                            <span className="oed-meta">{detail.name} · {fmtDate(r.created_at, true)} · by email</span>
                            <div className="oed-bubble">{r.message}</div>
                        </div>
                    ) : (
                        <div key={r.id} className="oed-msg us">
                            <span className="oed-meta">{r.sender_name || 'Team'} · {fmtDate(r.created_at, true)}</span>
                            <div className="oed-bubble">{r.message}</div>
                        </div>
                    ))}
                </div>
            </div>

            {detail.reply_from ? (
                <div className="oin-compose">
                    <textarea className="input" rows={3} value={reply} onChange={e => setReply(e.target.value)}
                        placeholder={`Reply to ${detail.name.split(' ')[0]}…`}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }} />
                    <div className="oed-compose-foot">
                        <small>
                            To <b>{detail.email}</b> from{' '}
                            {detail.send_accounts.length > 1 ? (
                                <select className="oin-from" value={fromId || detail.reply_from.id} onChange={e => setFromId(e.target.value)} aria-label="Send from">
                                    {detail.send_accounts.map(a => <option key={a.id} value={a.id}>{a.email}{a.id === detail.reply_from?.id ? ' (usual)' : ''}</option>)}
                                </select>
                            ) : <b>{detail.reply_from.email}</b>}
                            , with a copy to that mailbox. Ctrl/⌘ + Enter to send.
                        </small>
                        <button type="button" className="btn btn-primary" onClick={send} disabled={sending || reply.trim().length < 2}>
                            {sending ? <div className="spinner" /> : <><Send size={15} /> Send</>}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="oin-compose">
                    <div className="oed-noemail">
                        <AlertTriangle size={18} />
                        <p>To reply from here, connect an email account first. <Link href="/ops/settings?tab=email">Settings → Email</Link></p>
                    </div>
                </div>
            )}
        </div>
    );
}
