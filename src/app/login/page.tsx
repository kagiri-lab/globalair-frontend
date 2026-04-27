'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Package, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const schema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

import { Suspense } from 'react';

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPw, setShowPw] = useState(false);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (searchParams.get('expired')) {
            toast.error('Your session has expired. Please login again.', { id: 'session-expired' });
        }
    }, [searchParams]);

    const onSubmit = async (data: FormData) => {
        try {
            await login(data.email, data.password);
            toast.success('Welcome back! 👋');
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#ffffff', width: '100%' }}>
            {/* Left Brand Side */}
            <div className="auth-brand-side" style={{ 
                flex: 1.2, 
                position: 'relative', 
                overflow: 'hidden', 
                padding: '4rem', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white'
            }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(34,40,49,0.9) 0%, rgba(226,52,58,0.4) 100%)', zIndex: 1 }} />
                
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <Link href="/">
                        <img src="/logo-transparent.png" alt="Logo" style={{ height: '45px', objectFit: 'contain' }} />
                    </Link>
                </div>
                
                <div style={{ position: 'relative', zIndex: 10, marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        Ship Global.<br />Grow Local.
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.25rem', fontWeight: 500, maxWidth: '450px', lineHeight: 1.6, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        Join the world's most reliable shipping network and manage your entire supply chain with ease.
                    </p>
                </div>
                
                <div style={{ position: 'relative', zIndex: 10, fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                    &copy; {new Date().getFullYear()} Global Air Cargo & Logistics. All rights reserved.
                </div>
            </div>

            {/* Right Form Side */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', backgroundColor: '#f8fafc' }}>
                {/* Mobile Logo Fallback */}
                <div className="auth-mobile-logo" style={{ display: 'none' }}></div>
                
                <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src="/logo-transparent.png" alt="Logo" style={{ height: '40px', objectFit: 'contain', marginBottom: '1.5rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Welcome Back</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('email')} type="email" className={`input ${errors.email ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '1rem', height: '44px' }} placeholder="you@example.com" />
                            </div>
                            {errors.email && <p className="field-error">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('password')} type={showPw ? 'text' : 'password'} className={`input ${errors.password ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '44px' }} placeholder="Your password" />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="field-error">{errors.password.message}</p>}
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting} style={{ margin: '0.5rem 0', height: '48px', fontSize: '1rem', fontWeight: 800, borderRadius: '10px' }}>
                            {isSubmitting ? <><div className="spinner" /> Signing in…</> : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                        Don&apos;t have an account?{' '}
                        <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                            Create one now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
