'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/redirect';
import { destinationFor } from '@/lib/roles';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';

const schema = z.object({
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const { login, user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextParam = searchParams.get('next');
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (searchParams.get('expired')) {
            toast.error('Your session has expired. Please login again.', { id: 'session-expired' });
        }
    }, [searchParams]);

    // Already signed in — skip the form
    useEffect(() => {
        if (!isLoading && user) router.replace(destinationFor(user.role, nextParam));
    }, [isLoading, user, nextParam, router]);

    const onSubmit = async (data: FormData) => {
        try {
            const u = await login(data.email, data.password);
            toast.success(`Welcome back, ${u.name.split(' ')[0]}! 👋`);
            // Staff go to the operations portal, customers to their dashboard
            router.replace(destinationFor(u.role, nextParam));
        } catch (err: any) {
            toast.error(apiErrorMessage(err, 'Login failed'));
        }
    };

    const registerHref = nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : '/register';

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Sign in to your shipping account or the operations portal."
            footer={<>Don&apos;t have an account? <Link href={registerHref}>Create one free</Link></>}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
                <AuthField
                    id="email"
                    label="Email address"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    autoFocus
                    error={errors.email?.message}
                    {...register('email')}
                />
                <AuthField
                    id="password"
                    label={<span className="auth-label-row">Password <Link href="/forgot-password">Forgot password?</Link></span>}
                    icon={Lock}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    error={errors.password?.message}
                    {...register('password')}
                />
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
                    {isSubmitting ? <><div className="spinner" /> Signing in…</> : <>Sign In <ArrowRight size={17} /></>}
                </button>
            </form>
        </AuthShell>
    );
}
