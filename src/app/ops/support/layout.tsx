import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Support & Enquiries',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
