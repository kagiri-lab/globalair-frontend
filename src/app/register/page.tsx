'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Package, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string()
        .min(8, 'At least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label className="label" style={{ textAlign: 'left', marginBottom: '0.4rem' }}>{label}</label>
        {children}
        {error && <p className="field-error" style={{ textAlign: 'left', marginTop: '0.25rem' }}>{error}</p>}
    </div>
);

export default function RegisterPage() {
    const { register: authRegister } = useAuth();
    const router = useRouter();
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        try {
            await authRegister(data.name, data.email, data.password, data.phone);
            toast.success('Account created! Welcome aboard 🚀');
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Registration failed');
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
                backgroundImage: 'url("https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?q=80&w=2070&auto=format&fit=crop")',
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
                        Join the Global<br />Network.
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.25rem', fontWeight: 500, maxWidth: '450px', lineHeight: 1.6, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        Create your free account today and start shipping worldwide with unparalleled speed and reliability.
                    </p>
                </div>
                
                <div style={{ position: 'relative', zIndex: 10, fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                    &copy; {new Date().getFullYear()} Global Air Cargo & Logistics. All rights reserved.
                </div>
            </div>

            {/* Right Form Side */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', backgroundColor: '#f8fafc' }}>
                {/* Mobile Logo Fallback */}
                <div className="auth-mobile-logo" style={{ display: 'none' /* handled by media query or hidden inline usually */ }}></div>
                
                <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src="/logo-transparent.png" alt="Logo" style={{ height: '40px', objectFit: 'contain', marginBottom: '1.5rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Create Account</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Fill in your details to get started</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        <Field label="Full Name" error={errors.name?.message}>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('name')} className={`input ${errors.name ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '1rem', height: '44px' }} placeholder="John Doe" />
                            </div>
                        </Field>

                        <Field label="Email address" error={errors.email?.message}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('email')} type="email" className={`input ${errors.email ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '1rem', height: '44px' }} placeholder="you@example.com" />
                            </div>
                        </Field>

                        <Field label="Phone (optional)" error={errors.phone?.message}>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('phone')} className={`input ${errors.phone ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '1rem', height: '44px' }} placeholder="+254 700 000 000" />
                            </div>
                        </Field>

                        <Field label="Password" error={errors.password?.message}>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('password')} type={showPw ? 'text' : 'password'} className={`input ${errors.password ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '44px' }} placeholder="Min. 8 chars, uppercase & number" />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>

                        <Field label="Confirm Password" error={errors.confirmPassword?.message}>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...register('confirmPassword')} type={showConfirmPw ? 'text' : 'password'} className={`input ${errors.confirmPassword ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '44px' }} placeholder="Repeat your password" />
                                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>

                        <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting} style={{ margin: '0.5rem 0', height: '48px', fontSize: '1rem', fontWeight: 800, borderRadius: '10px' }}>
                            {isSubmitting ? <><div className="spinner" /> Creating account…</> : 'Create Account'}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                            Sign in here
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
