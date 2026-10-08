import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'System Activity Logs',
};

export default function LogsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
