'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Package, LayoutDashboard, Truck, LogOut, Plus, ChevronRight, MapPin, Menu, User, Bell, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close menu on navigation
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isLoading && !user) router.replace('/login');
    }, [user, isLoading, router]);

    const handleLogout = () => {
        logout();
        document.cookie = 'token=; path=/; max-age=0';
        toast.success('Logged out successfully');
        router.push('/login');
    };

    if (isLoading || !user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
            </div>
        );
    }

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/shipments', icon: Truck, label: 'My Shipments' },
        { href: '/dashboard/addresses', icon: MapPin, label: 'Addresses' },
        { href: '/dashboard/support', icon: Info, label: 'Support Hub' },
    ];

    return (
        <div className="dashboard-layout">
            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', padding: '0 0.25rem' }}>
                    <img src="/logo-transparent.png" alt="Logo" style={{ height: 36, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>

                {/* Quick Action */}
                <Link href="/shipments/new" className="btn btn-primary btn-full" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
                    <Plus size={16} /> New Shipment
                </Link>

                {/* Nav */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    {navItems.map(({ href, icon: Icon, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`sidebar-link ${pathname === href || (href !== '/dashboard' && pathname.startsWith(href)) ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* User footer */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <Link href="/dashboard/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 8, marginBottom: '0.5rem', textDecoration: 'none', transition: 'background-color 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                        </div>
                    </Link>
                    <button onClick={handleLogout} className="sidebar-link btn-full" style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', color: 'var(--danger)', cursor: 'pointer' }}>
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="dashboard-main">
                {/* Desktop Top Bar */}
                <header className="desktop-header" style={{ height: 72, padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                    <NotificationBell />
                </header>

                {/* Mobile Header */}
                <header className="mobile-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src="/logo-transparent.png" alt="Logo" style={{ height: 28, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <NotificationBell />
                        <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                <div style={{ flex: 1, padding: '0.5rem 0' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
