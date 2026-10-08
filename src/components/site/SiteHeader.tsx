'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown, Mail, MapPin, Menu, Phone, X, LogOut, Reply, FileText, Search, ArrowRight } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useAuth } from '@/lib/auth';
import AccountMenu, { useAccountLinks, useSiteSignOut, useStaffLinks } from './AccountMenu';
import { OPS_HOME, roleLabel } from '@/lib/roles';
import { COMPANY_LINKS, SERVICES } from '@/lib/siteContent';
import { useSiteContact, useBrandSrc } from '@/components/SiteInfoProvider';
import { telHref } from '@/lib/siteInfo';
import SocialLinks from './SocialLinks';

type NavItem = { label: string; href: string; children?: { href: string; label: string }[] };

const NAV: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Company', href: '/about', children: COMPANY_LINKS },
    {
        label: 'Services',
        href: '/services',
        children: [...SERVICES.map(s => ({ href: `/services/${s.slug}`, label: s.title })), { href: '/services', label: 'All services' }],
    },
    { label: 'Gallery', href: '/gallery' },
    {
        label: 'Ship Online',
        href: '/portal',
        children: [
            { href: '/portal', label: 'How it works' },
            { href: '/track', label: 'Track a shipment' },
            { href: '/shipments/new', label: 'Create a shipment' },
        ],
    },
    { label: 'Request a Quote', href: '/quote' },
    { label: 'Contact', href: '/contact' },
];

export default function SiteHeader() {
    const pathname = usePathname();
    const contact = useSiteContact();
    const logoSrc = useBrandSrc('logo');
    const logoDarkSrc = useBrandSrc('logo_dark');
    const { user, isLoading, isStaff } = useAuth();
    const accountLinks = useAccountLinks();
    const staffLinks = useStaffLinks();
    const siteSignOut = useSiteSignOut();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [suppressed, setSuppressed] = useState<string | null>(null);

    // Hover/focus would keep the dropdown open after client-side navigation — hide it until the pointer leaves
    const closeDropdown = (label: string) => {
        setSuppressed(label);
        (document.activeElement as HTMLElement | null)?.blur();
    };

    // Once the page scrolls past the header, the dark nav bar pins full-width to the top
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 170);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // While the phone menu is open: the page behind doesn't scroll, and Esc closes it
    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    }, [mobileOpen]);

    // Close the mobile menu after navigating
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setMobileOpen(false);
        setOpenGroup(null);
    }

    // Staff (any admin role) see an Operations menu instead of the customer shipping links;
    // signed-out visitors register before creating a shipment
    const nav: NavItem[] = isStaff
        ? [
            ...NAV.filter(item => !['Ship Online', 'Request a Quote', 'Contact'].includes(item.label)),
            { label: 'Operations', href: OPS_HOME, children: staffLinks.map(({ href, label }) => ({ href, label })) },
            { label: 'Contact', href: '/contact' },
        ]
        : NAV.map(item => ({
            ...item,
            children: item.children?.map(c => (c.href === '/shipments/new' ? { ...c, href: user ? '/shipments/new' : '/register?next=/shipments/new' } : c)),
        }));

    const isActive = (item: NavItem) =>
        item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href) || !!item.children?.some(c => pathname === c.href);

    // Reserve the space while the session is restored so Sign In/Register never flash for signed-in users
    const authActions = isLoading ? <span className="site-auth-placeholder hide-tablet" aria-hidden="true" /> : user ? (
        <AccountMenu className="hide-tablet" />
    ) : (
        <>
            <Link href="/login" className="site-nav-auth hide-tablet">Sign In</Link>
            <Link href="/register" className="btn btn-primary btn-sm hide-tablet">Register</Link>
        </>
    );


    return (
        <>
            <div className="site-topbar">
                <div className="site-container">
                    <div className="site-topbar-group">
                        <span className="hide-mobile-bar">Have any questions?</span>
                        <a className="site-topbar-item" href={`mailto:${contact.email}`}><i><Reply size={13} /></i> {contact.email}</a>
                        {contact.address && <span className="site-topbar-item hide-mobile-bar"><i><MapPin size={13} /></i> {contact.address}</span>}
                        {contact.phones.length > 0 && (
                            <a className="site-topbar-item hide-mobile-bar" href={telHref(contact.phones[0])}>
                                <i><Phone size={13} /></i> {contact.phones.join(' | ')}
                            </a>
                        )}
                    </div>
                    <div className="site-topbar-group">
                        <SocialLinks social={contact.social} size={16} />
                    </div>
                </div>
            </div>

            <header className="site-header">
                <div className="site-container site-header-inner">
                    <Link href="/" className="site-logo" aria-label={`${contact.company} home`}>
                        <img src={logoSrc} alt={contact.company} />
                    </Link>
                    <div className="site-header-widgets">
                        <a href={`mailto:${contact.support_email}`} className="site-header-widget">
                            <Mail size={28} />
                            <div><strong>{contact.support_email}</strong><span>Contact Us</span></div>
                        </a>
                        {contact.header.location_title && (
                            <div className="site-header-widget">
                                <MapPin size={28} />
                                <div><strong>{contact.header.location_title}</strong><span>{contact.header.location_subtitle}</span></div>
                            </div>
                        )}
                        {contact.header.phone && (
                            <a href={telHref(contact.header.phone)} className="site-header-widget">
                                <Phone size={28} />
                                <div><strong>{contact.header.phone}</strong><span>{contact.header.phone_label}</span></div>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <div className={`site-navbar-slot${scrolled ? ' stuck' : ''}`}>
                <div className="site-navbar-wrap">
                    <div className="site-container">
                        <div className="site-navbar">
                            <nav className="site-nav" aria-label="Main">
                                {nav.map(item => (
                                    <div
                                        key={item.label}
                                        className={`site-nav-item${suppressed === item.label ? ' suppressed' : ''}`}
                                        onMouseLeave={() => suppressed === item.label && setSuppressed(null)}
                                    >
                                        <Link href={item.href} className={`site-nav-link${isActive(item) ? ' active' : ''}`}>
                                            {item.label}
                                            {item.children && <ChevronDown size={14} />}
                                        </Link>
                                        {item.children && (
                                            <div className="site-dropdown">
                                                {item.children.map(c => (
                                                    <Link key={c.href + c.label} href={c.href} className={pathname === c.href ? 'active' : ''} onClick={() => closeDropdown(item.label)}>
                                                        {c.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </nav>

                            <Link href="/" className="site-navbar-logo" aria-label={`${contact.company} home`}>
                                <img src={logoDarkSrc} alt={contact.company} />
                            </Link>

                            <div className="site-actions">
                                {authActions}
                                {contact.phones[0] && (
                                    <a href={telHref(contact.phones[0])} className="site-call-btn" aria-label={`Call ${contact.phones[0]}`}><Phone size={18} /></a>
                                )}
                                <button
                                    className="site-menu-toggle"
                                    onClick={() => setMobileOpen(o => !o)}
                                    aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                                    aria-expanded={mobileOpen}
                                >
                                    <Menu size={22} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Phone & tablet menu: slides in from the right */}
            <div className={`site-drawer-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside className={`site-drawer${mobileOpen ? ' open' : ''}`} aria-label="Menu" aria-hidden={!mobileOpen} inert={!mobileOpen}>
                <div className="site-drawer-head">
                    <Link href="/" className="site-drawer-logo" onClick={() => setMobileOpen(false)} aria-label={`${contact.company} home`}>
                        <img src={logoSrc} alt={contact.company} />
                    </Link>
                    <button type="button" className="site-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={22} /></button>
                </div>

                <div className="site-drawer-body">
                    {!isStaff && (
                        <div className="site-drawer-quick">
                            <Link href="/quote" onClick={() => setMobileOpen(false)}><FileText size={20} /> Get a quote</Link>
                            <Link href="/track" onClick={() => setMobileOpen(false)}><Search size={20} /> Track</Link>
                        </div>
                    )}

                    <nav className="site-drawer-nav" aria-label="Main">
                        {nav.map(item =>
                            item.children ? (
                                <div key={item.label} className={`site-drawer-group${openGroup === item.label ? ' open' : ''}`}>
                                    <button type="button" className={isActive(item) ? 'active' : ''}
                                        onClick={() => setOpenGroup(g => (g === item.label ? null : item.label))} aria-expanded={openGroup === item.label}>
                                        {item.label}
                                        <ChevronDown size={18} />
                                    </button>
                                    <div className="site-drawer-sub">
                                        {item.children.map(c => (
                                            <Link key={c.href + c.label} href={c.href} className={pathname === c.href ? 'active' : ''} onClick={() => setMobileOpen(false)}>{c.label}</Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Link key={item.label} href={item.href} className={isActive(item) ? 'active' : ''} onClick={() => setMobileOpen(false)}>{item.label}</Link>
                            )
                        )}
                    </nav>

                    {!isLoading && user && (
                        <div className="site-drawer-account">
                            <p className="site-mobile-account-head">
                                <span className={`site-account-avatar${isStaff ? ' staff' : ''}`}>{user.name.charAt(0).toUpperCase()}</span>
                                <span><strong>{user.name}</strong><small>{isStaff ? `Staff · ${roleLabel(user.role)}` : user.email}</small></span>
                            </p>
                            <div className="site-drawer-account-links">
                                {accountLinks.map(l => (
                                    <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>{l.icon}{l.label}</Link>
                                ))}
                                <button type="button" onClick={() => { setMobileOpen(false); siteSignOut(); }}><LogOut size={16} /> Sign out</button>
                            </div>
                        </div>
                    )}
                    {!isLoading && !user && (
                        <div className="site-drawer-auth">
                            <Link href="/login" className="btn btn-outline-light" onClick={() => setMobileOpen(false)}>Sign in</Link>
                            <Link href="/register" className="btn btn-primary" onClick={() => setMobileOpen(false)}>Register</Link>
                        </div>
                    )}

                    <div className="site-drawer-contact">
                        <p>Talk to us</p>
                        <div className="site-drawer-reach">
                            {contact.phones[0] && <a href={telHref(contact.phones[0])}><Phone size={18} /> Call</a>}
                            {contact.whatsapp && <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="wa"><WhatsAppIcon size={18} /> WhatsApp</a>}
                            <a href={`mailto:${contact.email}`}><Mail size={18} /> Email</a>
                        </div>
                        {contact.address && <span className="site-drawer-address"><MapPin size={15} /> {contact.address}</span>}
                        <div className="site-drawer-social"><SocialLinks social={contact.social} size={18} /></div>
                    </div>
                </div>

                {!isStaff && (
                    <Link href={user ? '/shipments/new' : '/register?next=/shipments/new'} className="site-drawer-cta" onClick={() => setMobileOpen(false)}>
                        Create a shipment <ArrowRight size={18} />
                    </Link>
                )}
            </aside>
        </>
    );
}
