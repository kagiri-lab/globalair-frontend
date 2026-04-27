import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `Shipment ${id}`,
    };
}

export default function ShipmentDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
