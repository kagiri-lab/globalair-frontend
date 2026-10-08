'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, ArrowRight, Check, Circle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/redirect';
import { destinationFor } from '@/lib/roles';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';

// Mirrors the backend rules in express/src/routes/auth.js
const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
    { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
    { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
];

const schema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Invalid email address'),
    phone: z.string().trim().optional()
        .refine(v => !v || /^\+?[\d\s()-]{7,20}$/.test(v), 'Enter a valid phone number, e.g. +254 700 000 000'),
    password: z.string()
        .min(8, 'At least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <RegisterForm />
        </Suspense>
    );
}

function RegisterForm() {
    const { register: authRegister, user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextParam = searchParams.get('next');
    // ?email= comes from "Create an account" on the forgot-password page
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        // Pre-filled from an invitation email or the forgot-password page
        defaultValues: { email: searchParams.get('email') || '', name: searchParams.get('name') || '', phone: searchParams.get('phone') || '' },
    });
    const password = useWatch({ control, name: 'password' }) || '';

    // Already signed in — skip the form
    useEffect(() => {
        if (!isLoading && user) router.replace(destinationFor(user.role, nextParam));
    }, [isLoading, user, nextParam, router]);

    const onSubmit = async (data: FormData) => {
        try {
            // Send phone only when provided, without spaces/brackets, so the backend's phone check accepts it
            const phone = data.phone ? data.phone.replace(/[\s()-]/g, '') : undefined;
            const u = await authRegister(data.name, data.email, data.password, phone);
            toast.success('Account created! Welcome aboard 🚀');
            router.replace(destinationFor(u.role, nextParam));
        } catch (err: any) {
            toast.error(apiErrorMessage(err, 'Registration failed'));
        }
    };

    const loginHref = nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login';

    return (
        <AuthShell
            title="Create your account"
            subtitle="It's free and takes less than a minute."
            footer={<>Already have an account? <Link href={loginHref}>Sign in</Link></>}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
                <AuthField id="name" label="Full name" icon={User} autoComplete="name" placeholder="Jane Wanjiru" autoFocus error={errors.name?.message} {...register('name')} />
                <div className="auth-row">
                    <AuthField id="email" label="Email address" icon={Mail} type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
                    <AuthField id="phone" label={<>Phone <span className="auth-optional">(optional)</span></>} icon={Phone} type="tel" autoComplete="tel" placeholder="+254 700 000 000" error={errors.phone?.message} {...register('phone')} />
                </div>
                <AuthField
                    id="password"
                    label="Password"
                    icon={Lock}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    error={errors.password && !password ? errors.password.message : undefined}
                    hint={null}
                    {...register('password')}
                />
                <ul className="auth-rules" aria-label="Password requirements">
                    {PASSWORD_RULES.map(r => {
                        const ok = r.test(password);
                        return (
                            <li key={r.label} className={ok ? 'ok' : errors.password ? 'bad' : ''}>
                                {ok ? <Check size={14} /> : <Circle size={14} />} {r.label}
                            </li>
                        );
                    })}
                </ul>
                <AuthField id="confirmPassword" label="Confirm password" icon={Lock} type="password" autoComplete="new-password" placeholder="Repeat your password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
                    {isSubmitting ? <><div className="spinner" /> Creating account…</> : <>Create Account <ArrowRight size={17} /></>}
                </button>
            </form>
        </AuthShell>
    );
}
