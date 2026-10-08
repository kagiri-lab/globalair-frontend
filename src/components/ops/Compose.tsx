'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserCheck, Mail, CornerDownLeft, Inbox, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Drawer, Field } from '@/components/ops/ui';
import Combobox from '@/components/ops/Combobox';

type Prefill = { to?: string; name?: string; subject?: string; message?: string };
type Account = { id: string; name: string; email: string; from_name: string; receives: boolean };
type Suggestion = { id: string; name: string; email: string; shipments?: number };

const ComposeContext = createContext<(prefill?: Prefill) => void>(() => { });

/** Open the Compose slider from anywhere in the ops portal: const compose = useCompose(); compose({ to }) */
export const useCompose = () => useContext(ComposeContext);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/**
 * Compose: start a new email conversation from the ops portal.
 * Also catches clicks on email addresses (mailto: links) anywhere in the portal and opens here instead of a mail app
 * (hold Ctrl/⌘ to use your mail app as usual).
 */
export function ComposeProvider({ children }: { children: React.ReactNode }) {
    const { hasPermission } = useAuth();
    const canEmail = hasPermission('manage_support');
    const [prefill, setPrefill] = useState<Prefill | null>(null);

    const open = useCallback((p: Prefill = {}) => {
        if (!canEmail) { if (p.to) window.location.href = `mailto:${p.to}`; return; }
        setPrefill({ ...p });
    }, [canEmail]);

    // Email addresses anywhere in the portal open Compose
    useEffect(() => {
        if (!canEmail) return;
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = (e.target as HTMLElement).closest?.('a[href^="mailto:"]') as HTMLAnchorElement | null;
            if (!a || a.closest('.ocm')) return;
            const url = new URL(a.href);
            const to = decodeURIComponent(url.pathname).split(',')[0].trim();
            if (!EMAIL_RE.test(to)) return;
            e.preventDefault();
            setPrefill({ to, subject: url.searchParams.get('subject') || '', message: url.searchParams.get('body') || '' });
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, [canEmail]);

    return (
        <ComposeContext.Provider value={open}>
            {children}
            {prefill && <ComposeDrawer key={JSON.stringify(prefill)} prefill={prefill} onClose={() => setPrefill(null)} />}
        </ComposeContext.Provider>
    );
}

function ComposeDrawer({ prefill, onClose }: { prefill: Prefill; onClose: () => void }) {
    const router = useRouter();
    const [to, setTo] = useState(prefill.to || '');
    const [name, setName] = useState(prefill.name || '');
    const [subject, setSubject] = useState(prefill.subject || '');
    const [message, setMessage] = useState(prefill.message || '');
    const [accounts, setAccounts] = useState<Account[] | null>(null);
    const [fromId, setFromId] = useState('');
    const [sending, setSending] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggest, setShowSuggest] = useState(false);
    const [known, setKnown] = useState<Suggestion | null>(null);
    const toBox = useRef<HTMLDivElement>(null);
    const body = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        api.get('/admin/enquiries-compose')
            .then(r => { setAccounts(r.data.data.accounts); setFromId(r.data.data.default_id || ''); })
            .catch(() => setAccounts([]));
        // Start where there's something to write
        setTimeout(() => (prefill.to ? body.current : toBox.current?.querySelector('input'))?.focus(), 250);
    }, [prefill.to]);

    // Customers matching what's typed in To; and whether the address belongs to one
    useEffect(() => {
        const q = to.trim();
        if (q.length < 2) { setSuggestions([]); setKnown(null); return; }
        const t = setTimeout(() => {
            api.get('/admin/users', { params: { search: q, limit: 6 } })
                .then(r => {
                    const users: Suggestion[] = (r.data.data.users || []).map((u: { id: string; name: string; email: string; shipment_count?: number | string }) => ({ id: u.id, name: u.name, email: u.email, shipments: Number(u.shipment_count || 0) }));
                    setSuggestions(users);
                    const match = users.find(u => u.email.toLowerCase() === q.toLowerCase()) || null;
                    setKnown(match);
                    if (match && !name) setName(match.name);
                })
                .catch(() => { setSuggestions([]); setKnown(null); });
        }, 220);
        return () => clearTimeout(t);
    }, [to]); // eslint-disable-line react-hooks/exhaustive-deps

    const from = accounts?.find(a => a.id === fromId);
    const valid = EMAIL_RE.test(to.trim()) && subject.trim().length >= 2 && message.trim().length >= 2;

    const send = async () => {
        if (!EMAIL_RE.test(to.trim())) { toast.error('Enter a valid email address'); return; }
        if (subject.trim().length < 2) { toast.error('Add a subject'); return; }
        if (message.trim().length < 2) { toast.error('Write a message first'); return; }
        setSending(true);
        try {
            const res = await api.post('/admin/enquiries-compose', { to: to.trim(), name: name.trim(), subject: subject.trim(), message: message.trim(), from_account_id: fromId || undefined });
            toast.success(res.data.message);
            onClose();
            // The Inbox (if it's open) refreshes its list straight away
            window.dispatchEvent(new CustomEvent('inbox-changed'));
            router.push(`/ops/support?c=e_${res.data.data.id}`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not send the email'));
        } finally {
            setSending(false);
        }
    };

    return (
        <Drawer open onClose={onClose} title="New email" subtitle="Starts a conversation in the Inbox. Their reply lands in the same thread." width={900}
            footer={<>
                <span className="ocm-hint"><CornerDownLeft size={13} /> Ctrl/⌘ + Enter to send</span>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={send} disabled={sending || !valid || accounts?.length === 0}>
                    {sending ? <div className="spinner" /> : <><Send size={15} /> Send email</>}
                </button>
            </>}>
            <div className="ocm" onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}>
                <div className="ocm-form">
                    {accounts && accounts.length === 0 && (
                        <p className="ocm-warn">No email account is set up yet. Add one under Settings → Email to send from here.</p>
                    )}

                    <div className="ocm-to" ref={toBox}>
                        <Field label="To">
                            <input className="input" type="email" value={to} placeholder="name@company.com, or search customers"
                                onChange={e => { setTo(e.target.value); setShowSuggest(true); }}
                                onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 150)} autoComplete="off" />
                        </Field>
                        {showSuggest && suggestions.length > 0 && !(known && suggestions.length === 1) && (
                            <ul className="ocm-suggest" role="listbox">
                                {suggestions.map(s => (
                                    <li key={s.id} role="option" aria-selected={false} onMouseDown={e => e.preventDefault()}
                                        onClick={() => { setTo(s.email); setName(s.name); setShowSuggest(false); body.current?.focus(); }}>
                                        <strong>{s.name}</strong><span>{s.email}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="o-form-grid">
                        <Field label="Their name" hint="Used in the greeting: “Hi …,”">
                            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={to.includes('@') ? to.split('@')[0] : 'e.g. Amina'} />
                        </Field>
                        <Field label="From">
                            {accounts && accounts.length > 1 ? (
                                <Combobox id="compose-from" value={fromId} onChange={setFromId} searchable={accounts.length > 6}
                                    options={accounts.map(a => ({ value: a.id, label: a.email, hint: a.name, icon: <Mail size={14} /> }))} />
                            ) : <input className="input" value={from?.email || accounts?.[0]?.email || ''} disabled />}
                        </Field>
                    </div>

                    <Field label="Subject">
                        <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Your shipment to Mogadishu" maxLength={250} />
                    </Field>
                    <Field label="Message" hint={`The email starts with “Hi ${(name.trim() || (to.includes('@') ? to.split('@')[0] : 'there')).split(' ')[0]},” for you.`}>
                        <textarea ref={body} className="input ocm-body" value={message} onChange={e => setMessage(e.target.value)} rows={12}
                            placeholder="Write your message…" />
                    </Field>
                </div>

                <aside className="ocm-side">
                    {known && (
                        <div className="ocm-who">
                            <UserCheck size={17} />
                            <span><strong>{known.name}</strong><small>Registered customer{known.shipments ? ` · ${known.shipments} shipment${known.shipments === 1 ? '' : 's'}` : ''}</small></span>
                        </div>
                    )}
                    <div className="ocm-next">
                        <p>What happens next</p>
                        <ol>
                            <li><Send size={15} /><span>Sent from <b>{from?.email || 'your email account'}</b> with your company’s email design.</span></li>
                            <li><Archive size={15} /><span>A copy is saved in that mailbox’s <b>Sent</b> folder.</span></li>
                            <li><Inbox size={15} /><span>The conversation opens in the <b>Inbox</b>. When they reply, it appears in the same thread and is marked <b>Needs reply</b>{from && !from.receives ? <> once you turn on <b>Receive emails</b> for this mailbox</> : ''}.</span></li>
                        </ol>
                    </div>
                </aside>
            </div>
        </Drawer>
    );
}
