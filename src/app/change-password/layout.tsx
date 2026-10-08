import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Choose your password' };

export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
