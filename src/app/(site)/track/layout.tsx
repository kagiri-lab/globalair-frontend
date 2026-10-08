import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Track Shipment',
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
