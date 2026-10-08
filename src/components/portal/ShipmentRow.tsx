import Link from 'next/link';
import { ArrowRight, ChevronRight, Plane, Ship, Truck } from 'lucide-react';
import type { Shipment } from '@/lib/types';

// Journey order used for the progress bar
const JOURNEY = ['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];

export const ACTIVE_STATUSES = ['confirmed', 'picked_up', 'in_transit', 'out_for_delivery'];

export const statusLabel = (status: string) => status.replace(/_/g, ' ');

export function StatusBadge({ status }: { status: string }) {
    return <span className={`badge badge-${status}`}>{statusLabel(status)}</span>;
}

const MODE_ICON = { air: Plane, sea: Ship, road: Truck };

export function shipmentHref(s: Shipment) {
    return s.status === 'draft' ? `/shipments/new?draftId=${s.id}` : `/shipments/${s.id}`;
}

export function ListHead() {
    return (
        <div className="portal-list-head">
            <span>Shipment</span>
            <span>Route</span>
            <span className="portal-col-type">Service</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span />
        </div>
    );
}

export default function ShipmentRow({ shipment: s }: { shipment: Shipment }) {
    const ModeIcon = MODE_ICON[s.transport_mode as keyof typeof MODE_ICON] || Plane;
    const step = JOURNEY.indexOf(s.status);
    const showProgress = step >= 0;
    const progress = showProgress ? Math.round(((step + 1) / JOURNEY.length) * 100) : 0;

    return (
        <Link href={shipmentHref(s)} className="portal-row">
            <div className="portal-row-main">
                <span className="portal-mode" aria-hidden="true"><ModeIcon size={18} /></span>
                <span style={{ minWidth: 0 }}>
                    <span className="portal-row-tn">{s.tracking_number}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <StatusBadge status={s.status} />
                        {s.status === 'draft' && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)' }}>Finish booking</span>}
                    </span>
                </span>
            </div>

            <div style={{ minWidth: 0 }}>
                <div className="portal-route">
                    <span>{s.pickup_city}</span>
                    <ArrowRight size={13} />
                    <span>{s.destination_city}</span>
                </div>
                {showProgress && (
                    <div className={`portal-progress${s.status === 'delivered' ? ' done' : ''}`} title={`${statusLabel(s.status)} — ${progress}%`}>
                        <i style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            <div className="portal-col-type">
                <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{s.shipment_type}</span>
                <span className="portal-row-sub">
                    {s.status === 'delivered' && s.delivered_at
                        ? `Delivered ${new Date(s.delivered_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`
                        : s.estimated_delivery && s.status !== 'draft'
                            ? `ETA ${new Date(s.estimated_delivery).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`
                            : s.total_weight_kg ? `${Number(s.total_weight_kg).toFixed(1)} kg` : ''}
                </span>
            </div>

            <div className="portal-price">
                <strong>${Number(s.total_price || 0).toLocaleString()}</strong>
                <span>{new Date(s.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>

            <ChevronRight size={18} className="portal-row-arrow" />
        </Link>
    );
}
