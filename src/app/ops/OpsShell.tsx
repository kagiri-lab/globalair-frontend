'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useBrandSrc, useSiteContact } from '@/components/SiteInfoProvider';
import { useAuth } from '@/lib/auth';
import { CUSTOMER_HOME, loginUrl, roleLabel } from '@/lib/roles';
import {
    LayoutDashboard, Users, User, Tag, LogOut, Package, Settings, Menu, MessageSquare, DollarSign, Globe, Search, Truck, ChevronRight, ChevronDown, Home, BarChart3, Lock,
    PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ComposeProvider } from '@/components/ops/Compose';
import '@/components/portal/portal.css';
import './ops-shell.css';

// perm: one permission, or a list where any one is enough
type Perm = string | string[];
type NavItem = { name: string; path: string; icon: typeof Package; perm: Perm };

const COLLAPSED_KEY = 'ops_sidebar_collapsed';

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    {
        title: 'Overview',
        items: [
            { name: 'Dashboard', path: '/ops', icon: LayoutDashboard, perm: 'view_dashboard' },
            { name: 'Shipments', path: '/ops/shipments', icon: Package, perm: 'view_shipments' },
            { name: 'Customers', path: '/ops/customers', icon: Users, perm: 'view_customers' },
            { name: 'Billing', path: '/ops/billing', icon: Wallet, perm: 'manage_billing' },
            { name: 'Financial Reports', path: '/ops/reports', icon: BarChart3, perm: 'view_settings' },
        ],
    },
    {
        title: 'Customer care',
        items: [
            { name: 'Inbox', path: '/ops/support', icon: MessageSquare, perm: 'manage_support' },
        ],
    },
    {
        title: 'Logistics & pricing',
        items: [
            { name: 'Categories', path: '/ops/categories', icon: Tag, perm: 'view_categories' },
            { name: 'Pricing', path: '/ops/pricing', icon: DollarSign, perm: 'manage_zones' },
            { name: 'Couriers', path: '/ops/couriers', icon: Truck, perm: 'manage_zones' },
        ],
    },
    {
        title: 'System',
        items: [
            { name: 'Settings', path: '/ops/settings', icon: Settings, perm: ['view_settings', 'manage_admins', 'view_logs'] },
        ],
    },
];

// Permission needed to open each area (longest prefix wins). Pages without an entry are open to all staff.
const AREA_PERMS: [string, Perm][] = [
    ['/ops/shipments/new', 'update_shipments'],
    ['/ops/shipments', 'view_shipments'],
    ['/ops/customers', 'view_customers'],
    ['/ops/support', 'manage_support'],
    ['/ops/enquiries', 'manage_support'],
    ['/ops/categories', 'view_categories'],
    ['/ops/pricing', 'manage_zones'],
    ['/ops/locations-pricing', 'manage_zones'],
    ['/ops/couriers', 'manage_zones'],
    ['/ops/staff', 'manage_admins'],
    ['/ops/logs', 'view_logs'],
    ['/ops/reports', 'view_settings'],
    ['/ops/billing', 'manage_billing'],
    ['/ops/settings', ['view_settings', 'manage_admins', 'view_logs']],
];

const requiredPerm = (pathname: string) =>
    AREA_PERMS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1]
    ?? (pathname === '/ops' ? 'view_dashboard' : undefined);

// Breadcrumb segments that have a page of their own (others, like /ops/settings/admins, are shown as plain text)
const LINKABLE = new Set(['/ops/shipments', '/ops/customers', '/ops/support', '/ops/categories',
    '/ops/locations-pricing', '/ops/pricing', '/ops/couriers', '/ops/staff', '/ops/logs', '/ops/settings', '/ops/profile', '/ops/reports', '/ops/billing']);

// Friendly names for breadcrumbs
const SEGMENT_TITLES: Record<string, string> = {
    shipments: 'Shipments', customers: 'Customers', support: 'Inbox', enquiries: 'Website Enquiries',
    categories: 'Categories', 'locations-pricing': 'Locations & routes', pricing: 'Pricing', staff: 'Staff & access', logs: 'Activity logs',
    settings: 'Settings', profile: 'My Profile', reports: 'Financial Reports', billing: 'Billing', couriers: 'Couriers', admins: 'Admins', new: 'New',
};

export default function OpsShell({ children }: { children: React.ReactNode }) {
    const logoSrc = useBrandSrc('logo');
    const iconSrc = useBrandSrc('favicon');
    const { company } = useSiteContact();
    const { user, isLoading, isStaff, logout, hasPermission } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    // Icons-only sidebar, remembered on this browser (the shell renders a spinner first, so no hydration mismatch)
    const [collapsed, setCollapsed] = useState(() => {
        try { return typeof window !== 'undefined' && localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
    });
    const [fullscreen, setFullscreen] = useState(false);

    const toggleCollapsed = () => {
        setCollapsed(c => {
            try { localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1'); } catch { /* storage blocked */ }
            return !c;
        });
    };

    // Full screen: the system fills the whole screen (browser bars hidden); Esc also leaves it
    useEffect(() => {
        const onChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);
    const toggleFullscreen = () => {
        const run = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        run?.catch(() => toast.error('Full screen isn’t available in this browser'));
    };

    // Close menus after navigating
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
        setDynamicTitle(null);
    }

    // Staff only: signed-out users sign in first, customers go to their own dashboard
    useEffect(() => {
        if (isLoading) return;
        if (!user) router.replace(loginUrl(pathname + window.location.search));
        else if (!isStaff) router.replace(CUSTOMER_HOME);
    }, [user, isLoading, isStaff, pathname, router]);

    // Detail pages can set a nicer header title (e.g. a tracking number) via a 'set-header-title' event
    useEffect(() => {
        const handle = (e: Event) => setDynamicTitle((e as CustomEvent<string>).detail);
        window.addEventListener('set-header-title', handle);
        return () => window.removeEventListener('set-header-title', handle);
    }, []);

    // The browser tab follows the page's own title (e.g. the customer's name), not an ID
    useEffect(() => {
        if (!dynamicTitle) return;
        const t = `${dynamicTitle} | Ops — ${company}`;   // same ending as the other ops pages
        document.title = t;
        // Next.js may set the route's title again after this; put ours back
        const id = setTimeout(() => { if (document.title !== t) document.title = t; }, 300);
        return () => clearTimeout(id);
    }, [dynamicTitle, company, pathname]);

    // Keep the current page visible in the sidebar on short screens
    useEffect(() => {
        document.querySelector('.ops-side-link.active')?.scrollIntoView({ block: 'nearest' });
    }, [pathname, user]);

    useEffect(() => {
        if (!isProfileOpen) return;
        const onClick = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [isProfileOpen]);

    if (isLoading || !user || !isStaff) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
    }

    const isActive = (path: string) =>
        path === '/ops' ? pathname === '/ops' : pathname === path || pathname.startsWith(`${path}/`);

    const can = (perm: Perm) => (Array.isArray(perm) ? perm.some(p => hasPermission(p)) : hasPermission(perm));

    const groups = NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(i => can(i.perm)) }))
        .filter(g => g.items.length > 0);

    // Breadcrumbs: Operations › Shipments › SHP-…
    const segments = pathname.split('/').filter(Boolean).slice(1);
    const crumbs = segments.map((seg, i) => ({
        href: `/ops/${segments.slice(0, i + 1).join('/')}`,
        label: SEGMENT_TITLES[seg] || (i === segments.length - 1 && dynamicTitle) || 'Details',
    }));
    const title = dynamicTitle || crumbs[crumbs.length - 1]?.label || 'Dashboard';
    const initial = user.name.charAt(0).toUpperCase();
    const needed = requiredPerm(pathname);
    const allowed = !needed || can(needed);
    const canSearch = hasPermission('view_shipments');

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = search.trim();
        router.push(q ? `/ops/shipments?q=${encodeURIComponent(q)}` : '/ops/shipments');
    };

    const handleLogout = () => {
        toast.success('Logged out');
        logout();
    };

    return (
        <div className={`portal ops-shell${collapsed ? ' ops-collapsed' : ''}`}>
            <div className={`portal-overlay${isMobileMenuOpen ? ' open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

            {/* Sidebar (drawer on phones) */}
            <aside className={`portal-sidebar${isMobileMenuOpen ? ' open' : ''}`} aria-label="Operations navigation">
                <div className="ops-side-head">
                    <Link href="/ops" className="ops-side-brand" aria-label="Operations dashboard">
                        <img src={logoSrc} alt={company} className="ops-side-logo" />
                        <img src={iconSrc} alt={company} className="ops-side-mark" />
                    </Link>
                    <span className="ops-side-env"><i aria-hidden="true" /> Operations portal</span>
                </div>

                <nav className="ops-side-nav">
                    {groups.map(group => (
                        <div key={group.title} className="ops-side-group">
                            <p>{group.title}</p>
                            {group.items.map(({ path, icon: Icon, name }) => {
                                const active = isActive(path);
                                return (
                                    <Link key={path} href={path} className={`ops-side-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} title={collapsed ? name : undefined}>
                                        <span className="ops-side-icon"><Icon size={17} /></span>
                                        <span className="ops-side-label">{name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="ops-side-foot">
                    <Link href="/ops/profile" className={`ops-side-user${isActive('/ops/profile') ? ' active' : ''}`} title="View and edit your profile">
                        <span className="portal-avatar ops-avatar">{initial}</span>
                        <span className="ops-side-user-text">
                            <strong>{user.name}</strong>
                            <span>{roleLabel(user.role)}</span>
                        </span>
                    </Link>
                    <button type="button" onClick={handleLogout} className="ops-side-signout" aria-label="Sign out" title="Sign out">
                        <LogOut size={17} />
                    </button>
                </div>
            </aside>

            <main className="portal-main">
                {/* Desktop top bar */}
                <header className="portal-topbar">
                    <button type="button" className="ops-topbar-btn" onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'} title={collapsed ? 'Expand the menu' : 'Collapse the menu'}>
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                    <nav className="portal-crumbs" aria-label="Breadcrumb">
                        <Link href="/ops">Operations</Link>
                        {crumbs.map((c, i) => (
                            <span key={c.href} style={{ display: 'contents' }}>
                                <ChevronRight size={14} />
                                {i === crumbs.length - 1 ? <strong>{title}</strong> : LINKABLE.has(c.href) ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
                            </span>
                        ))}
                        {crumbs.length === 0 && <><ChevronRight size={14} /><strong>Dashboard</strong></>}
                    </nav>

                    {canSearch && (
                        <form className="portal-track" onSubmit={onSearch} role="search">
                            <Search size={16} />
                            <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find shipment, customer…" aria-label="Search shipments" />
                        </form>
                    )}

                    <button type="button" className="ops-topbar-btn" onClick={toggleFullscreen}
                        aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}>
                        {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                    </button>

                    <div className="ops-profile" ref={profileRef}>
                        <button type="button" className="ops-profile-trigger" onClick={() => setIsProfileOpen(o => !o)} aria-expanded={isProfileOpen} aria-haspopup="true">
                            <span className="portal-avatar ops-avatar">{initial}</span>
                            <span className="ops-profile-text">
                                <strong>{user.name.split(' ')[0]}</strong>
                                <span>{roleLabel(user.role)}</span>
                            </span>
                            <ChevronDown size={15} />
                        </button>
                        {isProfileOpen && (
                            <div className="ops-profile-menu fade-in">
                                <div className="ops-profile-head">
                                    <strong>{user.name}</strong>
                                    <span>{user.email}</span>
                                    <em>{roleLabel(user.role)}</em>
                                </div>
                                <Link href="/ops/profile"><User size={16} /> My profile</Link>
                                <Link href="/"><Globe size={16} /> View website</Link>
                                <button type="button" onClick={handleLogout}><LogOut size={16} /> Sign out</button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Phone header */}
                <header className="portal-mobile-header">
                    <Link href="/ops" className="portal-brand">
                        <img src={logoSrc} alt={company} />
                    </Link>
                    <span className="portal-mobile-title">{title}</span>
                    <div className="portal-mobile-actions">
                        <Link href="/ops/profile" className="portal-avatar ops-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem', textDecoration: 'none' }} aria-label="My profile">
                            {initial}
                        </Link>
                    </div>
                </header>

                <div className="portal-content ops-content">
                    <ComposeProvider>
                        {allowed ? children : <NoAccess links={groups.flatMap(g => g.items)} />}
                    </ComposeProvider>
                </div>
            </main>

            {/* Phone bottom tab bar */}
            <nav className="portal-tabbar" aria-label="Quick navigation">
                <Link href="/ops" className={isActive('/ops') ? 'active' : ''}><Home size={20} /><span>Home</span></Link>
                {hasPermission('view_shipments')
                    ? <Link href="/ops/shipments" className={isActive('/ops/shipments') && pathname !== '/ops/shipments/new' ? 'active' : ''}><Package size={20} /><span>Shipments</span></Link>
                    : <span />}
                {hasPermission('view_customers')
                    ? <Link href="/ops/customers" className={isActive('/ops/customers') ? 'active' : ''}><Users size={20} /><span>Customers</span></Link>
                    : <span />}
                {hasPermission('manage_support')
                    ? <Link href="/ops/support" className={isActive('/ops/support') ? 'active' : ''}><MessageSquare size={20} /><span>Support</span></Link>
                    : <span />}
                <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu"><Menu size={20} /><span>Menu</span></button>
            </nav>
        </div>
    );
}

// Shown instead of a page the signed-in staff member isn't permitted to open
function NoAccess({ links }: { links: NavItem[] }) {
    return (
        <div className="ops-noaccess">
            <span className="ops-noaccess-icon"><Lock size={26} /></span>
            <h1>You don’t have access to this page</h1>
            <p>Your role doesn’t include permission for this area. Ask a super admin if you need it. Here’s what you can open:</p>
            <div className="ops-noaccess-links">
                {links.map(({ path, name, icon: Icon }) => (
                    <Link key={path} href={path}><Icon size={17} /> {name}</Link>
                ))}
                <Link href="/ops/profile"><User size={17} /> My Profile</Link>
            </div>
        </div>
    );
}
