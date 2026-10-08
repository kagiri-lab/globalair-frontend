'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
    ChevronDown, LayoutDashboard, LogOut, MapPin, MessageSquare, Package, Plus, User as UserIcon, Users,
    Settings, ShieldCheck, Search,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/roles';

export type AccountLink = { href: string; label: string; icon: React.ReactNode };

// Operations-portal shortcuts for staff, limited to what their role/permissions allow
export function useStaffLinks(): AccountLink[] {
    const { isStaff, hasPermission } = useAuth();
    if (!isStaff) return [];
    const links: (AccountLink & { perm?: string })[] = [
        { href: '/ops', label: 'Ops Dashboard', icon: <LayoutDashboard size={16} />, perm: 'view_dashboard' },
        { href: '/ops/shipments', label: 'Shipments', icon: <Package size={16} />, perm: 'view_shipments' },
        { href: '/ops/shipments/new', label: 'Book a shipment', icon: <Plus size={16} />, perm: 'update_shipments' },
        { href: '/ops/customers', label: 'Customers', icon: <Users size={16} />, perm: 'view_customers' },
        { href: '/ops/support', label: 'Support & enquiries', icon: <MessageSquare size={16} />, perm: 'manage_support' },
        { href: '/ops/settings?tab=staff', label: 'Staff & access', icon: <ShieldCheck size={16} />, perm: 'manage_admins' },
        { href: '/ops/settings', label: 'Settings', icon: <Settings size={16} />, perm: 'view_settings' },
    ];
    const allowed = links.filter(l => !l.perm || hasPermission(l.perm));
    // Everyone on staff can at least open the portal
    if (!allowed.some(l => l.href === '/ops')) allowed.unshift({ href: '/ops', label: 'Ops Portal', icon: <LayoutDashboard size={16} /> });
    return allowed;
}

// Links for the signed-in user's account menu, depending on which portal they belong to
export function useAccountLinks(): AccountLink[] {
    const { user, isStaff } = useAuth();
    const staffLinks = useStaffLinks();
    if (!user) return [];
    if (isStaff) {
        return [...staffLinks.slice(0, 5), { href: '/ops/profile', label: 'My Profile', icon: <UserIcon size={16} /> }];
    }
    return [
        { href: '/dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={16} /> },
        { href: '/shipments', label: 'My Shipments', icon: <Package size={16} /> },
        { href: '/shipments/new', label: 'New Shipment', icon: <Plus size={16} /> },
        { href: '/dashboard/track', label: 'Track a Shipment', icon: <Search size={16} /> },
        { href: '/dashboard/addresses', label: 'Address Book', icon: <MapPin size={16} /> },
        { href: '/dashboard/profile', label: 'My Profile', icon: <UserIcon size={16} /> },
    ];
}

// Signing out from the public website keeps the visitor on the page they're reading
export function useSiteSignOut() {
    const { logout } = useAuth();
    return () => {
        logout({ redirect: false });
        toast.success('Signed out');
    };
}

export default function AccountMenu({ className = '' }: { className?: string }) {
    const { user, isStaff } = useAuth();
    const links = useAccountLinks();
    const signOut = useSiteSignOut();
    const [suppressed, setSuppressed] = useState(false);

    if (!user) return null;

    // Hover/focus would keep the menu open after client-side navigation — hide it until the pointer leaves
    const close = () => {
        setSuppressed(true);
        (document.activeElement as HTMLElement | null)?.blur();
    };

    return (
        <div className={`site-nav-item site-account ${className}${suppressed ? ' suppressed' : ''}`} onMouseLeave={() => setSuppressed(false)}>
            <button type="button" className="site-account-trigger" aria-haspopup="true">
                <span className={`site-account-avatar${isStaff ? ' staff' : ''}`}>{user.name.charAt(0).toUpperCase()}</span>
                <span className="site-account-name">
                    {user.name.split(' ')[0]}
                    {isStaff && <small>{roleLabel(user.role)}</small>}
                </span>
                <ChevronDown size={14} />
            </button>
            <div className="site-dropdown site-account-dropdown">
                <div className="site-account-head">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <em className={isStaff ? 'staff' : ''}>{isStaff ? `Staff · ${roleLabel(user.role)}` : 'Customer'}</em>
                </div>
                {links.map(l => (
                    <Link key={l.href} href={l.href} onClick={close}>{l.icon} {l.label}</Link>
                ))}
                <button type="button" className="site-account-signout" onClick={() => { close(); signOut(); }}>
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </div>
    );
}
