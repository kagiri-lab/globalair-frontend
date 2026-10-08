import type { Metadata } from 'next';

// The tab shows the customer's name once loaded (set by the ops shell); this is the title until then
export const metadata: Metadata = { title: 'Customer' };

export default function UserDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
