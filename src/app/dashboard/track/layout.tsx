import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Track a Shipment',
};

export default function PortalTrackLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
