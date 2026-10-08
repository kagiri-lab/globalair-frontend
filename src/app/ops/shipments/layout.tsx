import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'All Shipments',
};

export default function ShipmentsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
