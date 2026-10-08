'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/redirect';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [alreadySent, setAlreadySent] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError('Enter a valid email address'); return; }
        setError('');
        setNotFound(false);
        setSending(true);
        try {
            const res = await api.post('/auth/forgot-password', { email: value });
            setAlreadySent(res.data?.code === 'ALREADY_SENT');
            setSentTo(value);
        } catch (err) {
            // Unknown email, deactivated account, too many tries or the email couldn't go out: say which, by the field
            const data = (err as { response?: { data?: { code?: string; message?: string } } }).response?.data;
            if (data?.code) {
                setError(data.message || 'Could not send the reset link');
                setNotFound(data.code === 'NOT_FOUND');
            } else {
                toast.error(apiErrorMessage(err, 'Could not send the reset link'));
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <AuthShell
            title={sentTo ? 'Check your email' : 'Forgot your password?'}
            subtitle={sentTo ? `We’ve sent a link to ${sentTo} to reset your password.` : 'Enter the email you sign in with and we’ll send you a link to choose a new password.'}
            footer={<>Remembered it? <Link href="/login">Back to sign in</Link></>}
        >
            {sentTo ? (
                <div className="auth-form">
                    <div className="auth-notice">
                        <MailCheck size={22} />
                        <div>
                            <strong>{alreadySent ? 'Link already on its way' : 'Reset link sent'}</strong>
                            <p>{alreadySent
                                ? 'We sent you a reset link less than a minute ago. Use that one: it works once and expires in 60 minutes. Check your spam folder if you can’t find it.'
                                : 'The link works once and expires in 60 minutes. Can’t find it? Check your spam folder.'}</p>
                        </div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-full" onClick={() => setSentTo(null)}>Use a different email</button>
                </div>
            ) : (
                <form onSubmit={submit} className="auth-form" noValidate>
                    <AuthField
                        id="email"
                        label="Email address"
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        autoFocus
                        value={email}
                        onChange={e => { setEmail(e.target.value); if (error) { setError(''); setNotFound(false); } }}
                        error={error}
                    />
                    {notFound && (
                        <p className="auth-hint">
                            New here? <Link href={`/register?email=${encodeURIComponent(email.trim())}`}>Create an account</Link>
                        </p>
                    )}
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={sending}>
                        {sending ? <><div className="spinner" /> Sending…</> : <>Send reset link <ArrowRight size={17} /></>}
                    </button>
                </form>
            )}
        </AuthShell>
    );
}
