import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'New Shipment',
};

export default function NewShipmentLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
