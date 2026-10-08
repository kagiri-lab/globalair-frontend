'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Mail, Plus, Send, Edit2, Trash2, Star, CheckCircle2, XCircle, CircleDashed, Route, Info, ShieldCheck, AlertTriangle, Save, RotateCcw, Inbox, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Panel, Loader, EmptyState, Modal, Field, StatusBadge, fmtDate } from '@/components/ops/ui';

type Security = 'ssl' | 'starttls' | 'none';
interface Account {
    id: string; name: string; provider: string; from_name: string; from_email: string; reply_to: string | null;
    host: string; port: number; security: Security; username: string | null; has_password: boolean;
    is_default: boolean; is_active: boolean; last_tested_at: string | null; last_test_ok: boolean | null; last_test_error: string | null;
    imap_enabled: boolean; imap_host: string | null; imap_port: number | null; imap_security: Security;
    imap_last_sync_at: string | null; imap_last_error: string | null;
}
interface Purpose { key: string; label: string; description: string; audience: string; email_account_id: string | null; reply_to: string | null }
type Provider = { label: string; host: string; port: number; security: Security; imap_host?: string; imap_port?: number };

const SECURITY_LABELS: Record<Security, string> = { ssl: 'SSL/TLS (usually port 465)', starttls: 'STARTTLS (usually port 587)', none: 'None (not recommended)' };
const PROVIDER_TIPS: Record<string, string> = {
    gmail: 'Gmail needs an app password, not your normal password: Google Account → Security → 2-Step Verification → App passwords.',
    outlook: 'Microsoft 365 needs SMTP AUTH turned on for the mailbox, and an app password if MFA is on.',
    zoho: 'Use an app-specific password from Zoho Mail → Settings → Security.',
    sendgrid: 'Username is literally “apikey”; the password is your SendGrid API key.',
    mailgun: 'Use the SMTP login and password from Mailgun → Sending → Domain settings.',
};

const EMPTY = {
    name: '', provider: 'gmail', from_name: '', from_email: '', reply_to: '', host: 'smtp.gmail.com', port: 465, security: 'ssl' as Security, username: '', password: '', is_active: true, is_default: false,
    // Receiving: read the mailbox into the ops Inbox (same login as sending)
    imap_enabled: false, imap_host: 'imap.gmail.com', imap_port: 993, imap_security: 'ssl' as Security,
};

export default function EmailTab({ canEdit }: { canEdit: boolean }) {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [purposes, setPurposes] = useState<Purpose[]>([]);
    const [providers, setProviders] = useState<Record<string, Provider>>({});
    const [keySet, setKeySet] = useState(true);
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState<Account | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const [testing, setTesting] = useState<Account | null>(null);
    const [testingImap, setTestingImap] = useState('');
    const [testTo, setTestTo] = useState('');
    const [testBusy, setTestBusy] = useState(false);
    const [deleting, setDeleting] = useState<Account | null>(null);

    const [routes, setRoutes] = useState<Record<string, string>>({});
    const [replyTos, setReplyTos] = useState<Record<string, string>>({});   // purpose → reply-to address ('' = sender's own)
    const [customReply, setCustomReply] = useState<Record<string, boolean>>({}); // purpose → typing another address
    const [savingRoutes, setSavingRoutes] = useState(false);
    const [checkEvery, setCheckEvery] = useState<number | null>(null);   // minutes between automatic mailbox checks (0 = off)
    const [checkChoices, setCheckChoices] = useState<number[]>([]);

    const load = useCallback(() => api.get('/admin/email')
        .then(r => {
            const d = r.data.data;
            setAccounts(d.accounts);
            setPurposes(d.purposes);
            setProviders(d.providers);
            setKeySet(d.encryption_key_set);
            setCheckEvery(d.mail_check_minutes);
            setCheckChoices(d.mail_check_choices || []);
            setRoutes({});
        })
        .catch(() => toast.error('Could not load email settings'))
        .finally(() => setLoading(false)), []);

    useEffect(() => { load(); }, [load]);

    const saveCheckEvery = async (minutes: number) => {
        const before = checkEvery;
        setCheckEvery(minutes);
        try {
            const res = await api.put('/admin/email/mail-check', { minutes });
            toast.success(res.data.message);
        } catch (err) {
            setCheckEvery(before);
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not save');
        }
    };
    const everyLabel = (m: number) => !m ? 'Off (only when I press “Check mail”)' : m === 60 ? 'Every hour' : `Every ${m} minute${m === 1 ? '' : 's'}`;

    const defaultAccount = accounts.find(a => a.is_default);
    const routeChanges = new Set([...Object.keys(routes), ...Object.keys(replyTos)]).size;
    const accountName = (id: string | null) => accounts.find(a => a.id === id)?.name;

    // ── Account form ────────────────────────────────────────────────────────
    const set = (patch: Partial<typeof EMPTY>) => setForm(f => ({ ...f, ...patch }));
    const pickProvider = (key: string) => {
        const p = providers[key];
        set({ provider: key, ...(p && key !== 'custom' ? { host: p.host, port: p.port, security: p.security, ...(p.imap_host ? { imap_host: p.imap_host, imap_port: p.imap_port || 993, imap_security: 'ssl' as Security } : {}) } : {}) });
    };

    const openForm = (a?: Account) => {
        setEditing(a || null);
        setForm(a ? {
            name: a.name, provider: a.provider, from_name: a.from_name, from_email: a.from_email, reply_to: a.reply_to || '',
            host: a.host, port: a.port, security: a.security, username: a.username || '', password: '', is_active: a.is_active, is_default: a.is_default,
            imap_enabled: !!a.imap_enabled, imap_host: a.imap_host || providers[a.provider]?.imap_host || '', imap_port: a.imap_port || providers[a.provider]?.imap_port || 993, imap_security: a.imap_security || 'ssl',
        } : { ...EMPTY, name: accounts.length ? '' : 'Customer support', from_name: 'Global Air Cargo & Logistics' });
        setShowForm(true);
    };

    const saveAccount = async () => {
        if (!form.name.trim() || !form.from_name.trim() || !form.from_email.trim() || !form.host.trim()) { toast.error('Fill in the name, sender and server details'); return; }
        if (!editing && form.username && !form.password) { toast.error('Enter the password for this mailbox'); return; }
        setSaving(true);
        try {
            const body: Record<string, unknown> = { ...form, username: form.username || form.from_email };
            if (!form.password) delete body.password;
            if (editing) await api.patch(`/admin/email/accounts/${editing.id}`, body);
            else await api.post('/admin/email/accounts', body);
            toast.success(editing ? 'Email account updated' : 'Email account added — send a test to check it works');
            setShowForm(false);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save the email account');
        } finally {
            setSaving(false);
        }
    };

    // ── Actions ─────────────────────────────────────────────────────────────
    const runTest = async () => {
        if (!testing) return;
        setTestBusy(true);
        try {
            const res = await api.post(`/admin/email/accounts/${testing.id}/test`, { to: testTo.trim() || undefined });
            toast.success(res.data.message);
            setTesting(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Test failed', { duration: 8000 });
        } finally {
            setTestBusy(false);
            load();
        }
    };

    // Can we read this mailbox? (connects and counts the inbox)
    const testReceiving = async (a: Account) => {
        setTestingImap(a.id);
        try {
            const res = await api.post(`/admin/email/accounts/${a.id}/test-imap`);
            toast.success(res.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Couldn’t read the mailbox');
        } finally {
            setTestingImap('');
        }
    };

    const makeDefault = async (a: Account) => {
        try {
            await api.patch(`/admin/email/accounts/${a.id}`, { is_default: true });
            toast.success(`${a.name} is now the default`);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not change the default');
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            await api.delete(`/admin/email/accounts/${deleting.id}`);
            toast.success('Email account removed');
            setDeleting(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not remove the account');
        }
    };

    const saveRoutes = async () => {
        setSavingRoutes(true);
        try {
            const assignments = Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, v || null]));
            const reply_to = Object.fromEntries(Object.entries(replyTos).map(([k, v]) => [k, v.trim() || null]));
            await api.put('/admin/email/purposes', { assignments, reply_to });
            setReplyTos({});
            setCustomReply({});
            toast.success('Email routing saved');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save routing');
        } finally {
            setSavingRoutes(false);
        }
    };

    const setReplyTo = (purpose: Purpose, value: string) => setReplyTos(r => {
        const next = { ...r };
        if ((purpose.reply_to || '') === value) delete next[purpose.key]; else next[purpose.key] = value;
        return next;
    });

    // Addresses the team reads (connected accounts' senders and reply-tos), offered as reply destinations
    const replyChoices = [...new Set(accounts.flatMap(a => [a.from_email, a.reply_to]).filter(Boolean) as string[])];

    // Send every customer email's replies to one address
    const replyAllTo = (address: string) => {
        purposes.filter(p => p.audience !== 'your team').forEach(p => setReplyTo(p, address));
        setCustomReply({});
    };

    const setRoute = (purpose: Purpose, value: string) => setRoutes(r => {
        const next = { ...r };
        if ((purpose.email_account_id || '') === value) delete next[purpose.key]; else next[purpose.key] = value;
        return next;
    });

    const tip = useMemo(() => PROVIDER_TIPS[form.provider], [form.provider]);

    if (loading) return <Loader label="Loading email settings…" />;

    return (
        <>
            {!keySet && (
                <div className="oset-alert">
                    <AlertTriangle size={18} />
                    <div>
                        <strong>Set an encryption key on the server.</strong> Mail passwords are encrypted before they’re saved, but this server is using the built-in development key.
                        Add <code>ENCRYPTION_KEY</code> to the API’s <code>.env</code> (generate one with <code>openssl rand -hex 32</code>), restart it, then re-enter the passwords below.
                    </div>
                </div>
            )}

            <Panel
                title="Email accounts"
                subtitle="Mailboxes the platform sends from. Passwords are encrypted and never shown again."
                icon={Mail}
                actions={canEdit && accounts.length > 0 && <button className="btn btn-primary btn-sm" onClick={() => openForm()}><Plus size={15} /> Add account</button>}
            >
                {accounts.some(a => a.imap_enabled) && checkEvery !== null && (
                    <label className="oem-checkevery">
                        <RefreshCw size={15} />
                        <span>Check the mailbox for new email</span>
                        <select className="input" value={checkEvery} onChange={e => saveCheckEvery(Number(e.target.value))} disabled={!canEdit} aria-label="How often to check for new email">
                            {checkChoices.map(m => <option key={m} value={m}>{everyLabel(m)}</option>)}
                        </select>
                        <small>The Inbox also has a “Check mail” button to check straight away.</small>
                    </label>
                )}
                {accounts.length === 0 ? (
                    <EmptyState
                        icon={Mail}
                        title="No email accounts yet"
                        text="Until you add one, the platform can’t send password resets, booking confirmations or other emails."
                        action={canEdit && <button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} /> Add your first account</button>}
                    />
                ) : (
                    <div className="oem-accounts">
                        {accounts.map(a => (
                            <div key={a.id} className={`oem-card${a.is_active ? '' : ' inactive'}`}>
                                <div className="oem-card-head">
                                    <span className="oem-card-icon"><Mail size={19} /></span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <strong>
                                            {a.name}
                                            {a.is_default && <StatusBadge status="default" label="Default" tone="brand" />}
                                            {!a.is_active && <StatusBadge status="off" label="Paused" tone="neutral" />}
                                        </strong>
                                        <small>{a.from_name} &lt;{a.from_email}&gt;</small>
                                    </div>
                                </div>

                                <dl className="oem-meta">
                                    <dt>Server</dt><dd>{a.host}:{a.port} · {a.security === 'ssl' ? 'SSL' : a.security === 'starttls' ? 'STARTTLS' : 'no encryption'}</dd>
                                    <dt>Sign-in</dt><dd>{a.username || 'none'}{a.has_password ? ' · password saved' : ''}</dd>
                                    {a.reply_to && <><dt>Replies to</dt><dd>{a.reply_to}</dd></>}
                                    <dt>Sends</dt><dd>{purposes.filter(p => p.email_account_id === a.id).map(p => p.label).join(', ') || (a.is_default ? 'Everything not assigned elsewhere' : 'Nothing assigned yet')}</dd>
                                    <dt>Receives</dt><dd>{a.imap_enabled
                                        ? (a.imap_last_error ? <span className="oem-err">Can’t read the mailbox: {a.imap_last_error}</span>
                                            : a.imap_last_sync_at ? `Into the Inbox · checked ${fmtDate(a.imap_last_sync_at, true)}` : 'Into the Inbox · first check in a moment')
                                        : 'Off'}</dd>
                                </dl>

                                {a.last_test_ok === true ? (
                                    <div className="oem-status ok"><CheckCircle2 size={15} /> Working — last checked {fmtDate(a.last_tested_at, true)}</div>
                                ) : a.last_test_ok === false ? (
                                    <div className="oem-status fail"><XCircle size={15} /> <span>{a.last_test_error || 'The last test failed'}</span></div>
                                ) : (
                                    <div className="oem-status"><CircleDashed size={15} /> Not tested yet — send a test email to check it</div>
                                )}

                                {canEdit && (
                                    <div className="oem-card-actions">
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setTesting(a); setTestTo(user?.email || ''); }}><Send size={13} /> Send test</button>
                                        {a.imap_enabled && <button className="btn btn-secondary btn-sm" onClick={() => testReceiving(a)} disabled={testingImap === a.id}>{testingImap === a.id ? <div className="spinner" /> : <><Inbox size={13} /> Test receiving</>}</button>}
                                        <button className="btn btn-secondary btn-sm" onClick={() => openForm(a)}><Edit2 size={13} /> Edit</button>
                                        {!a.is_default && a.is_active && <button className="btn btn-secondary btn-sm" onClick={() => makeDefault(a)} title="Use for every email that isn’t assigned"><Star size={13} /> Make default</button>}
                                        <button className="btn btn-secondary btn-sm" onClick={() => setDeleting(a)} aria-label={`Remove ${a.name}`} title="Remove"><Trash2 size={13} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel
                title="Who sends what"
                subtitle={defaultAccount ? `Pick who sends each email, and where customers’ replies go. Anything left on “Default” is sent from ${defaultAccount.name}.` : 'Add an email account first, then choose which one sends each email.'}
                icon={Route}
                flush
                actions={canEdit && replyChoices.length > 0 && (
                    <select className="input oem-replyall" value="" onChange={e => { if (e.target.value) replyAllTo(e.target.value === '__self' ? '' : e.target.value); }} aria-label="Send all customer replies to">
                        <option value="">All customer replies go to…</option>
                        {replyChoices.map(a => <option key={a} value={a}>{a}</option>)}
                        <option value="__self">Each sender’s own address</option>
                    </select>
                )}
            >
                {purposes.map(p => {
                    const value = routes[p.key] ?? p.email_account_id ?? '';
                    const missing = p.email_account_id && !accountName(p.email_account_id);
                    return (
                        <div key={p.key} className={`oem-route${routes[p.key] !== undefined ? ' changed' : ''}`}>
                            <div style={{ minWidth: 0 }}>
                                <strong>{p.label} <span className="oset-tag">to {p.audience}</span></strong>
                                <p>{p.description}</p>
                            </div>
                            <div className="oem-route-picks">
                                <label>
                                    <span>Sent from</span>
                                    <select className="input" value={missing ? '' : value} disabled={!canEdit || !accounts.length} onChange={e => setRoute(p, e.target.value)} aria-label={`Account for ${p.label}`}>
                                        <option value="">{defaultAccount ? `Default (${defaultAccount.name})` : 'No account — not sent'}</option>
                                        {accounts.map(a => <option key={a.id} value={a.id} disabled={!a.is_active}>{a.name} — {a.from_email}{a.is_active ? '' : ' (paused)'}</option>)}
                                    </select>
                                </label>
                                {p.audience !== 'your team' && (() => {
                                    // Where a customer's "Reply" goes: handy when sending from a no-reply address
                                    const current = replyTos[p.key] ?? p.reply_to ?? '';
                                    const custom = customReply[p.key] || (!!current && !replyChoices.includes(current));
                                    return (
                                        <label>
                                            <span>Replies go to</span>
                                            {custom ? (
                                                <input className="input" type="email" value={current} disabled={!canEdit} placeholder="enquiries@yourdomain.com"
                                                    onChange={e => setReplyTo(p, e.target.value)} onBlur={e => { if (!e.target.value) setCustomReply(c => ({ ...c, [p.key]: false })); }} aria-label={`Replies to ${p.label} go to`} />
                                            ) : (
                                                <select className="input" value={current} disabled={!canEdit} aria-label={`Replies to ${p.label} go to`}
                                                    onChange={e => { if (e.target.value === '__other') setCustomReply(c => ({ ...c, [p.key]: true })); else setReplyTo(p, e.target.value); }}>
                                                    <option value="">The sender’s own address</option>
                                                    {replyChoices.map(a => <option key={a} value={a}>{a}</option>)}
                                                    <option value="__other">Another address…</option>
                                                </select>
                                            )}
                                        </label>
                                    );
                                })()}
                            </div>
                        </div>
                    );
                })}
            </Panel>

            <p className="o-muted" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                <ShieldCheck size={15} /> Passwords are encrypted with AES-256 before they’re stored and are only decrypted on the server at the moment an email is sent.
            </p>

            {canEdit && routeChanges > 0 && (
                <div className="oset-savebar" role="status">
                    <p><i aria-hidden="true" /> {routeChanges} routing change{routeChanges === 1 ? '' : 's'} not saved</p>
                    <div className="o-row" style={{ gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => setRoutes({})} disabled={savingRoutes}><RotateCcw size={15} /> Discard</button>
                        <button className="btn btn-primary" onClick={saveRoutes} disabled={savingRoutes}>{savingRoutes ? <div className="spinner" /> : <><Save size={15} /> Save routing</>}</button>
                    </div>
                </div>
            )}

            {/* Add / edit account */}
            <Modal
                open={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? `Edit ${editing.name}` : 'Add an email account'}
                subtitle="Use the SMTP details from your email provider."
                width={660}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={saveAccount} disabled={saving}>{saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Add account'}</button>
                </>}
            >
                <div className="o-form-grid">
                    <Field label="Provider" full>
                        <div className="oem-providers">
                            {Object.entries(providers).map(([k, p]) => (
                                <button key={k} type="button" className={form.provider === k ? 'active' : ''} onClick={() => pickProvider(k)}>{p.label}</button>
                            ))}
                        </div>
                    </Field>
                    {tip && <div className="oem-hint"><Info size={15} /> {tip}</div>}

                    <Field label="Account name" hint="Only staff see this, e.g. “Customer support” or “Bookings”" full>
                        <input className="input" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Customer support" />
                    </Field>
                    <Field label="Sender name" hint="What customers see in their inbox">
                        <input className="input" value={form.from_name} onChange={e => set({ from_name: e.target.value })} />
                    </Field>
                    <Field label="Sender email">
                        <input className="input" type="email" value={form.from_email} onChange={e => set({ from_email: e.target.value })} placeholder="support@yourdomain.com" />
                    </Field>
                    <Field label="Reply-to address" hint="Optional — where customer replies go" full>
                        <input className="input" type="email" value={form.reply_to} onChange={e => set({ reply_to: e.target.value })} />
                    </Field>

                    <Field label="SMTP server">
                        <input className="input" value={form.host} onChange={e => set({ host: e.target.value, provider: providers[form.provider]?.host === e.target.value ? form.provider : 'custom' })} placeholder="smtp.yourdomain.com" />
                    </Field>
                    <Field label="Port">
                        <input className="input" type="number" value={form.port} onChange={e => set({ port: Number(e.target.value) })} />
                    </Field>
                    <Field label="Security" full>
                        <select className="input" value={form.security} onChange={e => set({ security: e.target.value as Security })}>
                            {(Object.keys(SECURITY_LABELS) as Security[]).map(s => <option key={s} value={s}>{SECURITY_LABELS[s]}</option>)}
                        </select>
                    </Field>
                    <Field label="Username" hint="Usually the full email address">
                        <input className="input" autoComplete="off" value={form.username} onChange={e => set({ username: e.target.value })} placeholder={form.from_email || 'you@yourdomain.com'} />
                    </Field>
                    <Field label="Password" hint={editing?.has_password ? 'Leave empty to keep the saved password' : 'Stored encrypted'}>
                        <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={e => set({ password: e.target.value })} placeholder={editing?.has_password ? '••••••••  (saved)' : ''} />
                    </Field>

                    {/* Receiving */}
                    <div className="oem-receive" style={{ gridColumn: '1 / -1' }}>
                        <label className="oset-switch">
                            <input type="checkbox" checked={form.imap_enabled} onChange={e => set({ imap_enabled: e.target.checked })} />
                            <span aria-hidden="true" /><em>Receive emails in the ops Inbox</em>
                        </label>
                        <p className="o-field-hint">New emails to this mailbox appear in Support → Inbox every couple of minutes, and customers’ replies join their conversation. Uses the same username and password. The mailbox isn’t changed: nothing is marked as read or moved.</p>
                        {form.imap_enabled && (
                            <div className="o-form-grid">
                                <Field label="Incoming mail (IMAP) server"><input className="input" value={form.imap_host} onChange={e => set({ imap_host: e.target.value })} placeholder="imap.yourdomain.com" /></Field>
                                <Field label="Port"><input className="input" type="number" value={form.imap_port} onChange={e => set({ imap_port: Number(e.target.value) })} /></Field>
                                <Field label="Security">
                                    <select className="input" value={form.imap_security} onChange={e => set({ imap_security: e.target.value as Security })}>
                                        <option value="ssl">SSL/TLS (usually port 993)</option>
                                        <option value="starttls">STARTTLS (usually port 143)</option>
                                        <option value="none">None (not recommended)</option>
                                    </select>
                                </Field>
                            </div>
                        )}
                    </div>

                    <div className="o-row" style={{ gridColumn: '1 / -1', gap: '1.5rem' }}>
                        <label className="oset-switch">
                            <input type="checkbox" checked={form.is_active} onChange={e => set({ is_active: e.target.checked })} />
                            <span aria-hidden="true" /><em>{form.is_active ? 'Active' : 'Paused'}</em>
                        </label>
                        {!(editing?.is_default) && (
                            <label className="o-row" style={{ gap: '0.45rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.is_default || (!editing && !accounts.length)} disabled={!editing && !accounts.length} onChange={e => set({ is_default: e.target.checked })} />
                                Use as the default account
                            </label>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Send test */}
            <Modal
                open={!!testing}
                onClose={() => setTesting(null)}
                title={`Test ${testing?.name}`}
                subtitle="We’ll sign in to the mail server and send a short test message."
                width={480}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setTesting(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={runTest} disabled={testBusy}>{testBusy ? <><div className="spinner" /> Testing…</> : <><Send size={15} /> {testTo.trim() ? 'Send test email' : 'Check connection'}</>}</button>
                </>}
            >
                <Field label="Send the test to" hint="Leave empty to only check the server login">
                    <input className="input" type="email" value={testTo} onChange={e => setTestTo(e.target.value)} autoFocus />
                </Field>
            </Modal>

            {/* Remove */}
            <Modal
                open={!!deleting}
                onClose={() => setDeleting(null)}
                title={`Remove ${deleting?.name}?`}
                width={480}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={confirmDelete}>Remove account</button>
                </>}
            >
                <p className="o-muted">
                    The saved login is deleted. Emails assigned to it will be sent from the default account
                    {deleting?.is_default ? ' — and since this is the default, the next account becomes the default.' : '.'}
                </p>
            </Modal>
        </>
    );
}
