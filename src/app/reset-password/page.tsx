'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/redirect';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token') || '';
    // welcome=1: an account our team created after an enquiry, choosing a password for the first time
    const welcome = params.get('welcome') === '1';
    const [valid, setValid] = useState<boolean | null>(token ? null : false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        api.get(`/auth/reset-password/${token}`)
            .then(r => setValid(!!r.data.data.valid))
            .catch(() => setValid(false));
    }, [token]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const next: typeof errors = {};
        if (password.length < 6) next.password = 'Use at least 6 characters';
        if (confirm !== password) next.confirm = 'Passwords don’t match';
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            const res = await api.post('/auth/reset-password', { token, password });
            toast.success(res.data.message || 'Password changed');
            router.replace('/login');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not reset your password'));
            setSaving(false);
        }
    };

    if (valid === null) {
        return (
            <AuthShell title="Reset your password" subtitle="Checking your reset link…" footer={<Link href="/login">Back to sign in</Link>}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
            </AuthShell>
        );
    }

    if (!valid) {
        return (
            <AuthShell
                title="This link has expired"
                subtitle={welcome ? 'Set-up links work once and expire after 7 days. Your account is ready: just ask for a new link.' : 'Reset links work once and expire after 60 minutes.'}
                footer={<>Remembered it? <Link href="/login">Back to sign in</Link></>}
            >
                <div className="auth-form">
                    <div className="auth-notice warn">
                        <AlertTriangle size={22} />
                        <div>
                            <strong>Request a new link</strong>
                            <p>We’ll email you a fresh link to choose a new password.</p>
                        </div>
                    </div>
                    <Link href="/forgot-password" className="btn btn-primary btn-full btn-lg">Send a new link <ArrowRight size={17} /></Link>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={welcome ? 'Welcome! Choose your password' : 'Choose a new password'}
            subtitle={welcome ? 'Your account is ready. Choose a password and you’ll be signed in straight away.' : 'Pick something you haven’t used before. You’ll sign in with it straight after.'}
            footer={<>Remembered it? <Link href="/login">Back to sign in</Link></>}
        >
            <form onSubmit={submit} className="auth-form" noValidate>
                <AuthField id="password" label="New password" icon={Lock} type="password" autoComplete="new-password" placeholder="At least 6 characters" autoFocus
                    value={password} onChange={e => setPassword(e.target.value)} error={errors.password} />
                <AuthField id="confirm" label="Confirm new password" icon={Lock} type="password" autoComplete="new-password" placeholder="Type it again"
                    value={confirm} onChange={e => setConfirm(e.target.value)} error={errors.confirm} />
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
                    {saving ? <><div className="spinner" /> Saving…</> : <>Save new password <ArrowRight size={17} /></>}
                </button>
            </form>
        </AuthShell>
    );
}
