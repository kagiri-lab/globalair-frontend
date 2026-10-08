'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import Tracker from '@/components/track/Tracker';
import { useAuth } from '@/lib/auth';

// Public tracking — anyone with a tracking number, no account needed
export default function TrackPage() {
    const { user, isStaff } = useAuth();

    return (
        <>
            <PageHero title="Track Shipment" image="/site/parallax/bg-parallax3.jpg" />
            <section className="site-section track-page">
                <div className="site-container">
                    {user && !isStaff && (
                        <div className="track-portal-note">
                            <span>You’re signed in — track your own shipments with full details and invoices in your portal.</span>
                            <Link href="/dashboard/track" className="btn btn-dark btn-sm"><LayoutDashboard size={14} /> Track in my portal</Link>
                        </div>
                    )}
                    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
                        <Tracker basePath="/track" />
                    </Suspense>
                </div>
            </section>
        </>
    );
}
