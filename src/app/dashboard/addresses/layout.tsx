import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Address Book',
};

export default function AddressesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
