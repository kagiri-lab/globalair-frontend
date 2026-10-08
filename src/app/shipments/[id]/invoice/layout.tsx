import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Invoice',
    };
}

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
