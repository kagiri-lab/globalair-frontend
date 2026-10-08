'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useBrandSrc, useSiteContact } from '@/components/SiteInfoProvider';
import { useAuth } from '@/lib/auth';
import { OPS_HOME, loginUrl } from '@/lib/roles';
import {
    LayoutDashboard, Package, LogOut, Plus, MapPin, Menu, LifeBuoy, Search, Globe, ChevronRight, Home, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';
import '@/components/portal/portal.css';

// Tracking lives in the top bar search (and the phone tab bar), so it isn't repeated here
const NAV = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/shipments', icon: Package, label: 'My shipments' },
    { href: '/dashboard/addresses', icon: MapPin, label: 'Address book' },
    { href: '/dashboard/billing', icon: Receipt, label: 'Billing' },
    { href: '/dashboard/support', icon: LifeBuoy, label: 'Support' },
];

// Breadcrumb title for the current page
function pageTitle(pathname: string) {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/shipments') return 'My Shipments';
    if (pathname === '/shipments/new') return 'New Shipment';
    if (pathname.endsWith('/invoice')) return 'Invoice';
    if (pathname.startsWith('/shipments/')) return 'Shipment Details';
    if (pathname === '/dashboard/addresses') return 'Address Book';
    if (pathname === '/dashboard/support') return 'Support';
    if (pathname.startsWith('/dashboard/support/')) return 'Support Ticket';
    if (pathname === '/dashboard/profile') return 'My Profile';
    if (pathname === '/dashboard/billing') return 'Billing';
    if (pathname === '/dashboard/track') return 'Track a Shipment';
    return 'Dashboard';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const logoSrc = useBrandSrc('logo');
    const { company } = useSiteContact();
    const { user, isLoading, isStaff, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [trackQuery, setTrackQuery] = useState('');

    // Close the drawer after navigating
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setIsMobileMenuOpen(false);
    }

    // Signed-out users sign in first; staff belong in the operations portal
    useEffect(() => {
        if (isLoading) return;
        if (!user) router.replace(loginUrl(pathname + window.location.search));
        else if (isStaff) router.replace(OPS_HOME);
    }, [user, isLoading, isStaff, pathname, router]);

    const handleLogout = () => {
        toast.success('Logged out successfully');
        logout();
    };

    const onTrack = (e: React.FormEvent) => {
        e.preventDefault();
        const q = trackQuery.trim().toUpperCase();
        if (q) router.push(`/dashboard/track?q=${encodeURIComponent(q)}`);
    };

    if (isLoading || !user || isStaff) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
            </div>
        );
    }

    const isActive = (href: string) =>
        href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(`${href}/`);
    const title = pageTitle(pathname);
    const initial = user.name.charAt(0).toUpperCase();

    return (
        <div className="portal">
            <div className={`portal-overlay${isMobileMenuOpen ? ' open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

            {/* Sidebar (drawer on phones) */}
            <aside className={`portal-sidebar cp-side${isMobileMenuOpen ? ' open' : ''}`} aria-label="Portal navigation">
                <Link href="/dashboard" className="cp-side-brand" aria-label={`${company} customer portal`}>
                    <img src={logoSrc} alt={company} />
                </Link>

                <Link href="/shipments/new" className="cp-side-new">
                    <Plus size={17} /> New shipment
                </Link>

                <nav className="cp-side-nav">
                    {NAV.map(({ href, icon: Icon, label }) => {
                        const active = isActive(href);
                        return (
                            <Link key={href} href={href} className={`cp-side-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                                <Icon size={18} /> {label}
                            </Link>
                        );
                    })}
                    {/* Phones have no top bar, so the website link lives here */}
                    <Link href="/" className="cp-side-link cp-side-phone"><Globe size={18} /> Website</Link>
                </nav>

                {/* Account: profile behind the name, sign out beside it */}
                <div className="cp-side-foot">
                    <Link href="/dashboard/profile" className={`cp-side-user${isActive('/dashboard/profile') ? ' active' : ''}`} title="Your profile and security">
                        <span className="portal-avatar">{initial}</span>
                        <span className="cp-side-user-text">
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                        </span>
                    </Link>
                    <button type="button" onClick={handleLogout} className="cp-side-signout" aria-label="Sign out" title="Sign out">
                        <LogOut size={17} />
                    </button>
                </div>
            </aside>

            <main className="portal-main">
                {/* Desktop top bar */}
                <header className="portal-topbar">
                    <nav className="portal-crumbs" aria-label="Breadcrumb">
                        <Link href="/dashboard">Customer Portal</Link>
                        <ChevronRight size={14} />
                        <strong>{title}</strong>
                    </nav>
                    <form className="portal-track" onSubmit={onTrack} role="search">
                        <Search size={16} />
                        <input
                            className="input"
                            value={trackQuery}
                            onChange={e => setTrackQuery(e.target.value)}
                            placeholder="Track a shipment…"
                            aria-label="Tracking number"
                        />
                    </form>
                    <Link href="/" className="cp-topbar-icon" title="Go to the website" aria-label="Go to the website"><Globe size={18} /></Link>
                    <NotificationBell />
                    <Link href="/dashboard/profile" className="portal-avatar" title={user.name} style={{ textDecoration: 'none' }}>{initial}</Link>
                </header>

                {/* Phone header */}
                <header className="portal-mobile-header">
                    <Link href="/dashboard" className="portal-brand">
                        <img src={logoSrc} alt={company} />
                    </Link>
                    <span className="portal-mobile-title">{title}</span>
                    <div className="portal-mobile-actions">
                        <NotificationBell />
                        <Link href="/dashboard/profile" className="portal-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem', textDecoration: 'none' }} aria-label="My profile">
                            {initial}
                        </Link>
                    </div>
                </header>

                <div className="portal-content">{children}</div>
            </main>

            {/* Phone bottom tab bar */}
            <nav className="portal-tabbar" aria-label="Quick navigation">
                <Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''}><Home size={20} /><span>Home</span></Link>
                <Link href="/shipments" className={pathname === '/shipments' || (pathname.startsWith('/shipments/') && pathname !== '/shipments/new') ? 'active' : ''}><Package size={20} /><span>Shipments</span></Link>
                <Link href="/shipments/new" className={`portal-tab-new${pathname === '/shipments/new' ? ' active' : ''}`}><span><Plus size={22} /></span><span>New</span></Link>
                <Link href="/dashboard/track" className={pathname === '/dashboard/track' ? 'active' : ''}><Search size={20} /><span>Track</span></Link>
                <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu"><Menu size={20} /><span>Menu</span></button>
            </nav>
        </div>
    );
}
