'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
    User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, MonitorSmartphone, LogOut, CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import SessionList, { type Session } from '@/components/SessionList';

const profileSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string()
        .min(8, 'At least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
type PasswordFormData = z.infer<typeof passwordSchema>;


type Tab = 'details' | 'password' | 'sessions';
const TABS: { value: Tab; label: string; icon: typeof User }[] = [
    { value: 'details', label: 'Details', icon: User },
    { value: 'password', label: 'Password', icon: ShieldCheck },
    { value: 'sessions', label: 'Active sessions', icon: MonitorSmartphone },
];
const TAB_KEY = 'portal_profile_tab';

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

function PasswordInput({ show, onToggle, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { show: boolean; onToggle: () => void; error?: string }) {
    return (
        <>
            <div className="cpp-input">
                <Lock size={16} />
                <input {...props} type={show ? 'text' : 'password'} className={`input${error ? ' error' : ''}`} />
                <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && <p className="field-error">{error}</p>}
        </>
    );
}

export default function ProfilePage() {
    const { user, setUser, logout } = useAuth();
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    // Last tab used, remembered on this browser (the layout renders a spinner first, so no hydration mismatch)
    const [tab, setTabState] = useState<Tab>(() => {
        try { const t = typeof window !== 'undefined' && localStorage.getItem(TAB_KEY); return t === 'password' || t === 'sessions' ? t : 'details'; } catch { return 'details'; }
    });
    const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* storage blocked */ } };
    const [sessions, setSessions] = useState<Session[] | null>(null);
    const [tracked, setTracked] = useState(true);
    const [ending, setEnding] = useState('');   // session id being signed out, or 'others'

    const profileForm = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: user?.name || '', phone: user?.phone || '' },
    });
    const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

    const loadSessions = useCallback(() => api.get('/auth/sessions')
        .then(r => { setSessions(r.data.data.sessions); setTracked(r.data.data.tracked); })
        .catch(() => setSessions([])), []);
    useEffect(() => { loadSessions(); }, [loadSessions]);

    const onProfileSubmit = async (data: ProfileFormData) => {
        try {
            const res = await api.put('/auth/profile', data);
            const updated = { ...user, ...res.data.data.user };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
            profileForm.reset({ name: updated.name, phone: updated.phone || '' });
            toast.success('Your details are saved');
        } catch (err) {
            toast.error(errMsg(err, 'Could not save your details'));
        }
    };

    const onPasswordSubmit = async (data: PasswordFormData) => {
        try {
            const res = await api.put('/auth/password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
            toast.success(res.data.message);
            passwordForm.reset();
            loadSessions();
        } catch (err) {
            toast.error(errMsg(err, 'Could not change your password'));
        }
    };

    const endSession = async (id?: string) => {
        setEnding(id || 'others');
        try {
            const res = await api.delete(id ? `/auth/sessions/${id}` : '/auth/sessions');
            toast.success(res.data.message);
            await loadSessions();
        } catch (err) {
            toast.error(errMsg(err, 'Could not sign that device out'));
        } finally {
            setEnding('');
        }
    };

    if (!user) return null;

    const pErr = profileForm.formState.errors;
    const wErr = passwordForm.formState.errors;
    const others = (sessions || []).filter(s => !s.current).length;
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    return (
        <div className="portal-page cpp">
            {/* Who's signed in */}
            <section className="cpp-head">
                <span className="cpp-avatar">{initials}</span>
                <div className="cpp-head-text">
                    <h1>{user.name}</h1>
                    <p>
                        <span><Mail size={14} /> {user.email}</span>
                        {user.phone && <span><Phone size={14} /> {user.phone}</span>}
                        {user.created_at && <span><CalendarDays size={14} /> Customer since {fmtDay(user.created_at)}</span>}
                    </p>
                </div>
            </section>

            <div className="cpp-tabs" role="tablist" aria-label="Profile sections">
                {TABS.map(t => (
                    <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} className={tab === t.value ? 'active' : ''} onClick={() => setTab(t.value)}>
                        <t.icon size={16} /> {t.label}
                        {t.value === 'sessions' && sessions && sessions.length > 0 && <em>{sessions.length}</em>}
                    </button>
                ))}
            </div>

            <div className="cpp-tab-body">
                {/* Personal details */}
                {tab === 'details' && <section className="cpp-card">
                    <header>
                        <span className="cpp-card-icon"><User size={18} /></span>
                        <div>
                            <h2>Personal details</h2>
                            <p>Used on your bookings and when our team contacts you.</p>
                        </div>
                    </header>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="cpp-form">
                        <div className="cpp-field">
                            <label className="label" htmlFor="pf-name">Full name</label>
                            <div className="cpp-input">
                                <User size={16} />
                                <input id="pf-name" {...profileForm.register('name')} className={`input${pErr.name ? ' error' : ''}`} autoComplete="name" />
                            </div>
                            {pErr.name && <p className="field-error">{pErr.name.message}</p>}
                        </div>
                        <div className="cpp-field">
                            <label className="label" htmlFor="pf-phone">Phone number</label>
                            <div className="cpp-input">
                                <Phone size={16} />
                                <input id="pf-phone" {...profileForm.register('phone')} className="input" placeholder="+254 700 000 000" autoComplete="tel" />
                            </div>
                        </div>
                        <div className="cpp-field cpp-span">
                            <label className="label" htmlFor="pf-email">Email address</label>
                            <div className="cpp-input">
                                <Mail size={16} />
                                <input id="pf-email" value={user.email} disabled className="input" />
                            </div>
                            <p className="cpp-hint">This is how you sign in. To change it, contact support.</p>
                        </div>
                        <div className="cpp-actions cpp-span">
                            <button type="submit" className="btn btn-primary" disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}>
                                {profileForm.formState.isSubmitting ? <><div className="spinner" /> Saving…</> : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </section>}

                {/* Password */}
                {tab === 'password' && <section className="cpp-card">
                    <header>
                        <span className="cpp-card-icon"><ShieldCheck size={18} /></span>
                        <div>
                            <h2>Password</h2>
                            <p>Changing it signs you out on your other devices.</p>
                        </div>
                    </header>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="cpp-form one">
                        <div className="cpp-field">
                            <label className="label" htmlFor="pw-current">Current password</label>
                            <PasswordInput id="pw-current" {...passwordForm.register('currentPassword')} autoComplete="current-password"
                                show={show.current} onToggle={() => setShow(s => ({ ...s, current: !s.current }))} error={wErr.currentPassword?.message} />
                        </div>
                        <div className="cpp-field">
                            <label className="label" htmlFor="pw-new">New password</label>
                            <PasswordInput id="pw-new" {...passwordForm.register('newPassword')} autoComplete="new-password" placeholder="8+ characters, a capital and a number"
                                show={show.next} onToggle={() => setShow(s => ({ ...s, next: !s.next }))} error={wErr.newPassword?.message} />
                        </div>
                        <div className="cpp-field">
                            <label className="label" htmlFor="pw-confirm">Confirm new password</label>
                            <PasswordInput id="pw-confirm" {...passwordForm.register('confirmPassword')} autoComplete="new-password"
                                show={show.confirm} onToggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))} error={wErr.confirmPassword?.message} />
                        </div>
                        <div className="cpp-actions">
                            <button type="submit" className="btn btn-primary" disabled={passwordForm.formState.isSubmitting}>
                                {passwordForm.formState.isSubmitting ? <><div className="spinner" /> Updating…</> : 'Update password'}
                            </button>
                        </div>
                    </form>
                </section>}

                {/* Active sessions */}
                {tab === 'sessions' && <section className="cpp-card">
                    <header>
                        <span className="cpp-card-icon"><MonitorSmartphone size={18} /></span>
                        <div>
                            <h2>Active sessions</h2>
                            <p>Devices signed in to your account. If you don’t recognise one, sign it out and change your password.</p>
                        </div>
                        {others > 0 && (
                            <button type="button" className="btn btn-secondary btn-sm cpp-head-btn" onClick={() => endSession()} disabled={!!ending}>
                                {ending === 'others' ? <div className="spinner" /> : <><LogOut size={14} /> Sign out other devices</>}
                            </button>
                        )}
                    </header>

                    {sessions === null ? (
                        <div className="cpp-loading"><div className="spinner" /></div>
                    ) : (
                        <SessionList sessions={sessions} untrackedCurrent={!tracked} empty="No other devices are signed in."
                            onEnd={id => endSession(id)} onEndCurrent={() => { toast.success('Signed out'); logout(); }} />
                    )}
                </section>}
            </div>
        </div>
    );
}
