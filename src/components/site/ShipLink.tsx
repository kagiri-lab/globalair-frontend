'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

// Booking a shipment requires an account — signed-out visitors register first; staff book from the ops portal
export default function ShipLink({ children, ...props }: Omit<React.ComponentProps<typeof Link>, 'href'>) {
    const { user, isStaff } = useAuth();
    const href = !user ? '/register?next=/shipments/new' : isStaff ? '/ops/shipments/new' : '/shipments/new';
    return <Link href={href} {...props}>{children}</Link>;
}
