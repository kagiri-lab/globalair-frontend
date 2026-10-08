'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { destinationFor } from '@/lib/roles';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';

const RULES = [
    { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
    { test: (p: string) => /[A-Z]/.test(p), label: 'One capital letter' },
    { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

// First sign-in with a temporary password (account created by our team): choose your own
export default function ChangePasswordPage() {
    const { user, isLoading, setUser, logout } = useAuth();
    const router = useRouter();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isLoading) return;
        if (!user) router.replace('/login?next=/change-password');
        else if (!user.must_change_password) router.replace(destinationFor(user.role, null));
    }, [user, isLoading, router]);

    if (!user) return null;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!current) errs.current = 'Enter the temporary password from your email';
        const failed = RULES.find(r => !r.test(next));
        if (failed) errs.next = `Your new password needs: ${failed.label.toLowerCase()}`;
        else if (next === current) errs.next = 'Choose a different password from the temporary one';
        if (confirm !== next) errs.confirm = 'The passwords don’t match';
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true);
        try {
            await api.put('/auth/password', { currentPassword: current, newPassword: next });
            const updated = { ...user, must_change_password: false };
            setUser(updated);
            try { localStorage.setItem('user', JSON.stringify(updated)); } catch { /* storage blocked */ }
            toast.success('Password saved. Welcome!');
            router.replace(destinationFor(user.role, null));
        } catch (err) {
            const data = (err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } }).response?.data;
            const msg = data?.errors?.[0]?.msg || data?.message || 'Could not save your password';
            if (/current/i.test(msg)) setErrors({ current: 'That isn’t the temporary password from your email' });
            else toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AuthShell title="Choose your password" subtitle={`Welcome, ${user.name.split(' ')[0]}! Replace the temporary password from your email with one only you know.`}
            footer={<>Not you? <button type="button" className="auth-link-btn" onClick={() => logout()}>Sign out</button></>}>
            <form onSubmit={submit} className="auth-form" noValidate>
                <AuthField id="current" label="Temporary password" icon={Lock} type="password" autoComplete="current-password" autoFocus
                    value={current} onChange={e => setCurrent(e.target.value)} error={errors.current} />
                <AuthField id="new" label="New password" icon={Lock} type="password" autoComplete="new-password"
                    value={next} onChange={e => setNext(e.target.value)} error={errors.next} />
                <ul className="auth-rules">
                    {RULES.map(r => <li key={r.label} className={r.test(next) ? 'ok' : ''}><Check size={13} /> {r.label}</li>)}
                </ul>
                <AuthField id="confirm" label="Confirm new password" icon={Lock} type="password" autoComplete="new-password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} error={errors.confirm} />
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
                    {saving ? <><div className="spinner" /> Saving…</> : <>Save and continue <ArrowRight size={17} /></>}
                </button>
            </form>
        </AuthShell>
    );
}
