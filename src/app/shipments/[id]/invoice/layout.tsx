import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `Invoice - Shipment ${id}`,
    };
}

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
