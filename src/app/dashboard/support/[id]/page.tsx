'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, Clock, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function TicketDetail() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        try {
            const res = await api.get(`/support/${id}`);
            setTicket(res.data.data.ticket);
            setMessages(res.data.data.messages);
        } catch (err) {
            toast.error('Failed to load ticket details');
            router.push('/dashboard/support');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim()) return;
        setSending(true);
        try {
            await api.post(`/support/${id}/messages`, { message: reply });
            setReply('');
            loadData();
        } catch (err) {
            toast.error('Failed to send message');
        } finally { setSending(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
    if (!ticket) return null;

    return (
        <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href="/dashboard/support" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Back
                </Link>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{ticket.subject}</h1>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: 100, background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                            {ticket.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                {/* Messages Area */}
                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((m) => {
                        const isMe = m.sender_id === user?.id;
                        return (
                            <div key={m.id} style={{ 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                            }}>
                                <div style={{ 
                                    padding: '0.75rem 1rem', 
                                    borderRadius: 14, 
                                    background: isMe ? 'var(--accent)' : 'var(--bg-secondary)',
                                    color: isMe ? 'white' : 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    borderBottomRightRadius: isMe ? 2 : 14,
                                    borderBottomLeftRadius: isMe ? 14 : 2,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                    {m.message}
                                </div>
                                <div style={{ 
                                    fontSize: '0.7rem', 
                                    color: 'var(--text-muted)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 4,
                                    justifyContent: isMe ? 'flex-end' : 'flex-start'
                                }}>
                                    {m.is_admin ? <CheckCircle size={10} color="var(--accent)" /> : <User size={10} />}
                                    {m.is_admin ? 'Support' : (isMe ? 'You' : 'User')} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reply Area */}
                {ticket.status !== 'closed' ? (
                    <form onSubmit={handleSend} style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', background: 'var(--bg-main)' }}>
                        <input 
                            className="input" 
                            placeholder="Type your message..." 
                            value={reply} 
                            onChange={e => setReply(e.target.value)}
                            disabled={sending}
                            style={{ margin: 0 }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={sending || !reply.trim()} style={{ width: 44, height: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
                            {sending ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={20} />}
                        </button>
                    </form>
                ) : (
                    <div style={{ padding: '1.25rem', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        This ticket is closed and cannot be replied to.
                    </div>
                )}
            </div>
        </div>
    );
}
