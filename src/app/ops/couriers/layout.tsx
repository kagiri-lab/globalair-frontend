import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Couriers',
};

export default function CouriersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
