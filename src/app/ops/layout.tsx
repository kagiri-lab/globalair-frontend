import type { Metadata } from 'next';
import './ops.css';
import OpsShell from './OpsShell';
import { getSiteContact } from '@/lib/siteInfo';

export async function generateMetadata(): Promise<Metadata> {
    const { company } = await getSiteContact();
    return {
        title: { template: `%s | Ops — ${company}`, default: 'Operations Portal' },
        robots: { index: false, follow: false },
    };
}

// Operations portal (formerly the standalone admin app). proxy.ts and OpsShell restrict it to staff roles.
export default function OpsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="ops-root">
            <OpsShell>{children}</OpsShell>
        </div>
    );
}
