import type { Metadata } from 'next';

// The tab shows the shipment's name once loaded (set by the ops shell); this is the title until then
export const metadata: Metadata = { title: 'Shipment' };

export default function ShipmentDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
