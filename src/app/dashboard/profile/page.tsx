'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
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

export default function ProfilePage() {
    const { user, setUser } = useAuth();
    const [showPw1, setShowPw1] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    const [showPw3, setShowPw3] = useState(false);

    const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors, isSubmitting: isSubmittingProfile } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: user?.name || '', phone: user?.phone || '' }
    });

    const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm, formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword } } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema)
    });

    const onProfileSubmit = async (data: ProfileFormData) => {
        try {
            const res = await api.put('/auth/profile', data);
            const updatedUser = res.data.data.user;
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Keep persistence updated
            toast.success('Profile updated successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        }
    };

    const onPasswordSubmit = async (data: PasswordFormData) => {
        try {
            await api.put('/auth/password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
            toast.success('Password updated successfully');
            resetPasswordForm();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update password');
        }
    };

    if (!user) return null;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Account Profile</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Manage your personal information and security settings.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>
                
                {/* Profile Information Card */}
                <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-light)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Personal Information</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Update your name and contact details.</p>
                    </div>

                    <form onSubmit={handleProfileSubmit(onProfileSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...registerProfile('name')} className={`input ${profileErrors.name ? 'error' : ''}`} style={{ paddingLeft: '2.5rem' }} placeholder="John Doe" />
                            </div>
                            {profileErrors.name && <p className="field-error">{profileErrors.name.message}</p>}
                        </div>

                        <div>
                            <label className="label">Email Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Cannot be changed)</span></label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input value={user.email} disabled className="input" style={{ paddingLeft: '2.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                            </div>
                        </div>

                        <div>
                            <label className="label">Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...registerProfile('phone')} className={`input ${profileErrors.phone ? 'error' : ''}`} style={{ paddingLeft: '2.5rem' }} placeholder="+254 700 000 000" />
                            </div>
                            {profileErrors.phone && <p className="field-error">{profileErrors.phone.message}</p>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={isSubmittingProfile} style={{ padding: '0.625rem 1.5rem' }}>
                                {isSubmittingProfile ? <><div className="spinner" /> Saving…</> : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Password Change Card */}
                <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-light)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Security</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Ensure your account is using a long, random password to stay secure.</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Current Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...registerPassword('currentPassword')} type={showPw1 ? 'text' : 'password'} className={`input ${passwordErrors.currentPassword ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} placeholder="Enter current password" />
                                <button type="button" onClick={() => setShowPw1(!showPw1)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    {showPw1 ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {passwordErrors.currentPassword && <p className="field-error">{passwordErrors.currentPassword.message}</p>}
                        </div>

                        <div>
                            <label className="label">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...registerPassword('newPassword')} type={showPw2 ? 'text' : 'password'} className={`input ${passwordErrors.newPassword ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} placeholder="Min. 8 chars, uppercase & number" />
                                <button type="button" onClick={() => setShowPw2(!showPw2)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {passwordErrors.newPassword && <p className="field-error">{passwordErrors.newPassword.message}</p>}
                        </div>

                        <div>
                            <label className="label">Confirm New Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input {...registerPassword('confirmPassword')} type={showPw3 ? 'text' : 'password'} className={`input ${passwordErrors.confirmPassword ? 'error' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} placeholder="Repeat new password" />
                                <button type="button" onClick={() => setShowPw3(!showPw3)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    {showPw3 ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {passwordErrors.confirmPassword && <p className="field-error">{passwordErrors.confirmPassword.message}</p>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={isSubmittingPassword} style={{ padding: '0.625rem 1.5rem' }}>
                                {isSubmittingPassword ? <><div className="spinner" /> Updating…</> : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
