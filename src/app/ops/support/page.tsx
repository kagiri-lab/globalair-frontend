'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Search, Mail, FileText, MessageSquare, Globe, Inbox as InboxIcon, Settings, ArrowRight, Sparkles, UserCheck, CheckCircle2, PenSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Loader, Segmented, EmptyState, Avatar, fmtDate } from '@/components/ops/ui';
import EnquiryView from './EnquiryView';
import { useCompose } from '@/components/ops/Compose';

type Source = 'email' | 'contact_form' | 'quote_form' | 'portal' | 'portal_quote';
interface Item {
    kind: 'enquiry' | 'ticket'; id: string; source: Source; title: string; name: string; email: string; preview: string;
    last_from: 'us' | 'them'; messages: number; status: 'needs_reply' | 'open' | 'closed'; updated_at: string;
    is_customer: boolean; wants_account?: boolean; booked: boolean; mailbox_id?: string | null; unread: boolean;
}
type Mailbox = { id: string; name: string; from_email: string; is_default: boolean | number; imap_last_sync_at: string | null; imap_last_error: string | null };
const MAILBOX_KEY = 'ops_inbox_mailbox';
type Filter = 'all' | 'unread' | 'needs_reply';
// Where a conversation came from: emails to the mailbox, or forms (website forms and messages from signed-in customers in the portal)
type Kind = 'any' | 'email' | 'forms';
const KIND_KEY = 'ops_inbox_kind';
const KINDS: { value: Kind; label: string; icon: typeof Mail; test: (s: Source) => boolean }[] = [
    { value: 'any', label: 'Everything', icon: InboxIcon, test: () => true },
    { value: 'email', label: 'Emails', icon: Mail, test: s => s === 'email' },
    { value: 'forms', label: 'Forms & portal', icon: Globe, test: s => s !== 'email' },
];

const SOURCE_META: Record<Source, { label: string; icon: typeof Mail }> = {
    email: { label: 'Email', icon: Mail },
    contact_form: { label: 'Website form', icon: Globe },
    quote_form: { label: 'Website quote', icon: FileText },
    portal: { label: 'Portal', icon: MessageSquare },
    portal_quote: { label: 'Portal quote', icon: FileText },
};

const when = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    if (today.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

const keyOf = (i: { kind: string; id: string }) => `${i.kind === 'ticket' ? 't' : 'e'}_${i.id}`;

// Website forms, emails and portal conversations in one inbox
function InboxPage() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const openKey = params.get('c') || '';
    const compose = useCompose();
    const [items, setItems] = useState<Item[]>([]);
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [showClosed, setShowClosed] = useState(false);
    // Type filter, remembered on this browser
    const [kind, setKindState] = useState<Kind>(() => {
        try { const k = localStorage.getItem(KIND_KEY); return KINDS.some(x => x.value === k) ? (k as Kind) : 'any'; } catch { return 'any'; }
    });
    const setKind = (k: Kind) => { setKindState(k); try { localStorage.setItem(KIND_KEY, k); } catch { /* storage blocked */ } };
    const ofKind = useCallback((i: Item) => KINDS.find(k => k.value === kind)!.test(i.source), [kind]);
    const [search, setSearch] = useState('');
    // Which mailbox to look at ('' = all); remembered on this browser
    const [mailboxId, setMailboxId] = useState<string | null>(() => {
        try { return localStorage.getItem(MAILBOX_KEY); } catch { return null; }
    });
    const pickMailbox = (id: string) => {
        setMailboxId(id);
        try { localStorage.setItem(MAILBOX_KEY, id); } catch { /* storage blocked */ }
    };

    const load = useCallback(() => api.get('/admin/inbox')
        .then(r => { setItems(r.data.data.items); setMailboxes(r.data.data.mailboxes); })
        .catch(() => toast.error('Could not load the inbox'))
        .finally(() => setLoading(false)), []);

    // Keep the list fresh while it's open (new forms and emails arrive in the background)
    useEffect(() => {
        load();
        const t = setInterval(load, 60000);
        // A new email from Compose: show it now, not at the next refresh
        window.addEventListener('inbox-changed', load);
        return () => { clearInterval(t); window.removeEventListener('inbox-changed', load); };
    }, [load]);

    const open = (i: Item) => {
        if (i.kind === 'ticket') { router.push(`/ops/support/${i.id}`); return; } // portal conversations have their own page (quotes, customer panel)
        setItems(list => list.map(x => keyOf(x) === keyOf(i) ? { ...x, unread: false } : x)); // opening marks it read
        router.replace(`${pathname}?c=${keyOf(i)}`, { scroll: false });
    };
    const close = () => router.replace(pathname, { scroll: false });

    const checkMail = async () => {
        setSyncing(true);
        try {
            const res = await api.post('/admin/inbox/sync');
            toast.success(res.data.message);
            await load();
        } catch (err) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not check the mailbox');
        } finally {
            setSyncing(false);
        }
    };

    // A mailbox that's gone (or never chosen) falls back to the default one
    const activeMailbox = mailboxId === '' ? '' : (mailboxes.find(m => m.id === mailboxId) || mailboxes.find(m => m.is_default) || mailboxes[0])?.id || '';
    // Emails belong to the mailbox they arrived in; website forms and portal messages show in every view
    const inMailbox = useCallback((i: Item) => !activeMailbox || i.source !== 'email' || !i.mailbox_id || i.mailbox_id === activeMailbox, [activeMailbox]);
    const mailboxUnread = (id: string) => items.filter(i => i.unread && i.source === 'email' && i.mailbox_id === id).length;

    // Unread, and everything still owed a reply (read or not)
    const counts = useMemo(() => {
        const here = items.filter(i => inMailbox(i) && ofKind(i));
        return {
            unread: here.filter(i => i.unread).length,
            needs_reply: here.filter(i => i.status === 'needs_reply').length,
            // Unread per type, for the type chips
            kinds: Object.fromEntries(KINDS.map(k => [k.value, items.filter(i => inMailbox(i) && i.unread && k.test(i.source)).length])) as Record<Kind, number>,
        };
    }, [items, inMailbox, ofKind]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(i => inMailbox(i) && ofKind(i) &&
            (showClosed || filter === 'needs_reply' ? true : i.status !== 'closed') &&
            (filter === 'all' || (filter === 'unread' && i.unread) || (filter === 'needs_reply' && i.status === 'needs_reply')) &&
            (!q || `${i.name} ${i.email} ${i.title} ${i.preview}`.toLowerCase().includes(q)));
    }, [items, filter, showClosed, search, inMailbox, ofKind]);

    const selectedEnquiry = openKey.startsWith('e_') ? openKey.slice(2) : '';
    const mailbox = mailboxes.find(m => m.id === activeMailbox);

    return (
        <div className={`oin${selectedEnquiry ? ' reading' : ''}`}>
            {/* ── List ── */}
            <section className="oin-list">
                <header className="oin-list-head">
                    <div>
                        <h1>Inbox</h1>
                        <p>{[counts.unread ? `${counts.unread} unread` : 'No unread', counts.needs_reply ? `${counts.needs_reply} waiting for a reply` : 'nothing waiting for a reply'].join(' · ')}</p>
                    </div>
                    <div className="o-row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                        {mailboxes.length > 0 && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={checkMail} disabled={syncing} title="Check the mailbox for new emails now" aria-label="Check mail">
                                <RefreshCw size={14} className={syncing ? 'spinning' : ''} />
                            </button>
                        )}
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => compose()}><PenSquare size={14} /> Compose</button>
                    </div>
                </header>

                {mailboxes.length > 1 && (
                    <div className="oin-mailboxes" role="tablist" aria-label="Mailbox">
                        <button type="button" role="tab" aria-selected={!activeMailbox} className={!activeMailbox ? 'active' : ''} onClick={() => pickMailbox('')}>All mailboxes</button>
                        {mailboxes.map(m => (
                            <button key={m.id} type="button" role="tab" aria-selected={activeMailbox === m.id} className={activeMailbox === m.id ? 'active' : ''} onClick={() => pickMailbox(m.id)} title={m.name}>
                                {m.from_email}{mailboxUnread(m.id) > 0 && <em>{mailboxUnread(m.id)}</em>}
                            </button>
                        ))}
                    </div>
                )}
                {mailboxes.length === 0 ? (
                    <Link href="/ops/settings?tab=email" className="oin-mailbox off"><Settings size={13} /> Connect your mailbox to read emails here <ArrowRight size={13} /></Link>
                ) : (mailbox ? [mailbox] : mailboxes).map(m => (
                    <p key={m.id} className={`oin-mailbox${m.imap_last_error ? ' err' : ''}`}>
                        <Mail size={13} /> {m.imap_last_error
                            ? <>Can’t read {m.from_email}: {m.imap_last_error}</>
                            : <>{m.from_email} · {m.imap_last_sync_at ? `checked ${fmtDate(m.imap_last_sync_at, true)}` : 'connecting…'}</>}
                    </p>
                ))}


                <label className="oin-search">
                    <Search size={15} />
                    <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or text…" aria-label="Search the inbox" />
                </label>
                <div className="oin-filters">
                    <Segmented value={filter} onChange={setFilter} options={[
                        { value: 'all', label: 'All' },
                        { value: 'unread', label: 'Unread', count: counts.unread || undefined },
                        { value: 'needs_reply', label: 'Needs reply', count: counts.needs_reply || undefined },
                    ]} />
                    <div className="oin-kinds" role="radiogroup" aria-label="Type">
                        {KINDS.map(k => (
                            <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} className={kind === k.value ? 'active' : ''} onClick={() => setKind(k.value)}>
                                <k.icon size={13} /> {k.label}
                                {k.value !== 'any' && counts.kinds[k.value] > 0 && <em>{counts.kinds[k.value]}</em>}
                            </button>
                        ))}
                    </div>
                    <label className="oin-closed"><input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} /> Show closed</label>
                </div>

                <div className="oin-items">
                    {loading ? <Loader label="Loading…" /> : shown.length === 0 ? (
                        <EmptyState icon={filter !== 'all' && !search ? CheckCircle2 : InboxIcon}
                            title={search ? 'Nothing matches' : filter === 'needs_reply' ? 'All caught up' : filter === 'unread' ? 'Nothing unread' : kind !== 'any' ? `No ${KINDS.find(k => k.value === kind)!.label.toLowerCase()} yet` : 'Nothing here yet'}
                            text={search ? 'Try a different name, email or word.' : filter === 'needs_reply' ? 'Every conversation has a reply.' : filter === 'unread' ? 'You’ve read everything.' : 'Website forms, emails and portal messages will appear here.'} />
                    ) : shown.map(i => {
                        const meta = SOURCE_META[i.source];
                        return (
                            <button key={keyOf(i)} type="button" onClick={() => open(i)}
                                className={`oin-item${keyOf(i) === openKey ? ' active' : ''}${i.unread ? ' unread' : ''}${i.status === 'closed' ? ' closed' : ''}`}>
                                <Avatar name={i.name} size={36} />
                                <span className="oin-item-body">
                                    <span className="oin-item-top">
                                        <strong>{i.unread && <i className="oin-dot" aria-label="Unread" />}{i.name}</strong>
                                        <time>{when(i.updated_at)}</time>
                                    </span>
                                    <span className="oin-item-title">{i.title}</span>
                                    <span className="oin-item-preview">{i.last_from === 'us' && 'You: '}{i.preview || '—'}</span>
                                    <span className="oin-item-tags">
                                        <span className={`oin-tag src-${i.source}`}><meta.icon size={11} /> {meta.label}</span>
                                        {i.status === 'needs_reply' && <span className="oin-tag needs">Needs reply</span>}
                                        {i.wants_account && !i.is_customer && <span className="oin-tag wants"><Sparkles size={11} /> Wants account</span>}
                                        {i.is_customer && <span className="oin-tag cust"><UserCheck size={11} /> Customer</span>}
                                        {i.booked && <span className="oin-tag booked">Booked</span>}
                                        {i.messages > 1 && <span className="oin-count">{i.messages}</span>}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── Reading pane ── */}
            <section className="oin-read">
                {selectedEnquiry
                    ? <EnquiryView enquiryId={selectedEnquiry} onBack={close} onChanged={load}
                        onUnread={() => { setItems(list => list.map(x => keyOf(x) === openKey ? { ...x, unread: true } : x)); close(); }} />
                    : <div className="oin-placeholder"><InboxIcon size={34} /><p>Select a conversation to read it</p></div>}
            </section>
        </div>
    );
}

export default function SupportPage() {
    return <Suspense fallback={<Loader />}><InboxPage /></Suspense>;
}
