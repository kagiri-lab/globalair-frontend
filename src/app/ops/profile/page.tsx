'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserRound, Lock, Save, ShieldCheck, Mail, Phone, MonitorSmartphone, LogOut, CalendarDays, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';
import { Panel, Field, StatusBadge, Avatar, Loader, Tabs, fmtDate } from '@/components/ops/ui';
import SessionList, { type Session } from '@/components/SessionList';

type Tab = 'details' | 'password' | 'sessions';
const TAB_KEY = 'ops_profile_tab';

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export default function AdminProfilePage() {
    const { user, setUser, logout } = useAuth();

    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
    const [lastUserId, setLastUserId] = useState(user?.id);
    if (user?.id !== lastUserId) {
        setLastUserId(user?.id);
        setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
    }
    const [savingProfile, setSavingProfile] = useState(false);

    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Last tab used, remembered on this browser (the shell renders a spinner first, so no hydration mismatch)
    const [tab, setTabState] = useState<Tab>(() => {
        try { const t = typeof window !== 'undefined' && localStorage.getItem(TAB_KEY); return t === 'password' || t === 'sessions' ? t : 'details'; } catch { return 'details'; }
    });
    const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* storage blocked */ } };
    const [sessions, setSessions] = useState<Session[] | null>(null);
    const [tracked, setTracked] = useState(true);
    const [endingOthers, setEndingOthers] = useState(false);

    const loadSessions = useCallback(() => api.get('/auth/sessions')
        .then(r => { setSessions(r.data.data.sessions); setTracked(r.data.data.tracked); })
        .catch(() => setSessions([])), []);
    useEffect(() => { loadSessions(); }, [loadSessions]);

    const profileChanged = !!user && (form.name !== (user.name || '') || form.email !== (user.email || '') || form.phone !== (user.phone || ''));

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
        setSavingProfile(true);
        try {
            const res = await api.patch('/admin/profile', form);
            toast.success(res.data.message || 'Profile updated');
            if (user) {
                const updated = { ...user, ...form };
                setUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
            }
        } catch (err) {
            toast.error(errMsg(err, 'Failed to update profile'));
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
        if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return; }
        setSavingPassword(true);
        try {
            const res = await api.patch('/admin/profile/password', { currentPassword: pw.current, newPassword: pw.next });
            toast.success(res.data.message || 'Password changed');
            setPw({ current: '', next: '', confirm: '' });
            loadSessions();
        } catch (err) {
            toast.error(errMsg(err, 'Failed to update password'));
        } finally {
            setSavingPassword(false);
        }
    };

    const endSession = async (id: string) => {
        try {
            const res = await api.delete(`/auth/sessions/${id}`);
            toast.success(res.data.message);
        } catch (err) {
            toast.error(errMsg(err, 'Could not sign that device out'));
        }
        await loadSessions();
    };

    const endOthers = async () => {
        setEndingOthers(true);
        try {
            const res = await api.delete('/auth/sessions');
            toast.success(res.data.message);
            await loadSessions();
        } catch (err) {
            toast.error(errMsg(err, 'Could not sign out your other devices'));
        } finally {
            setEndingOthers(false);
        }
    };

    if (!user) return <Loader />;

    const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    const others = (sessions || []).filter(s => !s.current).length;
    const pwInput = (key: 'current' | 'next' | 'confirm', auto: string) => (
        <input className="input" type={showPw ? 'text' : 'password'} autoComplete={auto} value={pw[key]} onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))} />
    );

    return (
        <div className="o-page fade-in ocd">
            <div className="ocd-layout" style={{ marginTop: 0 }}>
                {/* ── Who I am ── */}
                <aside className="ocd-profile">
                    <div className="ocd-card ocd-id">
                        <Avatar name={user.name} size={64} />
                        <h1>{user.name}</h1>
                        <StatusBadge status={user.role} label={ROLE_LABELS[user.role] || user.role} tone={user.role === 'super_admin' ? 'brand' : 'neutral'} />
                        {user.created_at && <p className="ocd-since"><CalendarDays size={13} /> Team member since {fmtDate(user.created_at)}</p>}
                    </div>

                    <div className="ocd-card">
                        <h2>Contact</h2>
                        <ul className="ocd-facts">
                            <li><Mail size={15} /><span><small>Email (you sign in with this)</small>{user.email}</span></li>
                            <li><Phone size={15} /><span><small>Phone</small>{user.phone || <em>Not added</em>}</span></li>
                        </ul>
                    </div>

                    <div className="ocd-card">
                        <h2>Access</h2>
                        {user.role === 'super_admin' ? (
                            <p className="o-muted" style={{ fontSize: '0.84rem' }}>Full access to everything, including staff and settings.</p>
                        ) : permissions.length > 0 ? (
                            <div className="o-row" style={{ gap: '0.35rem' }}>
                                {permissions.map(p => <StatusBadge key={p} status={p} label={p.replace(/_/g, ' ')} tone="neutral" />)}
                            </div>
                        ) : <p className="o-muted" style={{ fontSize: '0.84rem' }}>No extra permissions.</p>}
                        <p className="o-muted" style={{ fontSize: '0.76rem', marginTop: '0.8rem' }}>Need more access? Ask a super admin to change your role.</p>
                    </div>
                </aside>

                {/* ── Settings ── */}
                <section className="ocd-main">
                    <Tabs value={tab} onChange={setTab} label="Profile sections" tabs={[
                        { value: 'details', label: 'Details', icon: UserRound },
                        { value: 'password', label: 'Password', icon: Lock },
                        { value: 'sessions', label: 'Active sessions', icon: MonitorSmartphone, count: sessions ? Math.max(sessions.length, tracked ? 0 : 1) : undefined },
                    ]} />

                    {tab === 'details' && <Panel title="Personal details" icon={UserRound} subtitle="How you appear to colleagues and in activity logs.">
                        <form onSubmit={saveProfile} className="o-form-grid">
                            <Field label="Full name"><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoComplete="name" /></Field>
                            <Field label="Phone"><input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} autoComplete="tel" /></Field>
                            <Field label="Email" hint="You sign in with this address" full><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" /></Field>
                            <div className="o-row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary" disabled={savingProfile || !profileChanged}>{savingProfile ? <div className="spinner" /> : <><Save size={16} /> Save details</>}</button>
                            </div>
                        </form>
                    </Panel>}

                    {tab === 'password' && <Panel title="Password" icon={Lock} subtitle="Changing it signs you out on your other devices. You stay signed in here."
                        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPw(v => !v)}>{showPw ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Show</>}</button>}>
                        <form onSubmit={savePassword} className="o-form-grid">
                            <Field label="Current password" full>{pwInput('current', 'current-password')}</Field>
                            <Field label="New password" hint="At least 6 characters">{pwInput('next', 'new-password')}</Field>
                            <Field label="Confirm new password" error={pw.confirm && pw.next !== pw.confirm ? 'Doesn’t match' : undefined}>{pwInput('confirm', 'new-password')}</Field>
                            <div className="o-row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary" disabled={savingPassword || !pw.current || !pw.next}>{savingPassword ? <div className="spinner" /> : <><ShieldCheck size={16} /> Change password</>}</button>
                            </div>
                        </form>
                    </Panel>}

                    {tab === 'sessions' && <Panel title="Active sessions" icon={MonitorSmartphone} flush
                        subtitle="Where you’re signed in to the operations portal. Don’t recognise one? Sign it out and change your password."
                        actions={others > 0 && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={endOthers} disabled={endingOthers}>
                                {endingOthers ? <div className="spinner" /> : <><LogOut size={14} /> Sign out other devices</>}
                            </button>
                        )}>
                        {sessions === null ? <Loader /> : (
                            <SessionList sessions={sessions} untrackedCurrent={!tracked} empty="No other devices are signed in."
                                onEnd={endSession} onEndCurrent={() => { toast.success('Signed out'); logout(); }} />
                        )}
                    </Panel>}
                </section>
            </div>
        </div>
    );
}
