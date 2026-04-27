'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { logEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NavigationTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    useEffect(() => {
        const url = `${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        logEvent('view', 'page', pathname, { url, fullUrl: window.location.href });
    }, [pathname, searchParams, user?.id]);

    return null;
}
