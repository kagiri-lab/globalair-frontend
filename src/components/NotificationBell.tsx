'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Package, Info, Check, X, Clock } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data);
            setUnreadCount(res.data.data.filter((n: any) => n.status !== 'read').length);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async () => {
        const unreadIds = notifications
            .filter(n => n.status !== 'read')
            .map(n => n.id);
        
        if (unreadIds.length === 0) return;

        try {
            await api.post('/notifications/mark-read', { ids: unreadIds });
            setNotifications(notifications.map(n => ({ ...n, status: 'read' })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark notifications as read", err);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'shipment_update': return <Package size={14} color="var(--accent)" />;
            case 'shipment_created': return <Check size={14} color="#10b981" />;
            default: return <Info size={14} color="#3b82f6" />;
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount > 0) markAsRead();
                }}
                style={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 10, 
                    width: 40, 
                    height: 40, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s'
                }}
            >
                <Bell size={20} color={isOpen ? 'var(--accent)' : 'var(--text-secondary)'} />
                {unreadCount > 0 && (
                    <span style={{ 
                        position: 'absolute', 
                        top: -4, 
                        right: -4, 
                        background: 'var(--danger)', 
                        color: 'white', 
                        fontSize: '0.65rem', 
                        fontWeight: 900, 
                        minWidth: 18, 
                        height: 18, 
                        borderRadius: 10, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '2px solid var(--bg-main)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 12px)', 
                    right: 0, 
                    width: 320, 
                    maxHeight: 480, 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 14, 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Notifications</h4>
                        {unreadCount > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>{unreadCount} New</span>}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                                <Bell size={32} color="var(--border)" style={{ marginBottom: '0.5rem' }} />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} style={{ 
                                    padding: '1rem', 
                                    borderBottom: '1px solid var(--border)', 
                                    background: n.status !== 'read' ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                                    transition: 'background 0.2s',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {getTypeIcon(n.type)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontWeight: n.status !== 'read' ? 700 : 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                                {n.message}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} /> {new Date(n.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {n.status !== 'read' && (
                                        <div style={{ position: 'absolute', top: '1rem', right: '0.5rem', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stay updated with your shipments</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
