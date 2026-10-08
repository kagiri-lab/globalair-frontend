'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import '@/app/(site)/site.css';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Shipment } from '@/lib/types';
import Tracker from '@/components/track/Tracker';
import { ACTIVE_STATUSES, statusLabel } from '@/components/portal/ShipmentRow';

// Signed-in tracking: same tracker, plus shortcuts to the customer's own active shipments
export default function PortalTrackPage() {
    const { user } = useAuth();
    const [mine, setMine] = useState<Shipment[]>([]);

    useEffect(() => {
        if (!user) return;
        api.get('/shipments?limit=100').then(res => setMine(res.data.data.shipments)).catch(() => { });
    }, [user]);

    const active = mine.filter(s => ACTIVE_STATUSES.includes(s.status) || s.status === 'pending');

    return (
        <div className="portal-page">
            <div className="portal-page-head">
                <div>
                    <h1>Track a Shipment</h1>
                    <p>Track any tracking number. Shipments booked on your account include full details and invoices.</p>
                </div>
            </div>

            {active.length > 0 && (
                <div className="portal-track-mine">
                    <p>Your active shipments</p>
                    <div className="portal-tabs" style={{ marginBottom: 0 }}>
                        {active.slice(0, 12).map(s => (
                            <Link key={s.id} href={`/dashboard/track?q=${encodeURIComponent(s.tracking_number)}`} className="portal-track-chip">
                                <strong>{s.tracking_number}</strong>
                                <span>{s.pickup_city} <ArrowRight size={11} /> {s.destination_city} · {statusLabel(s.status)}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
                <Tracker basePath="/dashboard/track" ownShipments={mine} />
            </Suspense>
        </div>
    );
}
