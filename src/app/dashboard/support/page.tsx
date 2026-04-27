'use client';

import { useEffect, useState } from 'react';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, ChevronRight, X } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SupportHub() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [form, setForm] = useState({ subject: '', category: 'general', priority: 'medium', message: '' });
    const [submitting, setSubmitting] = useState(false);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const res = await api.get('/support');
            setTickets(res.data.data);
        } catch (err) {
            toast.error('Failed to load tickets');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadTickets(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/support', form);
            toast.success('Ticket created successfully');
            setShowNewModal(false);
            setForm({ subject: '', category: 'general', priority: 'medium', message: '' });
            loadTickets();
        } catch (err) {
            toast.error('Failed to create ticket');
        } finally { setSubmitting(false); }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return { color: 'var(--accent)', bg: 'rgba(59,130,246,0.1)' };
            case 'in_progress': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
            case 'resolved': return { color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
            case 'closed': return { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' };
            default: return { color: 'var(--text-primary)', bg: 'var(--bg-secondary)' };
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.25rem' }}>Support Hub</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Get help with your shipments and account</p>
                </div>
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                    <Plus size={18} /> New Ticket
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : tickets.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <MessageSquare size={32} color="var(--text-muted)" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No active tickets</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>If you need help with a shipment or have a question, create a new support ticket and our team will get back to you.</p>
                    <button onClick={() => setShowNewModal(true)} className="btn btn-secondary">Create your first ticket</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {tickets.map((t) => (
                        <Link key={t.id} href={`/dashboard/support/${t.id}`} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '1.25rem',
                                transition: 'transform 0.2s, border-color 0.2s',
                                cursor: 'pointer'
                            }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: 48, 
                                        height: 48, 
                                        borderRadius: 12, 
                                        background: getStatusStyle(t.status).bg, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}>
                                        {t.status === 'resolved' ? <CheckCircle size={24} color={getStatusStyle(t.status).color} /> : <MessageSquare size={24} color={getStatusStyle(t.status).color} />}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.subject}</h3>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 800, 
                                                textTransform: 'uppercase', 
                                                padding: '0.2rem 0.6rem', 
                                                borderRadius: 100, 
                                                background: getStatusStyle(t.status).bg, 
                                                color: getStatusStyle(t.status).color 
                                            }}>
                                                {t.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span>#{t.id.slice(0, 8)}</span>
                                            <span>{t.category}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {new Date(t.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="var(--border)" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* New Ticket Modal */}
            {showNewModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: '100%', maxWidth: 540, position: 'relative', animation: 'fadeIn 0.3s' }}>
                        <button onClick={() => setShowNewModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={24} />
                        </button>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Create Support Ticket</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="label">Subject *</label>
                                <input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Question about my shipment" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label">Category</label>
                                    <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="general">General Inquiry</option>
                                        <option value="shipment">Shipment Issue</option>
                                        <option value="billing">Billing & Invoices</option>
                                        <option value="technical">Technical Support</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Priority</label>
                                    <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Message *</label>
                                <textarea className="input" required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Describe your issue in detail..." style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Submit Ticket'}
                                </button>
                                <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-secondary btn-full">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
