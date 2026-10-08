'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useStaffLinks } from './AccountMenu';

// Footer "account" column: adapts to visitors, customers and staff
export default function FooterAccountLinks() {
    const { user, isStaff, isLoading } = useAuth();
    const staffLinks = useStaffLinks();

    const links = isStaff
        ? staffLinks.slice(0, 4)
        : user
            ? [
                { href: '/dashboard', label: 'My dashboard' },
                { href: '/shipments', label: 'My shipments' },
                { href: '/shipments/new', label: 'New shipment' },
                { href: '/dashboard/track', label: 'Track a shipment' },
            ]
            : [
                { href: '/portal', label: 'Shipping portal' },
                { href: '/track', label: 'Track a shipment' },
                { href: '/login', label: 'Sign in' },
                { href: '/register', label: 'Create an account' },
            ];

    return (
        <>
            <h4>{isStaff ? 'Operations' : 'Ship online'}</h4>
            <ul style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
                {links.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
        </>
    );
}
